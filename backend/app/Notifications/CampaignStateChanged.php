<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\CampaignStatus;
use App\Models\Campaign;
use Illuminate\Notifications\Notification;

/**
 * In-app row for a campaign state change (US-28). The email is a separate
 * queued mailable so the row is available even when the mail queue is backed
 * up (D-021).
 */
final class CampaignStateChanged extends Notification
{
    public function __construct(
        public readonly Campaign $campaign,
        public readonly CampaignStatus $status,
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
        return [
            'type' => 'campaign.state_changed',
            'campaign_id' => $this->campaign->getKey(),
            'campaign_title' => $this->campaign->title,
            'campaign_slug' => $this->campaign->slug,
            'status' => $this->status->value,
            'reason' => $this->reason,
            'message' => $this->message(),
        ];
    }

    private function message(): string
    {
        return match ($this->status) {
            CampaignStatus::Active => 'Kampanye Anda telah disetujui dan sudah tayang.',
            CampaignStatus::Draft => 'Kampanye Anda ditolak. Silakan perbaiki lalu ajukan ulang.',
            CampaignStatus::Frozen => 'Kampanye Anda dibekukan sementara oleh admin.',
            CampaignStatus::Funded => 'Kampanye Anda sudah mencapai target dana.',
            default => 'Status kampanye Anda berubah menjadi '.$this->status->value.'.',
        };
    }
}
