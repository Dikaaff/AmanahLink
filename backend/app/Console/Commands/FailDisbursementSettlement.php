<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Transaction;
use App\Services\DisbursementService;
use Illuminate\Console\Command;
use Throwable;

/**
 * Ops tool for a transfer that never reached the merchant (bank rejected the
 * account, BI-FAST timeout). Reverses the ledger posting, returns the spending
 * headroom to the campaign, and marks the transaction failed.
 *
 * Admins cannot do this from the review console on purpose: D-033 keeps the
 * money-moving actions with the fundraiser, and support runs the correction.
 */
final class FailDisbursementSettlement extends Command
{
    protected $signature = 'amanahlink:fail-settlement
        {reference : Transaction reference_id, e.g. DIS-01J...}
        {reason : Short human reason stored in the audit log}';

    protected $description = 'Reverse a captured merchant payment whose settlement failed';

    public function handle(DisbursementService $disbursements): int
    {
        try {
            $transaction = Transaction::query()
                ->where('reference_id', (string) $this->argument('reference'))
                ->firstOrFail();

            $failed = $disbursements->failSettlement($transaction, (string) $this->argument('reason'));

            $this->line(json_encode([
                'ok' => true,
                'transaction_id' => $failed->getKey(),
                'status' => $failed->status->value,
                'status_label' => $failed->status->label(),
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
