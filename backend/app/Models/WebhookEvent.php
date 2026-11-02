<?php

namespace App\Models;

use App\Enums\WebhookStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

#[Fillable([
    'provider',
    'external_id',
    'payload',
    'status',
    'attempts',
    'last_error',
    'next_attempt_at',
    'dead_lettered_at',
    'processed_at',
])]
class WebhookEvent extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'status' => WebhookStatus::class,
            'processed_at' => 'datetime',
            'next_attempt_at' => 'datetime',
            'dead_lettered_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }

    public function markProcessed(): void
    {
        $this->forceFill([
            'status' => WebhookStatus::Processed,
            'processed_at' => now(),
            'next_attempt_at' => null,
            'dead_lettered_at' => null,
        ])->save();
    }

    /**
     * Record one failed delivery. The first three failures schedule retries at
     * 1m / 5m / 30m; the fourth moves the event to the dead-letter queue.
     */
    public function markFailed(string $error): void
    {
        $attempts = $this->attempts + 1;
        $delays = array_values((array) config('amanahlink.webhook_retry_delays', [60, 300, 1800]));

        if ($attempts > count($delays)) {
            $this->forceFill([
                'status' => WebhookStatus::DeadLetter,
                'attempts' => $attempts,
                'last_error' => $error,
                'next_attempt_at' => null,
                'dead_lettered_at' => now(),
            ])->save();

            return;
        }

        $this->forceFill([
            'status' => WebhookStatus::Failed,
            'attempts' => $attempts,
            'last_error' => $error,
            'next_attempt_at' => Carbon::now()->addSeconds((int) $delays[$attempts - 1]),
        ])->save();
    }

    public function scopeDueForRetry(Builder $query): Builder
    {
        return $query
            ->where('status', WebhookStatus::Failed->value)
            ->whereNotNull('next_attempt_at')
            ->where('next_attempt_at', '<=', now())
            ->orderBy('next_attempt_at');
    }

    public function scopeDeadLettered(Builder $query): Builder
    {
        return $query->where('status', WebhookStatus::DeadLetter->value);
    }
}
