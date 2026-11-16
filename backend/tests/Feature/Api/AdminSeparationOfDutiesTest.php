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
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * P8 — maker-checker at the API boundary.
 *
 * The admin moderates campaigns, receipts, merchants, users, and platform
 * operations. It must never create a campaign, donate, start a disbursement, or
 * upload the receipt it later reviews (docs/design/P8-admin-management.md §1).
 */
final class AdminSeparationOfDutiesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
    }

    /**
     * @return array<string, mixed>
     */
    private function campaignPayload(): array
    {
        return [
            'title' => 'Bantu Pendidikan Anak Yatim',
            'description' => 'Dana dipakai untuk biaya sekolah, seragam, dan buku anak yatim di panti asuhan.',
            'target_amount' => '1000000',
            'deadline_at' => now()->addMonth()->toIso8601String(),
            'allowed_mcc_array' => ['5912'],
        ];
    }

    public function test_an_admin_cannot_create_a_campaign(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson('/api/v1/campaigns', $this->campaignPayload())
            ->assertForbidden();
    }

    public function test_an_admin_cannot_edit_the_campaign_it_reviews(): void
    {
        $campaign = Campaign::factory()->pendingReview()->create();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->putJson("/api/v1/campaigns/{$campaign->id}", [
            'title' => 'Judul yang diubah admin',
        ])->assertForbidden();
    }

    public function test_an_admin_cannot_donate(): void
    {
        $campaign = Campaign::factory()->active()->create();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->withHeader('Idempotency-Key', 'admin-donation-1')
            ->postJson('/api/v1/donations', [
                'campaign_id' => $campaign->id,
                'amount' => '100000',
            ])
            ->assertForbidden();
    }

    public function test_an_admin_cannot_start_or_preview_a_disbursement(): void
    {
        $campaign = Campaign::factory()->active()->create();

        $merchant = Merchant::create([
            'name' => 'Apotek Sehat',
            'mcc' => '5912',
            'mid' => 'MID-ADMIN-SOD-1',
            'status' => MerchantStatus::Verified,
            'city' => 'Bandung',
        ]);

        Sanctum::actingAs(User::factory()->admin()->create());

        $payload = [
            'campaign_id' => $campaign->id,
            'merchant_id' => $merchant->id,
            'amount' => '10000',
        ];

        $this->withHeader('Idempotency-Key', 'admin-disbursement-1')
            ->postJson('/api/v1/disbursements', $payload)
            ->assertForbidden();

        $this->postJson('/api/v1/disbursements/simulate', $payload)
            ->assertForbidden();

        $this->postJson('/api/v1/disbursements/scan', [
            'campaign_id' => $campaign->id,
            'amount' => '10000',
            'qr' => 'AMANAH-QR-ANY',
        ])->assertForbidden();
    }

    public function test_an_admin_cannot_upload_the_receipt_it_reviews(): void
    {
        $campaign = Campaign::factory()->active()->create();

        $transaction = Transaction::factory()->captured()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'amount' => '10000',
        ]);

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->post("/api/v1/disbursements/{$transaction->id}/receipts", [
            'file' => UploadedFile::fake()->image('nota.jpg'),
        ])->assertForbidden();
    }

    public function test_a_campaigner_keeps_its_own_paths(): void
    {
        $campaigner = User::factory()->campaigner()->create();

        Sanctum::actingAs($campaigner);

        $this->postJson('/api/v1/campaigns', $this->campaignPayload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft');
    }

    public function test_an_admin_keeps_oversight_without_becoming_a_party(): void
    {
        $campaign = Campaign::factory()->active()->create();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/v1/disbursements')->assertOk();

        $this->postJson("/api/v1/campaigns/{$campaign->id}/freeze", [
            'reason' => 'Laporan penyalahgunaan dana sedang ditelusuri.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'frozen');
    }
}
