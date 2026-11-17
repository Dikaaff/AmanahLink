<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Campaign;
use App\Models\Transaction;
use App\Support\Money;
use Illuminate\Notifications\Notification;

/**
 * In-app warning that a receipt was rejected. The payment is now disputed and
 * the campaign's spending is held until a different reviewer accepts a
 * replacement, so the campaigner needs to know immediately.
 */
final class ReceiptRejected extends Notification
{
    public function __construct(
        public readonly Transaction $transaction,
        public readonly Campaign $campaign,
        public readonly ?string $reason = null,
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
            'type' => 'receipt.rejected',
            'transaction_id' => $this->transaction->getKey(),
            'reference_id' => $reference,
            'campaign_id' => $this->campaign->getKey(),
            'campaign_slug' => $this->campaign->slug,
            'campaign_title' => $this->campaign->title,
            'amount' => $this->transaction->amount,
            'status' => 'disputed',
            'reason' => $this->reason,
            'message' => "Nota pembayaran {$amount} ({$reference}) ditolak"
                .($this->reason === null ? '.' : ': '.$this->reason)
                .' Belanja kampanye ini ditahan sampai nota pengganti disetujui.',
        ];
    }
}
