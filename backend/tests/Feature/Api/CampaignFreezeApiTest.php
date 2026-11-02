<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\MerchantStatus;
use App\Models\Campaign;
use App\Models\Merchant;
use App\Models\Transaction;
use App\Models\User;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class CampaignFreezeApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
    }

    private function merchant(): Merchant
    {
        return Merchant::create([
            'name' => 'Apotek Sehat',
            'mcc' => '5912',
            'mid' => 'MID-FREEZE-1',
            'status' => MerchantStatus::Verified,
            'city' => 'Bandung',
        ]);
    }

    public function test_an_admin_freezes_a_campaign_and_blocks_new_spending(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $captured = Transaction::factory()->captured()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
        ]);
        $merchant = $this->merchant();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/freeze", [
            'reason' => 'Dugaan penyalahgunaan dana.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'frozen')
            ->assertJsonPath('data.freeze_reason', 'Dugaan penyalahgunaan dana.');

        $this->assertSame('frozen', $campaign->refresh()->status->value);
        $this->assertNotNull($campaign->frozen_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'campaign.frozen']);

        $this->withHeader('Idempotency-Key', 'donation-after-freeze')
            ->postJson('/api/v1/donations', [
                'campaign_id' => $campaign->id,
                'amount' => 100000,
            ])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CAMPAIGN_NOT_ACTIVE');

        $this->withHeader('Idempotency-Key', 'disbursement-after-freeze')
            ->postJson('/api/v1/disbursements', [
                'campaign_id' => $campaign->id,
                'merchant_id' => $merchant->id,
                'amount' => 10000,
            ])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CAMPAIGN_NOT_ACTIVE');

        $this->assertSame('captured', $captured->refresh()->status->value);
    }

    public function test_freezing_requires_a_reason(): void
    {
        $campaign = Campaign::factory()->active()->create();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/freeze", [])
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');

        $this->assertSame('active', $campaign->refresh()->status->value);
    }

    public function test_only_an_admin_can_freeze_or_unfreeze(): void
    {
        $campaign = Campaign::factory()->active()->create();

        Sanctum::actingAs($campaign->campaigner);

        $this->postJson("/api/v1/campaigns/{$campaign->id}/freeze", [
            'reason' => 'Coba-coba.',
        ])->assertForbidden();

        $this->postJson("/api/v1/campaigns/{$campaign->id}/unfreeze")->assertForbidden();

        $this->assertSame('active', $campaign->refresh()->status->value);
    }

    public function test_a_draft_campaign_cannot_be_frozen(): void
    {
        $campaign = Campaign::factory()->create();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/freeze", [
            'reason' => 'Belum semestinya.',
        ])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CONFLICT_STATE');
    }

    public function test_unfreezing_restores_an_active_campaign_and_accepts_donations(): void
    {
        $campaign = Campaign::factory()->active()->create();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/freeze", [
            'reason' => 'Pemeriksaan sementara.',
        ])->assertOk();

        $this->postJson("/api/v1/campaigns/{$campaign->id}/unfreeze")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertNull($campaign->refresh()->frozen_at);
        $this->assertNull($campaign->freeze_reason);
        $this->assertDatabaseHas('audit_logs', ['action' => 'campaign.unfrozen']);

        Sanctum::actingAs(User::factory()->donor()->create());

        $this->withHeader('Idempotency-Key', 'donation-after-unfreeze')
            ->postJson('/api/v1/donations', [
                'campaign_id' => $campaign->id,
                'amount' => 100000,
            ])
            ->assertCreated();
    }

    public function test_unfreezing_a_funded_campaign_returns_to_funded(): void
    {
        $campaign = Campaign::factory()->active()->create([
            'current_amount' => '11000000.00',
        ]);

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/freeze", [
            'reason' => 'Pemeriksaan sementara.',
        ])->assertOk();

        $this->postJson("/api/v1/campaigns/{$campaign->id}/unfreeze")
            ->assertOk()
            ->assertJsonPath('data.status', 'funded');
    }
}
