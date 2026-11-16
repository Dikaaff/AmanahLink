<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\MerchantStatus;
use App\Models\Merchant;
use App\Support\MerchantQr;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class MerchantQrTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
    }

    private function qr(): MerchantQr
    {
        return app(MerchantQr::class);
    }

    public function test_a_payload_round_trips_to_its_merchant(): void
    {
        $merchant = Merchant::factory()->create(['mcc' => '5912']);

        $payload = $this->qr()->payload($merchant);

        $this->assertStringStartsWith('AMANAH:MERCHANT:', $payload);
        $this->assertSame($merchant->id, $this->qr()->resolve($payload)?->id);
    }

    public function test_the_payload_is_deterministic(): void
    {
        $merchant = Merchant::factory()->create(['mcc' => '5912']);

        $this->assertSame(
            $this->qr()->payload($merchant),
            $this->qr()->payload($merchant->refresh()),
        );
    }

    public function test_a_tampered_signature_does_not_resolve(): void
    {
        $merchant = Merchant::factory()->create(['mcc' => '5912']);
        $payload = $this->qr()->payload($merchant);

        $tampered = substr($payload, 0, -1).(str_ends_with($payload, 'A') ? 'B' : 'A');

        $this->assertNull($this->qr()->resolve($tampered));
    }

    public function test_editing_the_mcc_inside_the_payload_does_not_resolve(): void
    {
        $merchant = Merchant::factory()->create(['mcc' => '5912']);
        $payload = $this->qr()->payload($merchant);

        $forged = str_replace(':5912:', ':8062:', $payload);

        $this->assertNotSame($payload, $forged);
        $this->assertNull($this->qr()->resolve($forged));
    }

    public function test_a_payload_for_an_unverified_merchant_does_not_resolve(): void
    {
        $merchant = Merchant::factory()->pending()->create(['mcc' => '5912']);
        $payload = $this->qr()->payload($merchant);

        $this->assertNull($this->qr()->resolve($payload));
    }

    public function test_a_payload_goes_stale_when_the_merchant_mcc_changes(): void
    {
        $merchant = Merchant::factory()->create(['mcc' => '5912']);
        $payload = $this->qr()->payload($merchant);

        $merchant->forceFill(['mcc' => '8062'])->save();

        $this->assertNull($this->qr()->resolve($payload));
    }

    public function test_a_payload_goes_stale_when_the_merchant_is_suspended(): void
    {
        $merchant = Merchant::factory()->create(['mcc' => '5912']);
        $payload = $this->qr()->payload($merchant);

        $merchant->forceFill(['status' => MerchantStatus::Suspended])->save();

        $this->assertNull($this->qr()->resolve($payload));
    }

    public function test_malformed_payloads_do_not_resolve(): void
    {
        foreach (['', 'AMANAH:MERCHANT:', 'AMANAH:MERCHANT:abc', 'AMANAH:MERCHANT:1:5912', 'https://example.test'] as $payload) {
            $this->assertNull($this->qr()->resolve($payload), "Payload should not resolve: {$payload}");
        }
    }

    public function test_the_image_is_an_embedded_svg(): void
    {
        $merchant = Merchant::factory()->create(['mcc' => '5912']);

        $this->assertStringStartsWith(
            'data:image/svg+xml;base64,',
            $this->qr()->image($merchant),
        );
    }
}
