<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\AccountCode;
use App\Enums\MerchantStatus;
use App\Enums\TransactionStatus;
use App\Models\Campaign;
use App\Models\DisbursementLimit;
use App\Models\Donation;
use App\Models\Merchant;
use App\Models\Receipt;
use App\Models\Transaction;
use App\Models\User;
use App\Services\DonationSettlementService;
use App\Services\LedgerService;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DisbursementApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
    }

    private function fundedCampaign(string $amount = '100000'): Campaign
    {
        $campaign = Campaign::factory()->active()->create();
        $donation = Donation::factory()->create([
            'campaign_id' => $campaign->id,
            'amount' => $amount,
        ]);

        app(DonationSettlementService::class)->settle($donation->payment_ref);

        return $campaign->refresh();
    }

    private function limit(Campaign $campaign, string $daily = '100000', string $monthly = '1000000'): DisbursementLimit
    {
        return DisbursementLimit::create([
            'campaign_id' => $campaign->id,
            'daily_limit' => $daily,
            'monthly_limit' => $monthly,
            'used_today' => '0.00',
            'used_this_month' => '0.00',
            'daily_window' => now()->toDateString(),
            'monthly_window' => now()->format('Y-m'),
            'expires_at' => now()->addMonth(),
        ]);
    }

    private function merchant(string $mcc = '5912', MerchantStatus $status = MerchantStatus::Verified): Merchant
    {
        return Merchant::create([
            'name' => 'Apotek Sehat',
            'mcc' => $mcc,
            'mid' => 'MID-'.strtoupper(substr(md5($mcc.$status->value), 0, 8)),
            'status' => $status,
            'city' => 'Bandung',
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function pay(User $actor, Campaign $campaign, Merchant $merchant, string $amount, string $key = 'disb-1', array $overrides = []): TestResponse
    {
        Sanctum::actingAs($actor);

        return $this->withHeader('Idempotency-Key', $key)
            ->postJson('/api/v1/disbursements', array_merge([
                'campaign_id' => $campaign->id,
                'merchant_id' => $merchant->id,
                'amount' => $amount,
            ], $overrides));
    }

    public function test_a_campaigner_can_pay_a_verified_merchant_within_limits(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant();

        $response = $this->pay($campaign->campaigner, $campaign, $merchant, '30000');

        $response->assertCreated()
            ->assertJsonPath('data.amount', '30000.00')
            ->assertJsonPath('data.mcc_used', '5912')
            ->assertJsonPath('meta.replayed', false);

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'current_amount' => '68000.00',
        ]);
        $this->assertSame(
            '68000.00',
            app(LedgerService::class)
                ->balanceOf(AccountCode::CampaignRestricted, $campaign->id)
                ->toDecimalString(),
        );
        $this->assertSame(
            '30000.00',
            app(LedgerService::class)
                ->balanceOf(AccountCode::MerchantClearing)
                ->toDecimalString(),
        );
        $this->assertDatabaseHas('disbursement_limits', [
            'campaign_id' => $campaign->id,
            'used_today' => '30000.00',
            'used_this_month' => '30000.00',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'disbursement.captured']);
    }

    public function test_authorize_can_expose_query_count_for_local_profiling(): void
    {
        config(['amanahlink.profile_queries' => true]);
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant();

        $response = $this->pay($campaign->campaigner, $campaign, $merchant, '1', 'disb-profile');

        $response->assertCreated()->assertHeader('X-Perf-Query-Count');
        $this->assertGreaterThan(0, (int) $response->headers->get('X-Perf-Query-Count'));
    }

    public function test_replaying_the_same_key_does_not_spend_twice(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant();

        $first = $this->pay($campaign->campaigner, $campaign, $merchant, '30000', 'disb-replay')->assertCreated();
        $second = $this->pay($campaign->campaigner, $campaign, $merchant, '30000', 'disb-replay')
            ->assertOk()
            ->assertJsonPath('meta.replayed', true);

        $this->assertSame($first->json('data.reference_id'), $second->json('data.reference_id'));
        $this->assertSame(1, Transaction::query()->where('type', 'disbursement')->count());
        $this->assertDatabaseHas('campaigns', ['id' => $campaign->id, 'current_amount' => '68000.00']);
    }

    public function test_a_merchant_outside_the_mcc_allowlist_is_rejected(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant('8011');

        $this->pay($campaign->campaigner, $campaign, $merchant, '10000')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'MCC_NOT_ALLOWED');
    }

    public function test_a_globally_blocked_mcc_is_rejected_even_if_listed(): void
    {
        $campaign = Campaign::factory()->active()->create([
            'allowed_mcc_array' => ['5732'],
        ]);
        $donation = Donation::factory()->create(['campaign_id' => $campaign->id, 'amount' => 100000]);
        app(DonationSettlementService::class)->settle($donation->payment_ref);
        $this->limit($campaign);

        $merchant = $this->merchant('5732');

        $this->pay($campaign->campaigner, $campaign->refresh(), $merchant, '10000')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'MCC_NOT_ALLOWED');
    }

    public function test_an_unverified_merchant_is_rejected(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant('5912', MerchantStatus::Pending);

        $this->pay($campaign->campaigner, $campaign, $merchant, '10000')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'MCC_NOT_ALLOWED');
    }

    public function test_spending_more_than_the_ledger_balance_is_rejected(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign, '1000000', '1000000');
        $merchant = $this->merchant();

        $this->pay($campaign->campaigner, $campaign, $merchant, '200000')
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'INSUFFICIENT_FUNDS');
    }

    public function test_the_daily_limit_is_enforced(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign, '20000', '1000000');
        $merchant = $this->merchant();

        $this->pay($campaign->campaigner, $campaign, $merchant, '30000')
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'LIMIT_EXCEEDED')
            ->assertJsonPath('error.details.scope', 'daily')
            ->assertJsonPath('error.details.remaining', '20000.00');
    }

    public function test_the_monthly_limit_is_enforced(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign, '100000', '25000');
        $merchant = $this->merchant();

        $this->pay($campaign->campaigner, $campaign, $merchant, '30000')
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'LIMIT_EXCEEDED')
            ->assertJsonPath('error.details.scope', 'monthly');
    }

    public function test_an_expired_limit_is_rejected(): void
    {
        $campaign = $this->fundedCampaign();
        DisbursementLimit::create([
            'campaign_id' => $campaign->id,
            'daily_limit' => '100000',
            'monthly_limit' => '1000000',
            'used_today' => '0.00',
            'used_this_month' => '0.00',
            'daily_window' => now()->toDateString(),
            'monthly_window' => now()->format('Y-m'),
            'expires_at' => now()->subDay(),
        ]);
        $merchant = $this->merchant();

        $this->pay($campaign->campaigner, $campaign, $merchant, '10000')
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'LIMIT_EXPIRED');
    }

    public function test_a_campaign_without_limits_cannot_disburse(): void
    {
        $campaign = $this->fundedCampaign();
        $merchant = $this->merchant();

        $this->pay($campaign->campaigner, $campaign, $merchant, '10000')
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'LIMIT_EXPIRED');
    }

    public function test_a_stranger_cannot_disburse_from_someone_elses_campaign(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant();

        $this->pay(User::factory()->campaigner()->create(), $campaign, $merchant, '10000')
            ->assertForbidden();
    }

    public function test_a_simulation_previews_a_valid_payout_without_persisting(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant();

        Sanctum::actingAs($campaign->campaigner);

        $this->postJson('/api/v1/disbursements/simulate', [
            'campaign_id' => $campaign->id,
            'merchant_id' => $merchant->id,
            'amount' => '30000',
        ])
            ->assertOk()
            ->assertJsonPath('data.allowed', true)
            ->assertJsonPath('data.code', null)
            ->assertJsonPath('data.mcc', '5912')
            ->assertJsonPath('data.remaining_today', '100000.00')
            ->assertJsonPath('data.remaining_month', '1000000.00')
            ->assertJsonPath('data.ledger_balance', '98000.00');

        $this->assertSame(0, Transaction::query()->where('type', 'disbursement')->count());
        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'current_amount' => '98000.00',
        ]);
        $this->assertDatabaseHas('disbursement_limits', [
            'campaign_id' => $campaign->id,
            'used_today' => '0.00',
            'used_this_month' => '0.00',
        ]);
    }

    public function test_a_simulation_reports_mcc_rejection_without_persisting(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant('8011');

        Sanctum::actingAs($campaign->campaigner);

        $this->postJson('/api/v1/disbursements/simulate', [
            'campaign_id' => $campaign->id,
            'merchant_id' => $merchant->id,
            'amount' => '10000',
        ])
            ->assertOk()
            ->assertJsonPath('data.allowed', false)
            ->assertJsonPath('data.code', 'MCC_NOT_ALLOWED');

        $this->assertSame(0, Transaction::query()->where('type', 'disbursement')->count());
    }

    public function test_a_simulation_reports_insufficient_funds(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign, '1000000', '1000000');
        $merchant = $this->merchant();

        Sanctum::actingAs($campaign->campaigner);

        $this->postJson('/api/v1/disbursements/simulate', [
            'campaign_id' => $campaign->id,
            'merchant_id' => $merchant->id,
            'amount' => '200000',
        ])
            ->assertOk()
            ->assertJsonPath('data.allowed', false)
            ->assertJsonPath('data.code', 'INSUFFICIENT_FUNDS');

        $this->assertSame(0, Transaction::query()->where('type', 'disbursement')->count());
    }

    public function test_a_simulation_reports_the_daily_limit_scope_and_remaining(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign, '20000', '1000000');
        $merchant = $this->merchant();

        Sanctum::actingAs($campaign->campaigner);

        $this->postJson('/api/v1/disbursements/simulate', [
            'campaign_id' => $campaign->id,
            'merchant_id' => $merchant->id,
            'amount' => '30000',
        ])
            ->assertOk()
            ->assertJsonPath('data.allowed', false)
            ->assertJsonPath('data.code', 'LIMIT_EXCEEDED')
            ->assertJsonPath('data.details.scope', 'daily')
            ->assertJsonPath('data.details.remaining', '20000.00');
    }

    public function test_a_stranger_cannot_simulate_someone_elses_campaign(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant();

        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->postJson('/api/v1/disbursements/simulate', [
            'campaign_id' => $campaign->id,
            'merchant_id' => $merchant->id,
            'amount' => '10000',
        ])->assertForbidden();
    }

    public function test_a_campaigner_can_list_own_disbursements_with_receipt_status(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $merchant = Merchant::factory()->create();
        $transaction = Transaction::factory()->captured()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'merchant_id' => $merchant->id,
            'status' => TransactionStatus::ReceiptPending,
        ]);
        Receipt::factory()->needsReview()->create(['transaction_id' => $transaction->id]);

        $otherCampaign = Campaign::factory()->active()->create();
        Transaction::factory()->captured()->create([
            'campaign_id' => $otherCampaign->id,
            'user_id' => $otherCampaign->user_id,
        ]);

        Sanctum::actingAs($campaign->campaigner);

        $this->getJson('/api/v1/disbursements')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $transaction->id)
            ->assertJsonPath('data.0.status', 'receipt_pending')
            ->assertJsonPath('data.0.status_label', 'Menunggu Nota')
            ->assertJsonPath('data.0.campaign.slug', $campaign->slug)
            ->assertJsonPath('data.0.merchant.id', $merchant->id)
            ->assertJsonPath('data.0.receipt.status', 'needs_review')
            ->assertJsonPath('data.0.receipt.status_label', 'Perlu Review');
    }

    public function test_a_donor_cannot_list_disbursements(): void
    {
        Sanctum::actingAs(User::factory()->donor()->create());

        $this->getJson('/api/v1/disbursements')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_only_an_admin_can_set_the_limits(): void
    {
        $campaign = $this->fundedCampaign();

        Sanctum::actingAs($campaign->campaigner);
        $this->putJson("/api/v1/campaigns/{$campaign->id}/disbursement-limit", [
            'daily_limit' => '50000',
            'monthly_limit' => '500000',
            'expires_at' => now()->addMonth()->toIso8601String(),
        ])->assertForbidden();

        Sanctum::actingAs(User::factory()->admin()->create());
        $this->putJson("/api/v1/campaigns/{$campaign->id}/disbursement-limit", [
            'daily_limit' => '50000',
            'monthly_limit' => '500000',
            'expires_at' => now()->addMonth()->toIso8601String(),
        ])
            ->assertOk()
            ->assertJsonPath('data.daily_limit', '50000.00');

        $this->assertDatabaseHas('disbursement_limits', [
            'campaign_id' => $campaign->id,
            'daily_limit' => '50000.00',
        ]);
    }

    public function test_a_campaigner_can_read_the_own_limit(): void
    {
        $campaign = $this->fundedCampaign();
        $limit = $this->limit($campaign, '25000', '250000');

        Sanctum::actingAs($campaign->campaigner);

        $this->getJson("/api/v1/campaigns/{$campaign->id}/disbursement-limit")
            ->assertOk()
            ->assertJsonPath('data.campaign_id', $campaign->id)
            ->assertJsonPath('data.daily_limit', '25000.00')
            ->assertJsonPath('data.monthly_limit', '250000.00')
            ->assertJsonPath('data.used_today', $limit->used_today)
            ->assertJsonPath('data.expires_at', $limit->expires_at->toIso8601String());
    }

    public function test_a_campaigner_cannot_read_someone_elses_limit(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);

        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->getJson("/api/v1/campaigns/{$campaign->id}/disbursement-limit")
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_an_admin_can_read_the_limit_of_any_campaign(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign, '10000', '100000');

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson("/api/v1/campaigns/{$campaign->id}/disbursement-limit")
            ->assertOk()
            ->assertJsonPath('data.daily_limit', '10000.00');
    }

    public function test_reading_a_missing_limit_returns_null_payload(): void
    {
        $campaign = $this->fundedCampaign();

        Sanctum::actingAs($campaign->campaigner);

        $this->getJson("/api/v1/campaigns/{$campaign->id}/disbursement-limit")
            ->assertOk()
            ->assertJsonPath('data', null);
    }
}
