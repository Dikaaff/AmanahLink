<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use App\Services\DisbursementService;
use App\Support\Money;
use Illuminate\Console\Command;
use Throwable;

/**
 * Harness used by the concurrency test: each invocation is an independent PHP
 * process with its own MySQL connection, so real row-lock behaviour is
 * exercised instead of being simulated inside one process.
 */
final class SimulateDisbursementCommand extends Command
{
    protected $signature = 'amanahlink:disburse
        {campaign : Campaign id}
        {merchant : Merchant id}
        {amount : Amount as decimal string}
        {key : Idempotency key}
        {user : Acting user id}';

    protected $description = 'Attempt one disbursement (test harness)';

    public function handle(DisbursementService $disbursements): int
    {
        try {
            $result = $disbursements->pay(
                User::query()->findOrFail($this->argument('user')),
                (int) $this->argument('campaign'),
                (int) $this->argument('merchant'),
                Money::of((string) $this->argument('amount')),
                (string) $this->argument('key'),
            );

            $this->line(json_encode([
                'ok' => true,
                'transaction_id' => $result['transaction']->getKey(),
                'replayed' => $result['replayed'],
            ], JSON_THROW_ON_ERROR));

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->line(json_encode([
                'ok' => false,
                'error' => $e->getMessage(),
            ], JSON_THROW_ON_ERROR));

            return self::FAILURE;
        }
    }
}
