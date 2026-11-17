<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Transaction;
use App\Services\ReceiptService;
use Illuminate\Console\Command;
use Throwable;

/**
 * Close a disputed payment when the merchant will not refund. The platform
 * absorbs the loss, the merchant is suspended, and the decision is audited.
 * Kept out of the admin console on purpose: D-033 leaves money-moving
 * corrections to support, while the admin console only decides the receipt.
 */
final class WriteOffDispute extends Command
{
    protected $signature = 'amanahlink:write-off-dispute
        {reference : Transaction reference_id, e.g. DIS-01J...}
        {reason : Short human reason stored in the audit log}';

    protected $description = 'Write off a disputed merchant payment and suspend the merchant';

    public function handle(ReceiptService $receipts): int
    {
        try {
            $transaction = Transaction::query()
                ->where('reference_id', (string) $this->argument('reference'))
                ->firstOrFail();

            $writtenOff = $receipts->writeOff(
                $transaction,
                (string) $this->argument('reason'),
            );

            $this->line(json_encode([
                'ok' => true,
                'transaction_id' => $writtenOff->getKey(),
                'status' => $writtenOff->status->value,
                'status_label' => $writtenOff->status->label(),
                'merchant_id' => $writtenOff->merchant_id,
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
