<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\AccountCode;
use App\Enums\MerchantStatus;
use App\Models\AuditLog;
use App\Models\Campaign;
use App\Models\DisbursementLimit;
use App\Models\Donation;
use App\Models\Merchant;
use App\Models\Transaction;
use App\Models\User;
use App\Services\DisbursementService;
use App\Services\DonationSettlementService;
use App\Services\LedgerService;
use App\Support\Money;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class CampaignClosureApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
    }

    private function settledDonation(Campaign $campaign, string $amount): Donation
    {
        $donation = Donation::factory()->create([
            'campaign_id' => $campaign->id,
            'amount' => $amount,
        ]);

        app(DonationSettlementService::class)->settle($donation->payment_ref);

        return $donation->refresh();
    }

    private function balance(AccountCode $code, ?int $campaignId = null): string
    {
        return app(LedgerService::class)->balanceOf($code, $campaignId)->toDecimalString();
    }

    private function spend(Campaign $campaign, string $amount): void
    {
        $merchant = Merchant::create([
            'name' => 'Apotek Sehat',
            'mcc' => '5912',
            'mid' => 'MID-CLOSE-1',
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
            'close-spend-1',
        );
    }

    public function test_an_admin_closes_a_campaign_and_refunds_the_unspent_balance(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $first = $this->settledDonation($campaign, '100000');
        $second = $this->settledDonation($campaign, '200000');

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/close")
            ->assertOk()
            ->assertJsonPath('data.status', 'refunded')
            ->assertJsonPath('data.current_amount', '0.00')
            ->assertJsonPath('refund.donor_count', 2)
            ->assertJsonPath('refund.total', '294000.00');

        $this->assertSame('refunded', $campaign->refresh()->status->value);
        $this->assertSame('refunded', $first->refresh()->status->value);
        $this->assertSame('refunded', $second->refresh()->status->value);

        $this->assertSame('0.00', $this->balance(AccountCode::CampaignRestricted, $campaign->id));
        $this->assertSame('0.00', $this->balance(AccountCode::RefundPayable));
        $this->assertSame('6000.00', $this->balance(AccountCode::PlatformCash));

        $this->assertSame('98000.00', (string) Transaction::query()
            ->where('donation_id', $first->id)
            ->where('type', 'refund')
            ->value('amount'));
        $this->assertSame('196000.00', (string) Transaction::query()
            ->where('donation_id', $second->id)
            ->where('type', 'refund')
            ->value('amount'));

        $this->assertDatabaseHas('audit_logs', ['action' => 'campaign.closed']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'campaign.refunded']);
        $this->assertSame(2, AuditLog::query()->where('action', 'refund.issued')->count());
    }

    public function test_refunds_only_the_unspent_balance_after_disbursements(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $first = $this->settledDonation($campaign, '100000');
        $second = $this->settledDonation($campaign, '200000');

        $this->spend($campaign, '50000');

        $this->assertSame('244000.00', $this->balance(AccountCode::CampaignRestricted, $campaign->id));

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/close")
            ->assertOk()
            ->assertJsonPath('refund.total', '244000.00');

        $this->assertSame('81333.33', (string) Transaction::query()
            ->where('donation_id', $first->id)
            ->where('type', 'refund')
            ->value('amount'));
        $this->assertSame('162666.67', (string) Transaction::query()
            ->where('donation_id', $second->id)
            ->where('type', 'refund')
            ->value('amount'));

        $this->assertSame('0.00', $this->balance(AccountCode::CampaignRestricted, $campaign->id));
        $this->assertSame('0.00', $this->balance(AccountCode::RefundPayable));
    }

    public function test_the_same_campaign_cannot_be_refunded_twice(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $this->settledDonation($campaign, '100000');

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/close")->assertOk();

        $refundsBefore = Transaction::query()->where('type', 'refund')->count();
        $cashBefore = $this->balance(AccountCode::PlatformCash);

        $this->postJson("/api/v1/campaigns/{$campaign->id}/close")
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CONFLICT_STATE');

        $this->assertSame($refundsBefore, Transaction::query()->where('type', 'refund')->count());
        $this->assertSame($cashBefore, $this->balance(AccountCode::PlatformCash));
    }

    public function test_only_an_admin_can_close_a_campaign(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $this->settledDonation($campaign, '100000');

        Sanctum::actingAs($campaign->campaigner);
        $this->postJson("/api/v1/campaigns/{$campaign->id}/close")
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');

        Sanctum::actingAs(User::factory()->donor()->create());
        $this->postJson("/api/v1/campaigns/{$campaign->id}/close")
            ->assertForbidden();

        $this->assertSame('active', $campaign->refresh()->status->value);
        $this->assertSame('98000.00', $this->balance(AccountCode::CampaignRestricted, $campaign->id));
        $this->assertSame(0, Transaction::query()->where('type', 'refund')->count());
    }

    public function test_a_campaign_without_funds_still_closes(): void
    {
        $campaign = Campaign::factory()->active()->create();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/close")
            ->assertOk()
            ->assertJsonPath('data.status', 'refunded')
            ->assertJsonPath('refund.donor_count', 0)
            ->assertJsonPath('refund.total', '0.00');

        $this->assertSame(0, Transaction::query()->where('type', 'refund')->count());
    }

    public function test_a_frozen_campaign_cannot_be_closed(): void
    {
        $campaign = Campaign::factory()->frozen()->create();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/close")
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CONFLICT_STATE');

        $this->assertSame('frozen', $campaign->refresh()->status->value);
    }
}
