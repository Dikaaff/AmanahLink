<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ReceiptStatus;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\Campaign;
use App\Models\Receipt;
use App\Models\Transaction;
use Carbon\CarbonInterface;

/**
 * A campaign's spending is held when the proof behind an earlier payment is
 * missing. Two triggers: a rejected receipt (suspected fraud) and a receipt
 * that was never uploaded past the deadline. The hold is per campaign, never
 * per account, so other campaigns keep spending and donations keep flowing.
 */
final class SpendingHoldService
{
    public const RECEIPT_DUE_DAYS = 7;

    /**
     * @return array{code: string, message: string, reference_id: string, due_at: string|null}|null
     */
    public function reasonFor(Campaign $campaign): ?array
    {
        $disputed = Transaction::query()
            ->where('campaign_id', $campaign->getKey())
            ->where('type', TransactionType::Disbursement->value)
            ->where('status', TransactionStatus::Disputed->value)
            ->latest('id')
            ->first();

        if ($disputed !== null) {
            $reference = $disputed->reference_id ?? '#'.$disputed->getKey();

            $reason = Receipt::query()
                ->where('transaction_id', $disputed->getKey())
                ->where('status', ReceiptStatus::Rejected->value)
                ->latest('id')
                ->value('rejection_reason');

            return [
                'code' => 'receipt_rejected',
                'message' => 'Belanja ditahan karena nota pembayaran '
                    .$reference
                    .' ditolak'
                    .($reason === null ? '.' : ': '.$reason)
                    .' Unggah nota pengganti atau hubungi admin.',
                'reference_id' => $reference,
                'due_at' => null,
            ];
        }

        $overdue = Transaction::query()
            ->where('campaign_id', $campaign->getKey())
            ->where('type', TransactionType::Disbursement->value)
            ->whereIn('status', [
                TransactionStatus::Settled->value,
                TransactionStatus::ReceiptPending->value,
            ])
            ->whereNotNull('settled_at')
            ->where('settled_at', '<=', now()->subDays(self::RECEIPT_DUE_DAYS))
            ->latest('settled_at')
            ->first();

        if ($overdue === null) {
            return null;
        }

        $reference = $overdue->reference_id ?? '#'.$overdue->getKey();

        return [
            'code' => 'receipt_overdue',
            'message' => 'Belanja ditahan karena nota pembayaran '
                .$reference
                .' belum diunggah lebih dari '.self::RECEIPT_DUE_DAYS.' hari.',
            'reference_id' => $reference,
            'due_at' => $this->dueAt($overdue)?->toIso8601String(),
        ];
    }

    public function dueAt(Transaction $transaction): ?CarbonInterface
    {
        return $transaction->settled_at?->copy()->addDays(self::RECEIPT_DUE_DAYS);
    }
}
