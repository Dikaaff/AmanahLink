<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Donation;
use App\Models\User;
use App\Support\Money;
use Illuminate\Notifications\Notification;

/**
 * In-app receipt of a settled donation. The donor sees a confirmation and the
 * campaigner sees incoming funds; both point at the same campaign.
 */
final class DonationSettled extends Notification
{
    public function __construct(private readonly Donation $donation) {}

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
        $campaign = $this->donation->campaign;
        $amount = Money::of($this->donation->amount)->format();
        $isDonor = $notifiable instanceof User
            && $notifiable->getKey() === $this->donation->donor_id;

        return [
            'type' => 'donation_settled',
            'donation_id' => $this->donation->getKey(),
            'campaign_id' => $this->donation->campaign_id,
            'campaign_slug' => $campaign?->slug,
            'campaign_title' => $campaign?->title,
            'amount' => $this->donation->amount,
            'status' => 'settled',
            'message' => $isDonor
                ? "Donasi {$amount} untuk {$campaign?->title} berhasil."
                : "Donasi baru {$amount} masuk ke {$campaign?->title}.",
        ];
    }
}
