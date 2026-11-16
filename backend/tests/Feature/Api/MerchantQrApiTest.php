<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Merchant;
use App\Models\User;
use App\Support\MerchantQr;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class MerchantQrApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
    }

    public function test_a_campaigner_can_fetch_a_verified_merchant_qr(): void
    {
        $merchant = Merchant::factory()->create(['mcc' => '5912']);

        Sanctum::actingAs(User::factory()->campaigner()->create());

        $response = $this->getJson("/api/v1/merchants/{$merchant->id}/qr");

        $response->assertOk()
            ->assertJsonPath('data.merchant.id', $merchant->id)
            ->assertJsonPath('data.merchant.mcc', '5912')
            ->assertJsonPath('data.merchant.mcc_title', 'Apotek dan Toko Obat');

        $payload = (string) $response->json('data.qr.payload');

        $this->assertSame($payload, app(MerchantQr::class)->payload($merchant));
        $this->assertStringStartsWith('data:image/svg+xml;base64,', (string) $response->json('data.qr.image'));
    }

    public function test_an_unverified_merchant_has_no_qr_yet(): void
    {
        $merchant = Merchant::factory()->pending()->create(['mcc' => '5912']);

        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->getJson("/api/v1/merchants/{$merchant->id}/qr")
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['details' => ['fields' => ['merchant']]]]);
    }

    public function test_the_qr_sheet_lists_only_verified_merchants(): void
    {
        $verified = Merchant::factory()->create([
            'name' => 'Apotek Sehat Sentosa',
            'mcc' => '5912',
        ]);
        Merchant::factory()->pending()->create([
            'name' => 'Toko Menunggu',
            'mcc' => '5912',
        ]);

        Sanctum::actingAs(User::factory()->campaigner()->create());

        $response = $this->getJson('/api/v1/merchants/qr-sheet');

        $response->assertOk();

        $this->assertCount(1, $response->json('data'));
        $response->assertJsonPath('data.0.merchant.id', $verified->id);
        $response->assertJsonPath(
            'data.0.qr.payload',
            app(MerchantQr::class)->payload($verified),
        );
        $this->assertStringStartsWith(
            'data:image/svg+xml;base64,',
            (string) $response->json('data.0.qr.image'),
        );
    }

    public function test_a_donor_cannot_fetch_a_merchant_qr(): void
    {
        $merchant = Merchant::factory()->create(['mcc' => '5912']);

        Sanctum::actingAs(User::factory()->donor()->create());

        $this->getJson("/api/v1/merchants/{$merchant->id}/qr")->assertForbidden();
    }

    public function test_a_guest_cannot_fetch_a_merchant_qr(): void
    {
        $merchant = Merchant::factory()->create(['mcc' => '5912']);

        $this->getJson("/api/v1/merchants/{$merchant->id}/qr")->assertUnauthorized();
    }
}
