<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\WebhookStatus;
use App\Exceptions\InvalidSignatureException;
use App\Models\Donation;
use App\Models\WebhookEvent;
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
            throw new InvalidSignatureException;
        }

        /** @var array<string, mixed> $payload */
        $payload = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);

        $externalId = (string) ($payload['external_id'] ?? '');

        if ($externalId === '' || strlen($externalId) > 120) {
            throw new InvalidSignatureException;
        }

        $event = $this->store($provider, $externalId, $payload);

        if ($event->status === WebhookStatus::Processed) {
            return $event;
        }

        if (($payload['event'] ?? null) !== 'payment.settled') {
            $event->markProcessed();

            return $event->fresh();
        }

        try {
            $donation = $this->settlements->settle((string) ($payload['payment_ref'] ?? ''));

            $event->markProcessed();

            $this->audit->record('webhook.payment_settled', $donation, null, [
                'provider' => $provider,
                'external_id' => $externalId,
                'payment_ref' => $donation->payment_ref,
            ]);
        } catch (Throwable $e) {
            $event->markFailed($e->getMessage());

            throw $e;
        }

        return $event->fresh();
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
