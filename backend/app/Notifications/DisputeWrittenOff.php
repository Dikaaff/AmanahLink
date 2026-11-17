<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Campaign;
use App\Models\Transaction;
use App\Support\Money;
use Illuminate\Notifications\Notification;

/**
 * Tells the campaigner that a dispute was closed by write-off. The platform
 * absorbed the loss and suspended the merchant, so spending may continue but
 * the campaigner still deserves the record.
 */
final class DisputeWrittenOff extends Notification
{
    public function __construct(
        public readonly Transaction $transaction,
        public readonly Campaign $campaign,
        public readonly string $reason,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $amount = Money::of($this->transaction->amount)->format();
        $reference = $this->transaction->reference_id;

        return [
            'type' => 'dispute.written_off',
            'transaction_id' => $this->transaction->getKey(),
            'reference_id' => $reference,
            'campaign_id' => $this->campaign->getKey(),
            'campaign_slug' => $this->campaign->slug,
            'campaign_title' => $this->campaign->title,
            'amount' => $this->transaction->amount,
            'status' => 'reconciled',
            'reason' => $this->reason,
            'message' => "Sengketa pembayaran {$amount} ({$reference}) ditutup. "
                .'Platform menanggung kerugian dan merchant ditangguhkan. Alasan: '.$this->reason,
        ];
    }
}
