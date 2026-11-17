<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Campaign;
use App\Models\Transaction;
use App\Support\Money;
use Illuminate\Notifications\Notification;

/**
 * Deadline reminder for a merchant payment whose receipt is still missing.
 * Sending at H-3 and H-1 gives the campaigner a chance to upload proof before
 * the platform holds further spending.
 */
final class ReceiptDueSoon extends Notification
{
    public function __construct(
        public readonly Transaction $transaction,
        public readonly Campaign $campaign,
        public readonly int $daysLeft,
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
            'type' => 'receipt.due_soon',
            'transaction_id' => $this->transaction->getKey(),
            'reference_id' => $reference,
            'campaign_id' => $this->campaign->getKey(),
            'campaign_slug' => $this->campaign->slug,
            'campaign_title' => $this->campaign->title,
            'amount' => $this->transaction->amount,
            'days_left' => $this->daysLeft,
            'message' => "Nota pembayaran {$amount} ({$reference}) belum diunggah. "
                ."Sisa {$this->daysLeft} hari sebelum belanja kampanye ditahan.",
        ];
    }
}
