<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\MerchantStatus;
use App\Models\Campaign;
use App\Models\DisbursementLimit;
use App\Models\Donation;
use App\Models\Merchant;
use App\Models\Receipt;
use App\Models\Transaction;
use App\Models\User;
use App\Services\DisbursementService;
use App\Services\DonationSettlementService;
use App\Support\Money;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AdminDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
    }

    private function settledDonation(Campaign $campaign, string $amount = '100000'): void
    {
        $donation = Donation::factory()->create([
            'campaign_id' => $campaign->id,
            'amount' => $amount,
        ]);

        app(DonationSettlementService::class)->settle($donation->payment_ref);
    }

    private function spend(Campaign $campaign, string $amount = '30000'): void
    {
        $merchant = Merchant::create([
            'name' => 'Apotek Sehat',
            'mcc' => '5912',
            'mid' => 'MID-DASHBOARD-1',
            'status' => MerchantStatus::Verified,
            'city' => 'Bandung',
        ]);

        DisbursementLimit::create([
            'campaign_id' => $campaign->id,
            'daily_limit' => '1000000',
            'monthly_limit' => '10000000',
            'used_today' => '0.00',
            'used_this_month' => '0.00',
            'daily_window' => now()->toDateString(),
            'monthly_window' => now()->format('Y-m'),
            'expires_at' => now()->addMonth(),
        ]);

        app(DisbursementService::class)->pay(
            $campaign->campaigner,
            $campaign->id,
            $merchant->id,
            Money::of($amount),
            'dashboard-spend-1',
        );
    }

    public function test_only_an_admin_can_view_the_dashboard(): void
    {
        foreach ([
            User::factory()->donor()->create(),
            User::factory()->campaigner()->create(),
            User::factory()->verifier()->create(),
        ] as $user) {
            Sanctum::actingAs($user);

            $this->getJson('/api/v1/admin/dashboard')->assertForbidden();
        }
    }

    public function test_the_dashboard_reports_ledger_backed_numbers_and_p95(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $this->settledDonation($campaign);
        $this->spend($campaign);

        $receiptTransaction = Transaction::factory()->captured()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'type' => 'donation_settlement',
            'amount' => '1000.00',
        ]);

        $reviewTransaction = Transaction::factory()->captured()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'type' => 'donation_settlement',
            'amount' => '1000.00',
        ]);

        Receipt::factory()->create(['transaction_id' => $receiptTransaction->id]);
        Receipt::factory()->needsReview()->create(['transaction_id' => $reviewTransaction->id]);

        $now = now();

        foreach (range(1, 20) as $step) {
            DB::table('request_metrics')->insert([
                'route' => 'disbursements.store',
                'status_code' => 201,
                'duration_ms' => $step * 10,
                'created_at' => $now,
            ]);
        }

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.donations_settled_total', '100000.00')
            ->assertJsonPath('data.disbursements_captured_total', '30000.00')
            ->assertJsonPath('data.refunds_total', '0.00')
            ->assertJsonPath('data.ledger_campaign_balance', '68000.00')
            ->assertJsonPath('data.campaign_cache_balance', '68000.00')
            ->assertJsonPath('data.ledger_mismatch_count', 0)
            ->assertJsonPath('data.ocr_queue_depth', 1)
            ->assertJsonPath('data.receipts_needs_review', 1)
            ->assertJsonPath('data.authorize_sample_count', 20)
            ->assertJsonPath('data.authorize_p95_ms', 190);
    }

    public function test_the_dashboard_detects_a_cache_that_drifted_from_the_ledger(): void
    {
        Campaign::factory()->active()->create([
            'current_amount' => '1234.00',
            'target_amount' => '10000000.00',
        ]);

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.ledger_campaign_balance', '0.00')
            ->assertJsonPath('data.campaign_cache_balance', '1234.00')
            ->assertJsonPath('data.ledger_mismatch_count', 1)
            ->assertJsonPath('data.authorize_sample_count', 0)
            ->assertJsonPath('data.authorize_p95_ms', null);
    }

    public function test_an_authorize_request_is_recorded_for_the_p95_metric(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $this->settledDonation($campaign);

        $merchant = Merchant::create([
            'name' => 'Apotek Sehat',
            'mcc' => '5912',
            'mid' => 'MID-DASHBOARD-2',
            'status' => MerchantStatus::Verified,
            'city' => 'Bandung',
        ]);

        DisbursementLimit::create([
            'campaign_id' => $campaign->id,
            'daily_limit' => '1000000',
            'monthly_limit' => '10000000',
            'used_today' => '0.00',
            'used_this_month' => '0.00',
            'daily_window' => now()->toDateString(),
            'monthly_window' => now()->format('Y-m'),
            'expires_at' => now()->addMonth(),
        ]);

        Sanctum::actingAs($campaign->campaigner);

        $this->withHeader('Idempotency-Key', 'dashboard-metric-1')
            ->postJson('/api/v1/disbursements', [
                'campaign_id' => $campaign->id,
                'merchant_id' => $merchant->id,
                'amount' => '10000',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('request_metrics', [
            'route' => 'disbursements.store',
            'status_code' => 201,
        ]);

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.authorize_sample_count', 1)
            ->assertJsonPath('data.ledger_mismatch_count', 0);
    }
}
