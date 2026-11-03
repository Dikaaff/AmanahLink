<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

final class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_configured_frontend_origin_can_preflight_the_api(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'http://127.0.0.1:3104',
            'Access-Control-Request-Method' => 'GET',
            'Access-Control-Request-Headers' => 'Authorization, Content-Type',
        ])->options('/api/v1/campaigns');

        $response->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3104')
            ->assertHeader('Access-Control-Allow-Methods')
            ->assertHeader('Access-Control-Allow-Headers');
    }

    public function test_unconfigured_origin_does_not_receive_cors_access(): void
    {
        $response = $this->withHeader('Origin', 'https://attacker.example')
            ->getJson('/api/v1/campaigns');

        $response->assertOk();
        $this->assertNull($response->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_registration_has_a_named_per_ip_rate_limit(): void
    {
        Notification::fake();
        $ip = '198.51.100.20';
        RateLimiter::clear('auth.register:'.$ip);

        for ($attempt = 1; $attempt <= 10; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => $ip])
                ->postJson('/api/v1/auth/register', [
                    'name' => 'Rate Limit Test',
                    'email' => "rate-{$attempt}@example.test",
                    'password' => 'rahasia123',
                    'password_confirmation' => 'rahasia123',
                ])
                ->assertCreated();
        }

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson('/api/v1/auth/register', [
                'name' => 'Rate Limit Blocked',
                'email' => 'rate-blocked@example.test',
                'password' => 'rahasia123',
                'password_confirmation' => 'rahasia123',
            ])
            ->assertTooManyRequests()
            ->assertJsonPath('error.code', 'RATE_LIMITED')
            ->assertHeader('Retry-After');
    }
}
