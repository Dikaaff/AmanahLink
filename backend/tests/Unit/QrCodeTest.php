<?php

namespace Tests\Unit;

use App\Support\Payment\QrCode;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class QrCodeTest extends TestCase
{
    private const MAX_BYTES = 213;

    public function test_it_renders_a_qr_as_an_svg_data_uri(): void
    {
        $dataUri = QrCode::svgDataUri('https://sandbox.fake.amanahlink.test/pay/PAY-01');

        $this->assertStringStartsWith('data:image/svg+xml;base64,', $dataUri);

        $svg = base64_decode(substr($dataUri, strlen('data:image/svg+xml;base64,')), true);

        $this->assertIsString($svg);
        $this->assertStringContainsString('<svg', $svg);
        $this->assertStringContainsString('shape-rendering="crispEdges"', $svg);
        $this->assertMatchesRegularExpression('/width="\d+" height="\d+"/', $svg);
    }

    public function test_the_same_payload_always_renders_the_same_symbol(): void
    {
        $payload = 'https://sandbox.fake.amanahlink.test/pay/PAY-01M7FT1W0Z5W47D75SC1ZMWW9T';

        $this->assertSame(QrCode::svgDataUri($payload), QrCode::svgDataUri($payload));
    }

    public function test_different_payloads_render_different_symbols(): void
    {
        $this->assertNotSame(
            QrCode::svgDataUri('PAY-0001'),
            QrCode::svgDataUri('PAY-0002'),
        );
    }

    public function test_it_picks_the_smallest_version_that_fits_the_payload(): void
    {
        $this->assertSame(21, $this->moduleCount('a'));
        $this->assertSame(37, $this->moduleCount(str_repeat('a', 71)));
        $this->assertSame(57, $this->moduleCount(str_repeat('a', self::MAX_BYTES)));
    }

    public function test_it_rejects_an_empty_payload(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new QrCode('');
    }

    public function test_it_rejects_a_payload_beyond_the_supported_capacity(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new QrCode(str_repeat('a', self::MAX_BYTES + 1));
    }

    private function moduleCount(string $payload): int
    {
        $svg = (new QrCode($payload))->svg(scale: 1, quietZone: 0);

        preg_match('/width="(\d+)"/', $svg, $matches);

        return (int) $matches[1];
    }
}
