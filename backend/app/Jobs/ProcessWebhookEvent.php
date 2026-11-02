<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\WebhookEvent;
use App\Services\PaymentWebhookService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Processes one stored webhook event off the request path (US-29). Failures are
 * recorded on the event itself, so the job is not retried by the queue worker;
 * backoff and dead-lettering are owned by `WebhookEvent::markFailed()`.
 */
final class ProcessWebhookEvent implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(public readonly int $webhookEventId) {}

    public function handle(PaymentWebhookService $webhooks): void
    {
        $event = WebhookEvent::query()->find($this->webhookEventId);

        if ($event === null) {
            return;
        }

        $webhooks->retry($event);
    }
}
