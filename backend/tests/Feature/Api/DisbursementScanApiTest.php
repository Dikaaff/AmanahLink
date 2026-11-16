<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\MerchantStatus;
use App\Models\Campaign;
use App\Models\DisbursementLimit;
use App\Models\Donation;
use App\Models\Merchant;
use App\Models\Transaction;
use App\Models\User;
use App\Services\DonationSettlementService;
use App\Support\MerchantQr;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DisbursementScanApiTest extends TestCase
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
    private function scan(Campaign $campaign, string $qr, string $amount = '30000', array $overrides = []): TestResponse
    {
        Sanctum::actingAs($campaign->campaigner);

        return $this->postJson('/api/v1/disbursements/scan', array_merge([
            'campaign_id' => $campaign->id,
            'amount' => $amount,
            'qr' => $qr,
        ], $overrides));
    }

    public function test_a_scanned_verified_merchant_is_authorized_without_moving_money(): void
    {
        $campaign = $this->fundedCampaign();
        $limit = $this->limit($campaign);
        $merchant = $this->merchant();
        $transactionsBefore = Transaction::query()->count();

        $response = $this->scan($campaign, app(MerchantQr::class)->payload($merchant));

        $response->assertOk()
            ->assertJsonPath('data.allowed', true)
            ->assertJsonPath('data.code', null)
            ->assertJsonPath('data.merchant.id', $merchant->id)
            ->assertJsonPath('data.merchant.mcc', '5912')
            ->assertJsonPath('data.mcc', '5912')
            ->assertJsonPath('data.ledger_balance', '98000.00')
            ->assertJsonPath('data.remaining_today', '100000.00');

        $this->assertContains('5912', $response->json('data.allowed_mcc'));

        // A scan is a read-only check: no capture, no limit consumption.
        $this->assertSame($transactionsBefore, Transaction::query()->count());
        $this->assertDatabaseHas('campaigns', ['id' => $campaign->id, 'current_amount' => '98000.00']);
        $this->assertSame('0.00', $limit->refresh()->used_today);
    }

    public function test_a_merchant_outside_the_campaign_allowlist_is_rejected(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $campaign->forceFill(['allowed_mcc_array' => ['8062']])->save();

        $merchant = $this->merchant('5912');

        $this->scan($campaign, app(MerchantQr::class)->payload($merchant))
            ->assertOk()
            ->assertJsonPath('data.allowed', false)
            ->assertJsonPath('data.code', 'MCC_NOT_ALLOWED')
            ->assertJsonPath('data.merchant.id', $merchant->id);
    }

    public function test_an_amount_above_the_ledger_balance_is_rejected(): void
    {
        $campaign = $this->fundedCampaign('10000');
        $this->limit($campaign);
        $merchant = $this->merchant();

        $this->scan($campaign, app(MerchantQr::class)->payload($merchant), '50000')
            ->assertOk()
            ->assertJsonPath('data.allowed', false)
            ->assertJsonPath('data.code', 'INSUFFICIENT_FUNDS');
    }

    public function test_a_tampered_qr_is_rejected_as_invalid_input(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant();

        $payload = app(MerchantQr::class)->payload($merchant);
        $tampered = str_replace(':5912:', ':8062:', $payload);

        $this->scan($campaign, $tampered)
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['details' => ['fields' => ['qr']]]]);
    }

    public function test_a_qr_for_an_unverified_merchant_is_rejected(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant('5912', MerchantStatus::Pending);

        $this->scan($campaign, app(MerchantQr::class)->payload($merchant))
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['details' => ['fields' => ['qr']]]]);
    }

    public function test_a_campaigner_cannot_scan_against_another_campaign(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant();

        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->postJson('/api/v1/disbursements/scan', [
            'campaign_id' => $campaign->id,
            'amount' => '30000',
            'qr' => app(MerchantQr::class)->payload($merchant),
        ])->assertForbidden();
    }

    public function test_status_and_merchant_refresh_when_qr_becomes_stale(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant();

        $payload = app(MerchantQr::class)->payload($merchant);

        $merchant->forceFill(['status' => MerchantStatus::Suspended])->save();

        $this->scan($campaign, $payload)
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['details' => ['fields' => ['qr']]]]);
    }
}
