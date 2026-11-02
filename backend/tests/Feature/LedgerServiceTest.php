<?php

namespace Tests\Feature;

use App\Enums\AccountCode;
use App\Enums\LedgerDirection;
use App\Enums\TransactionType;
use App\Exceptions\UnbalancedLedgerException;
use App\Models\Campaign;
use App\Models\LedgerEntry;
use App\Models\Transaction;
use App\Services\CampaignBalanceService;
use App\Services\LedgerService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;
use Tests\TestCase;

class LedgerServiceTest extends TestCase
{
    use RefreshDatabase;

    private LedgerService $ledger;

    protected function setUp(): void
    {
        parent::setUp();

        $this->ledger = app(LedgerService::class);
    }

    public function test_it_posts_balanced_entries_and_tracks_balances(): void
    {
        $campaign = Campaign::factory()->create();
        $transaction = $this->settlement($campaign, '100000.00');

        $this->postDonation($transaction, $campaign, '100000.00');

        $entries = LedgerEntry::query()->where('transaction_id', $transaction->id)->get();

        $this->assertCount(2, $entries);
        $this->assertSame('100000.00', $this->ledger->balanceOf(AccountCode::PlatformCash)->toDecimalString());
        $this->assertSame(
            '100000.00',
            $this->ledger->balanceOf(AccountCode::CampaignRestricted, $campaign->id)->toDecimalString()
        );

        $credit = $entries->firstWhere('direction', LedgerDirection::Credit);
        $this->assertSame('100000.00', $credit->balance_after);
    }

    public function test_running_balance_accumulates_across_transactions(): void
    {
        $campaign = Campaign::factory()->create();

        $first = $this->settlement($campaign, '100000.00');
        $this->postDonation($first, $campaign, '100000.00');

        $second = $this->settlement($campaign, '50000.50');
        $this->postDonation($second, $campaign, '50000.50');

        $this->assertSame('150000.50', $this->ledger->balanceOf(AccountCode::PlatformCash)->toDecimalString());

        $latest = LedgerEntry::query()
            ->where('transaction_id', $second->id)
            ->orderBy('id')
            ->get()
            ->first();

        $this->assertSame('150000.50', $latest->balance_after);
    }

    public function test_unbalanced_posting_is_rejected_and_writes_nothing(): void
    {
        $campaign = Campaign::factory()->create();
        $transaction = $this->settlement($campaign, '100000.00');

        try {
            DB::transaction(function () use ($transaction, $campaign) {
                $this->ledger->post($transaction, [
                    ['account' => AccountCode::PlatformCash, 'direction' => LedgerDirection::Debit, 'amount' => '100000.00'],
                    ['account' => AccountCode::CampaignRestricted, 'direction' => LedgerDirection::Credit, 'amount' => '90000.00', 'campaign_id' => $campaign->id],
                ]);
            });

            $this->fail('Unbalanced post should have thrown.');
        } catch (UnbalancedLedgerException $exception) {
            $this->assertStringContainsString('unbalanced', $exception->getMessage());
        }

        $this->assertDatabaseCount('ledger_entries', 0);
    }

    public function test_zero_or_negative_amounts_are_rejected(): void
    {
        $campaign = Campaign::factory()->create();
        $transaction = $this->settlement($campaign, '100000.00');

        $this->expectException(InvalidArgumentException::class);

        DB::transaction(function () use ($transaction, $campaign) {
            $this->ledger->post($transaction, [
                ['account' => AccountCode::PlatformCash, 'direction' => LedgerDirection::Debit, 'amount' => '0.00'],
                ['account' => AccountCode::CampaignRestricted, 'direction' => LedgerDirection::Credit, 'amount' => '0.00', 'campaign_id' => $campaign->id],
            ]);
        });
    }

    public function test_campaign_scoped_account_requires_a_campaign_id(): void
    {
        $campaign = Campaign::factory()->create();
        $transaction = $this->settlement($campaign, '100000.00');

        $this->expectException(InvalidArgumentException::class);

        DB::transaction(function () use ($transaction) {
            $this->ledger->post($transaction, [
                ['account' => AccountCode::PlatformCash, 'direction' => LedgerDirection::Debit, 'amount' => '100000.00'],
                ['account' => AccountCode::CampaignRestricted, 'direction' => LedgerDirection::Credit, 'amount' => '100000.00'],
            ]);
        });
    }

    public function test_ledger_entry_model_cannot_be_updated_or_deleted(): void
    {
        $campaign = Campaign::factory()->create();
        $transaction = $this->settlement($campaign, '100000.00');
        $this->postDonation($transaction, $campaign, '100000.00');

        $entry = LedgerEntry::query()->firstOrFail();

        try {
            $entry->update(['amount' => '1.00']);
            $this->fail('Model update should have thrown.');
        } catch (LogicException) {
            $this->assertSame('100000.00', $entry->fresh()->amount);
        }

        $this->expectException(LogicException::class);
        $entry->delete();
    }

    public function test_database_trigger_blocks_raw_updates_to_ledger_entries(): void
    {
        $campaign = Campaign::factory()->create();
        $transaction = $this->settlement($campaign, '100000.00');
        $this->postDonation($transaction, $campaign, '100000.00');

        $entry = LedgerEntry::query()->firstOrFail();

        $this->expectException(QueryException::class);

        DB::table('ledger_entries')->where('id', $entry->id)->update(['amount' => '1.00']);
    }

    public function test_verify_command_passes_when_invariants_hold(): void
    {
        $campaign = Campaign::factory()->create();
        $transaction = $this->settlement($campaign, '100000.00');
        $this->postDonation($transaction, $campaign, '100000.00');

        app(CampaignBalanceService::class)->sync($campaign);

        $this->artisan('ledger:verify')->assertExitCode(0);
    }

    public function test_verify_command_detects_captured_transaction_without_entries(): void
    {
        Transaction::factory()->captured()->create();

        $this->artisan('ledger:verify')->assertExitCode(1);
    }

    private function settlement(Campaign $campaign, string $amount): Transaction
    {
        return Transaction::factory()->create([
            'campaign_id' => $campaign->id,
            'type' => TransactionType::DonationSettlement,
            'amount' => $amount,
        ]);
    }

    private function postDonation(Transaction $transaction, Campaign $campaign, string $amount): void
    {
        DB::transaction(function () use ($transaction, $campaign, $amount) {
            $this->ledger->post($transaction, [
                ['account' => AccountCode::PlatformCash, 'direction' => LedgerDirection::Debit, 'amount' => $amount],
                ['account' => AccountCode::CampaignRestricted, 'direction' => LedgerDirection::Credit, 'amount' => $amount, 'campaign_id' => $campaign->id],
            ]);
        });
    }
}
