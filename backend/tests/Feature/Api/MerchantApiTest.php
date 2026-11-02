<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\MerchantStatus;
use App\Models\AuditLog;
use App\Models\Merchant;
use App\Models\User;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class MerchantApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Apotek Sehat',
            'mcc' => '5912',
            'mid' => 'MID-APOTEK-01',
            'city' => 'Bandung',
        ], $overrides);
    }

    public function test_an_admin_can_register_a_merchant_as_pending(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson('/api/v1/merchants', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.status_label', 'Menunggu Verifikasi')
            ->assertJsonPath('data.mcc_title', 'Apotek dan Toko Obat')
            ->assertJsonPath('data.category', 'medical')
            ->assertJsonPath('data.mid', 'MID-APOTEK-01');

        $this->assertDatabaseHas('merchants', [
            'mid' => 'MID-APOTEK-01',
            'status' => MerchantStatus::Pending->value,
        ]);

        $this->assertDatabaseHas('audit_logs', ['action' => 'merchant.created']);
    }

    public function test_an_admin_can_verify_a_merchant(): void
    {
        $admin = User::factory()->admin()->create();
        $merchant = Merchant::factory()->pending()->create(['mcc' => '5912']);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/merchants/{$merchant->id}/verify")
            ->assertOk()
            ->assertJsonPath('data.status', 'verified');

        $merchant->refresh();

        $this->assertSame(MerchantStatus::Verified, $merchant->status);
        $this->assertNotNull($merchant->verified_at);
        $this->assertSame($admin->id, $merchant->verified_by);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'merchant.verified',
            'subject_id' => $merchant->id,
        ]);
    }

    public function test_verifying_twice_is_idempotent_and_does_not_duplicate_audit_rows(): void
    {
        $merchant = Merchant::factory()->pending()->create(['mcc' => '5912']);

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->patchJson("/api/v1/merchants/{$merchant->id}/verify")->assertOk();
        $this->patchJson("/api/v1/merchants/{$merchant->id}/verify")->assertOk();

        $this->assertSame(1, AuditLog::query()->where('action', 'merchant.verified')->count());
    }

    public function test_a_campaigner_sees_only_verified_merchants_without_internal_fields(): void
    {
        Merchant::factory()->create(['mcc' => '5912', 'name' => 'Apotek Terverifikasi']);
        Merchant::factory()->pending()->create(['mcc' => '8062', 'name' => 'Rumah Sakit Pending']);

        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->getJson('/api/v1/merchants')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Apotek Terverifikasi')
            ->assertJsonPath('data.0.status', 'verified')
            ->assertJsonMissingPath('data.0.mid')
            ->assertJsonMissingPath('data.0.verified_at');
    }

    public function test_an_admin_sees_pending_merchants_and_internal_fields(): void
    {
        Merchant::factory()->pending()->create(['mcc' => '8062', 'mid' => 'MID-RS-01']);

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/v1/merchants?status=pending')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.mid', 'MID-RS-01')
            ->assertJsonPath('data.0.status', 'pending');
    }

    public function test_a_campaigner_cannot_register_a_merchant(): void
    {
        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->postJson('/api/v1/merchants', $this->payload())
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_a_donor_cannot_list_merchants(): void
    {
        Sanctum::actingAs(User::factory()->donor()->create());

        $this->getJson('/api/v1/merchants')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_a_duplicate_mid_is_rejected(): void
    {
        Merchant::factory()->create(['mid' => 'MID-SAMA']);

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson('/api/v1/merchants', $this->payload(['mid' => 'MID-SAMA']))
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_ERROR')
            ->assertJsonPath('error.details.fields.mid.0', 'Merchant ID sudah dipakai merchant lain.');
    }

    public function test_a_blocked_mcc_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson('/api/v1/merchants', $this->payload(['mcc' => '5732']))
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_ERROR')
            ->assertJsonPath('error.details.fields.mcc.0', 'Kode MCC tidak terdaftar atau diblokir platform.');
    }

    public function test_an_admin_can_suspend_a_merchant_and_clear_verification_stamp(): void
    {
        $merchant = Merchant::factory()->create(['mcc' => '5912']);

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->putJson("/api/v1/merchants/{$merchant->id}", ['status' => 'suspended'])
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended');

        $merchant->refresh();

        $this->assertSame(MerchantStatus::Suspended, $merchant->status);
        $this->assertNull($merchant->verified_at);
        $this->assertNull($merchant->verified_by);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'merchant.updated',
            'subject_id' => $merchant->id,
        ]);
    }
}
