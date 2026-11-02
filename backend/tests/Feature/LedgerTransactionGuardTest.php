<?php

namespace Tests\Feature;

use App\Enums\AccountCode;
use App\Enums\LedgerDirection;
use App\Models\Transaction;
use App\Services\LedgerService;
use LogicException;
use Tests\TestCase;

/**
 * This test intentionally does NOT use RefreshDatabase: that trait wraps every
 * test in a transaction, which would make DB::transactionLevel() non zero and
 * hide the guard we want to prove.
 */
class LedgerTransactionGuardTest extends TestCase
{
    public function test_posting_outside_a_database_transaction_is_forbidden(): void
    {
        $transaction = new Transaction;
        $transaction->id = 1;

        $this->expectException(LogicException::class);

        app(LedgerService::class)->post($transaction, [
            ['account' => AccountCode::PlatformCash, 'direction' => LedgerDirection::Debit, 'amount' => '100000.00'],
            ['account' => AccountCode::CampaignRestricted, 'direction' => LedgerDirection::Credit, 'amount' => '100000.00', 'campaign_id' => 1],
        ]);
    }
}
