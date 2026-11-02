<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

final class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_register_and_receives_a_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Siti Aminah',
            'email' => 'siti@example.test',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.role', 'donor')
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'name', 'email', 'role']]]);

        $this->assertNotEmpty($response->json('data.token'));
        $this->assertDatabaseHas('users', [
            'email' => 'siti@example.test',
            'role' => 'donor',
        ]);
    }

    public function test_registration_cannot_escalate_role(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Penyusup',
            'email' => 'penyusup@example.test',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
            'role' => 'admin',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'penyusup@example.test',
            'role' => 'donor',
        ]);
    }

    public function test_login_with_wrong_password_returns_401_envelope(): void
    {
        User::factory()->donor()->create([
            'email' => 'donor@example.test',
            'password' => 'rahasia123',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'donor@example.test',
            'password' => 'salah-total',
        ]);

        $response->assertUnauthorized()
            ->assertJsonPath('error.code', 'UNAUTHENTICATED')
            ->assertJsonStructure(['error' => ['code', 'message', 'details', 'trace_id']]);

        $this->assertNotEmpty($response->json('error.trace_id'));
    }

    public function test_login_is_rate_limited_after_five_failures(): void
    {
        User::factory()->donor()->create([
            'email' => 'bruteforce@example.test',
            'password' => 'rahasia123',
        ]);

        RateLimiter::clear('login:bruteforce@example.test|127.0.0.1');

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'bruteforce@example.test',
                'password' => 'salah',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'bruteforce@example.test',
            'password' => 'salah',
        ])->assertStatus(429)
            ->assertJsonPath('error.code', 'RATE_LIMITED')
            ->assertHeader('Retry-After');
    }

    public function test_me_requires_a_valid_token(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $user = User::factory()->donor()->create();
        $token = $user->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout')
            ->assertNoContent();

        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
    }

    public function test_every_response_carries_a_request_id(): void
    {
        $response = $this->getJson('/api/v1/campaigns');

        $response->assertOk()->assertHeader('X-Request-Id');
    }

    public function test_an_incoming_request_id_is_echoed_back(): void
    {
        $this->withHeader('X-Request-Id', 'trace-abc-123')
            ->getJson('/api/v1/campaigns')
            ->assertHeader('X-Request-Id', 'trace-abc-123');
    }
}
