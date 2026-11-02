<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DuplicateRequestException;
use App\Exceptions\IdempotencyMismatchException;
use App\Models\IdempotencyKey;

/**
 * Database-backed idempotency. The unique `key` column is the final arbiter:
 * two concurrent requests with the same key cannot both insert, and the
 * `locked_until` lease tells the loser whether to retry or to replay.
 *
 * Callers must run acquire() inside an open DB transaction so the row lock
 * lives exactly as long as the business write it protects.
 */
final class IdempotencyService
{
    public const LEASE_SECONDS = 60;

    public const TTL_HOURS = 24;

    /**
     * @param  array<string, mixed>  $payload
     * @return array{record: IdempotencyKey, replayed: bool, body: array<string, mixed>|null}
     */
    public function acquire(string $scope, string $key, array $payload): array
    {
        $scopedKey = $scope.':'.$key;
        $hash = hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR));

        $record = IdempotencyKey::query()
            ->where('key', $scopedKey)
            ->lockForUpdate()
            ->first();

        if ($record !== null) {
            if (! hash_equals($record->request_hash, $hash)) {
                throw new IdempotencyMismatchException;
            }

            if ($record->isCompleted()) {
                return [
                    'record' => $record,
                    'replayed' => true,
                    'body' => $record->response_body,
                ];
            }

            throw new DuplicateRequestException;
        }

        $record = IdempotencyKey::create([
            'key' => $scopedKey,
            'request_hash' => $hash,
            'locked_until' => now()->addSeconds(self::LEASE_SECONDS),
            'expires_at' => now()->addHours(self::TTL_HOURS),
        ]);

        return ['record' => $record, 'replayed' => false, 'body' => null];
    }

    /**
     * @param  array<string, mixed>  $body
     */
    public function complete(IdempotencyKey $record, int $status, array $body): void
    {
        $record->forceFill([
            'response_status' => $status,
            'response_body' => $body,
            'locked_until' => null,
        ])->save();
    }
}
