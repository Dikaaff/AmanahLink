<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class HealthCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_healthz_reports_that_the_api_process_is_alive(): void
    {
        $this->getJson('/healthz')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks', [])
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonStructure(['status', 'checks', 'timestamp']);
    }

    public function test_readyz_reports_database_queue_and_fake_ocr_as_ready(): void
    {
        config(['amanahlink.ocr_driver' => 'fake']);

        $this->getJson('/readyz')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks.database.status', 'ok')
            ->assertJsonPath('checks.queue.status', 'ok')
            ->assertJsonPath('checks.ocr.status', 'ok')
            ->assertJsonPath('checks.ocr.driver', 'fake');
    }

    public function test_readyz_returns_service_unavailable_when_ocr_is_unreachable(): void
    {
        config([
            'amanahlink.ocr_driver' => 'http',
            'amanahlink.ocr_service_url' => 'http://ocr.test',
        ]);
        Http::fake([
            'http://ocr.test/healthz' => Http::response(['status' => 'down'], 503),
        ]);

        $this->getJson('/readyz')
            ->assertStatus(503)
            ->assertJsonPath('status', 'unavailable')
            ->assertJsonPath('checks.database.status', 'ok')
            ->assertJsonPath('checks.queue.status', 'ok')
            ->assertJsonPath('checks.ocr.status', 'failed')
            ->assertJsonMissingPath('checks.ocr.message');
    }

    public function test_readyz_returns_service_unavailable_when_queue_driver_is_invalid(): void
    {
        config(['queue.default' => 'missing']);

        $this->getJson('/readyz')
            ->assertStatus(503)
            ->assertJsonPath('status', 'unavailable')
            ->assertJsonPath('checks.database.status', 'ok')
            ->assertJsonPath('checks.queue.status', 'failed')
            ->assertJsonPath('checks.queue.driver', 'missing')
            ->assertJsonPath('checks.ocr.status', 'ok');
    }
}
