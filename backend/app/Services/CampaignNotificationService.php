<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\CampaignStatus;
use App\Mail\CampaignStateChangedMail;
use App\Models\Campaign;
use App\Models\User;
use App\Notifications\CampaignStateChanged;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

/**
 * Notifies the campaign owner about a state change (US-28). The in-app row is
 * written immediately; the email goes through the queue (D-021).
 */
final class CampaignNotificationService
{
    public function stateChanged(Campaign $campaign, CampaignStatus $status, ?string $reason = null): void
    {
        /** @var User|null $owner */
        $owner = $campaign->campaigner;

        if ($owner === null) {
            return;
        }

        Notification::send($owner, new CampaignStateChanged($campaign, $status, $reason));

        Mail::to($owner->email)->queue(new CampaignStateChangedMail($campaign, $status, $reason));
    }
}
