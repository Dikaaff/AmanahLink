<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\WebhookStatus;
use App\Exceptions\InvalidSignatureException;
use App\Models\Donation;
use App\Models\User;
use App\Models\WebhookEvent;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Pay-in rail callback. Three rules:
 *   1. Never trust the body until the HMAC signature verifies.
 *   2. Every delivery is stored with its provider event id, so retries are
 *      idempotent even if two arrive at the same time.
 *   3. The amount is never read from the callback; only the payment reference
 *      is used to find the donation we already recorded.
 *
 * Failed events are retried by `webhooks:retry` with a 1m/5m/30m backoff and
 * then parked in the dead-letter queue, where an admin can replay them (US-29).
 */
final class PaymentWebhookService
{
    public function __construct(
        private readonly DonationSettlementService $settlements,
        private readonly AuditLogger $audit,
    ) {}

    public function handle(string $provider, Request $request): WebhookEvent
    {
        $raw = $request->getContent();
        $signature = (string) $request->header('X-Callback-Signature', '');
        $secret = (string) config('amanahlink.payment_webhook_secret', '');

        if ($secret === '' || ! hash_equals(hash_hmac('sha256', $raw, $secret), $signature)) {
            $this->reject($provider, 'invalid_signature', 'Signature webhook tidak valid.');
        }

        /** @var array<string, mixed> $payload */
        $payload = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);

        $externalId = (string) ($payload['external_id'] ?? '');

        if ($externalId === '' || strlen($externalId) > 120) {
            $this->reject($provider, 'invalid_external_id', 'External id webhook tidak valid.');
        }

        $this->assertFreshTimestamp($provider, $payload['timestamp'] ?? null);

        $event = $this->store($provider, $externalId, $payload);

        if ($event->status !== WebhookStatus::Received) {
            return $event;
        }

        return $this->process($event, throwOnFailure: true);
    }

    /**
     * Retry a stored event. Never throws: the failure is recorded on the event
     * so the scheduler can back off or dead-letter it.
     */
    public function retry(WebhookEvent $event): WebhookEvent
    {
        if ($event->status === WebhookStatus::Processed) {
            return $event;
        }

        return $this->process($event, throwOnFailure: false);
    }

    /**
     * Admin replay from the dead-letter queue. Settlement is idempotent, so a
     * successful event is never posted to the ledger twice.
     */
    public function replay(WebhookEvent $event, ?User $actor = null): WebhookEvent
    {
        $event->forceFill([
            'status' => WebhookStatus::Received,
            'next_attempt_at' => null,
            'dead_lettered_at' => null,
        ])->save();

        $replayed = $this->process($event, throwOnFailure: false);

        $this->audit->record('webhook.replayed', $replayed, null, [
            'provider' => $replayed->provider,
            'external_id' => $replayed->external_id,
            'status' => $replayed->status->value,
            'attempts' => $replayed->attempts,
        ], $actor);

        return $replayed;
    }

    private function process(WebhookEvent $event, bool $throwOnFailure): WebhookEvent
    {
        $event->forceFill(['status' => WebhookStatus::Processing])->save();

        /** @var array<string, mixed> $payload */
        $payload = $event->payload;

        if (($payload['event'] ?? null) !== 'payment.settled') {
            $event->markProcessed();

            return $event->fresh();
        }

        try {
            /** @var Donation $donation */
            $donation = $this->settlements->settle((string) ($payload['payment_ref'] ?? ''));

            $event->markProcessed();

            $this->audit->record('webhook.payment_settled', $donation, null, [
                'provider' => $event->provider,
                'external_id' => $event->external_id,
                'payment_ref' => $donation->payment_ref,
            ]);
        } catch (Throwable $e) {
            $event->markFailed($e->getMessage());

            if ($throwOnFailure) {
                throw $e;
            }

            return $event->fresh();
        }

        return $event->fresh();
    }

    /**
     * A valid signature over an old body is still a replay. Providers retry
     * within minutes, so anything outside the tolerance window is refused.
     *
     * @param  mixed  $timestamp  ISO-8601 string or Unix seconds
     */
    private function assertFreshTimestamp(string $provider, mixed $timestamp): void
    {
        if ($timestamp === null || $timestamp === '') {
            $this->reject($provider, 'missing_timestamp', 'Timestamp webhook wajib ada.');
        }

        try {
            $sentAt = is_numeric($timestamp)
                ? CarbonImmutable::createFromTimestamp((int) $timestamp)
                : CarbonImmutable::parse((string) $timestamp);
        } catch (Throwable) {
            $this->reject($provider, 'invalid_timestamp', 'Timestamp webhook tidak dapat dibaca.');
        }

        $tolerance = (int) config('amanahlink.payment_webhook_tolerance_seconds', 300);

        if ($sentAt->diffInSeconds(CarbonImmutable::now(), true) > $tolerance) {
            $this->reject($provider, 'stale_timestamp', 'Timestamp webhook di luar toleransi.');
        }
    }

    private function reject(string $provider, string $reason, string $message): never
    {
        $this->audit->record('webhook.rejected', null, null, [
            'provider' => $provider,
            'reason' => $reason,
        ]);

        throw new InvalidSignatureException($message);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function store(string $provider, string $externalId, array $payload): WebhookEvent
    {
        try {
            return DB::transaction(function () use ($provider, $externalId, $payload): WebhookEvent {
                /** @var WebhookEvent $event */
                $event = WebhookEvent::query()
                    ->where('external_id', $externalId)
                    ->lockForUpdate()
                    ->first();

                if ($event !== null) {
                    return $event;
                }

                return WebhookEvent::create([
                    'provider' => $provider,
                    'external_id' => $externalId,
                    'payload' => $payload,
                    'status' => WebhookStatus::Received,
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            return WebhookEvent::query()->where('external_id', $externalId)->firstOrFail();
        }
    }
}
