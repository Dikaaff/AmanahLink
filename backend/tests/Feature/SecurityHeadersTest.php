<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_responses_include_security_headers(): void
    {
        $this->getJson('/api/v1/campaigns')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
            ->assertHeader(
                'Content-Security-Policy',
                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
            );
    }

    public function test_mutating_api_responses_are_not_cacheable(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Security Test',
            'email' => 'security@example.test',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ]);

        $response->assertCreated();
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_authenticated_get_responses_are_not_cacheable(): void
    {
        $user = User::factory()->donor()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/auth/me');

        $response->assertOk();
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }
}
