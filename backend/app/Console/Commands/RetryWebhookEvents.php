<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\ProcessWebhookEvent;
use App\Models\WebhookEvent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

final class RetryWebhookEvents extends Command
{
    protected $signature = 'webhooks:retry {--limit=100 : Maximum events dispatched per run}';

    protected $description = 'Retry failed payment webhooks that are due, and alert on a deep dead-letter queue';

    public function handle(): int
    {
        $limit = max(1, (int) $this->option('limit'));

        $due = WebhookEvent::query()->dueForRetry()->limit($limit)->get();

        foreach ($due as $event) {
            ProcessWebhookEvent::dispatch($event->getKey());
        }

        $deadLetters = WebhookEvent::query()->deadLettered()->count();
        $threshold = (int) config('amanahlink.webhook_dlq_alert_depth', 1000);

        if ($deadLetters > $threshold) {
            Log::critical('webhook.dlq_depth_exceeded', [
                'dead_letter_count' => $deadLetters,
                'threshold' => $threshold,
            ]);
        }

        $this->info("Dispatched {$due->count()} retry job(s); {$deadLetters} event(s) in the dead-letter queue.");

        return self::SUCCESS;
    }
}
