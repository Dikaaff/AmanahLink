<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\Transaction;
use App\Notifications\ReceiptDueSoon;
use App\Services\SpendingHoldService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * H-3 and H-1 reminders for merchant payments whose receipt is still missing.
 * Past the deadline the spending hold does the enforcing; this command exists
 * so the campaigner is warned before that happens.
 */
final class SendReceiptReminders extends Command
{
    protected $signature = 'amanahlink:receipt-reminders';

    protected $description = 'Remind campaigners about receipts due in 3 days or 1 day';

    public function handle(): int
    {
        $today = now()->startOfDay();
        $sent = 0;

        Transaction::query()
            ->where('type', TransactionType::Disbursement->value)
            ->whereIn('status', [
                TransactionStatus::Settled->value,
                TransactionStatus::ReceiptPending->value,
            ])
            ->whereNotNull('settled_at')
            ->with(['campaign.campaigner'])
            ->chunkById(100, function ($transactions) use ($today, &$sent): void {
                foreach ($transactions as $transaction) {
                    $daysLeft = $transaction->settled_at
                        ->copy()
                        ->addDays(SpendingHoldService::RECEIPT_DUE_DAYS)
                        ->startOfDay()
                        ->diffInDays($today, false);

                    if (! in_array($daysLeft, [3, 1], true)) {
                        continue;
                    }

                    $campaign = $transaction->campaign;
                    $campaigner = $campaign?->campaigner;

                    if ($campaign === null || $campaigner === null) {
                        continue;
                    }

                    $alreadySent = $campaigner->notifications()
                        ->where('type', ReceiptDueSoon::class)
                        ->where('data->transaction_id', $transaction->getKey())
                        ->whereDate('created_at', $today)
                        ->exists();

                    if ($alreadySent) {
                        continue;
                    }

                    Notification::send(
                        $campaigner,
                        new ReceiptDueSoon($transaction, $campaign, $daysLeft),
                    );

                    $sent++;
                }
            });

        $this->info("Sent {$sent} receipt reminder(s).");

        return self::SUCCESS;
    }
}
