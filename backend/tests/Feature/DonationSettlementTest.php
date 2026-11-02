<?php

namespace Tests\Feature;

use App\Enums\AccountCode;
use App\Enums\CampaignStatus;
use App\Enums\DonationStatus;
use App\Enums\TransactionType;
use App\Exceptions\InvalidStateTransitionException;
use App\Exceptions\LedgerMismatchException;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\LedgerEntry;
use App\Models\Transaction;
use App\Services\CampaignBalanceService;
use App\Services\DonationSettlementService;
use App\Services\LedgerService;
use Database\Seeders\DemoSeeder;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DonationSettlementTest extends TestCase
{
    use RefreshDatabase;

    private DonationSettlementService $settlements;

    private LedgerService $ledger;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
        $this->settlements = app(DonationSettlementService::class);
        $this->ledger = app(LedgerService::class);
    }

    public function test_it_settles_a_donation_and_charges_the_platform_fee(): void
    {
        $donation = $this->pendingDonation('100000.00');

        $settled = $this->settlements->settle($donation->payment_ref);

        $this->assertSame(DonationStatus::Settled, $settled->status);
        $this->assertNotNull($settled->settled_at);

        $this->assertSame(2, Transaction::query()->where('campaign_id', $donation->campaign_id)->count());
        $this->assertSame(1, Transaction::query()->where('type', TransactionType::DonationSettlement)->count());
        $this->assertSame(1, Transaction::query()->where('type', TransactionType::PlatformFee)->count());
        $this->assertSame(4, LedgerEntry::query()->count());

        $campaign = Campaign::query()->findOrFail($donation->campaign_id);

        $this->assertSame('98000.00', $campaign->current_amount);
        $this->assertSame('100000.00', $this->ledger->balanceOf(AccountCode::PlatformCash)->toDecimalString());
        $this->assertSame('98000.00', $this->ledger->balanceOf(AccountCode::CampaignRestricted, $campaign->id)->toDecimalString());
        $this->assertSame('2000.00', $this->ledger->balanceOf(AccountCode::PlatformFeeRevenue)->toDecimalString());

        $this->artisan('ledger:verify')->assertExitCode(0);
    }

    public function test_replaying_a_settlement_does_not_double_credit(): void
    {
        $donation = $this->pendingDonation('100000.00');

        $this->settlements->settle($donation->payment_ref);
        $this->settlements->settle($donation->payment_ref);
        $this->settlements->settle($donation->payment_ref);

        $this->assertSame(4, LedgerEntry::query()->count());
        $this->assertSame(2, Transaction::query()->count());
        $this->assertSame(
            '98000.00',
            Campaign::query()->findOrFail($donation->campaign_id)->current_amount
        );
    }

    public function test_rounding_fee_is_applied_half_up(): void
    {
        $donation = $this->pendingDonation('999.00');

        $this->settlements->settle($donation->payment_ref);

        $this->assertSame('19.98', $this->ledger->balanceOf(AccountCode::PlatformFeeRevenue)->toDecimalString());
        $this->assertSame(
            '979.02',
            Campaign::query()->findOrFail($donation->campaign_id)->current_amount
        );
    }

    public function test_a_failed_donation_cannot_be_settled(): void
    {
        $donation = $this->pendingDonation('100000.00');
        $donation->forceFill(['status' => DonationStatus::Failed])->save();

        $this->expectException(InvalidStateTransitionException::class);

        $this->settlements->settle($donation->payment_ref);
    }

    public function test_campaign_becomes_funded_when_target_is_reached(): void
    {
        $donation = $this->pendingDonation('100000.00', ['target_amount' => 50_000]);

        $this->settlements->settle($donation->payment_ref);

        $campaign = Campaign::query()->findOrFail($donation->campaign_id);

        $this->assertSame(CampaignStatus::Funded, $campaign->status);
        $this->assertNotNull($campaign->funded_at);
    }

    public function test_balance_consistency_check_detects_a_tampered_cache(): void
    {
        $donation = $this->pendingDonation('100000.00');
        $this->settlements->settle($donation->payment_ref);

        DB::table('campaigns')->where('id', $donation->campaign_id)->update(['current_amount' => '999999.00']);

        $campaign = Campaign::query()->findOrFail($donation->campaign_id);

        $this->expectException(LedgerMismatchException::class);

        app(CampaignBalanceService::class)->assertConsistent($campaign);
    }

    public function test_demo_seed_produces_a_consistent_ledger(): void
    {
        $this->seed(DemoSeeder::class);

        $campaign = Campaign::query()->where('slug', 'bantu-biaya-operasi-ibu-sari')->firstOrFail();

        $this->assertSame('735000.00', $campaign->current_amount);
        $this->artisan('ledger:verify')->assertExitCode(0);
    }

    /**
     * @param  array<string, mixed>  $campaignAttributes
     */
    private function pendingDonation(string $amount, array $campaignAttributes = []): Donation
    {
        $campaign = Campaign::factory()->active()->create($campaignAttributes);

        return Donation::factory()->create([
            'campaign_id' => $campaign->id,
            'amount' => $amount,
            'status' => DonationStatus::Initiated,
        ]);
    }
}
