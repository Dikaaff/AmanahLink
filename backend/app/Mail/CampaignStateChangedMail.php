<?php

declare(strict_types=1);

namespace App\Mail;

use App\Enums\CampaignStatus;
use App\Models\Campaign;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Queued email for a campaign state change (US-28). Kept separate from the
 * database notification so a slow mailer never delays the in-app row.
 */
final class CampaignStateChangedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Campaign $campaign,
        public CampaignStatus $status,
        public ?string $reason = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Status kampanye "'.$this->campaign->title.'": '.$this->status->value,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.campaign-state-changed');
    }
}
