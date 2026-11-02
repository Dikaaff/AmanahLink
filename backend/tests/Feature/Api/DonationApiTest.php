<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\CampaignStatus;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DonationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_donating_requires_authentication(): void
    {
        $campaign = Campaign::factory()->active()->create();

        $this->postJson('/api/v1/donations', [
            'campaign_id' => $campaign->id,
            'amount' => 100000,
        ])->assertUnauthorized();
    }

    public function test_an_idempotency_key_header_is_required(): void
    {
        $campaign = Campaign::factory()->active()->create();
        Sanctum::actingAs(User::factory()->donor()->create());

        $this->postJson('/api/v1/donations', [
            'campaign_id' => $campaign->id,
            'amount' => 100000,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_ERROR')
            ->assertJsonStructure(['error' => ['details' => ['fields' => ['idempotency_key']]]]);
    }

    public function test_a_donor_receives_payment_instructions(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $donor = User::factory()->donor()->create();
        Sanctum::actingAs($donor);

        $response = $this->withHeader('Idempotency-Key', 'donation-key-001')
            ->postJson('/api/v1/donations', [
                'campaign_id' => $campaign->id,
                'amount' => 100000,
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.donation.status', 'initiated')
            ->assertJsonPath('data.donation.amount', '100000.00')
            ->assertJsonPath('meta.replayed', false)
            ->assertJsonStructure([
                'data' => [
                    'donation' => ['id', 'payment_ref', 'expires_at'],
                    'payment' => ['provider', 'payment_ref', 'payment_url', 'va_number', 'expires_at'],
                ],
            ]);

        $this->assertStringStartsWith('8808', $response->json('data.payment.va_number'));
        $this->assertDatabaseHas('donations', [
            'campaign_id' => $campaign->id,
            'donor_id' => $donor->id,
            'amount' => '100000.00',
            'status' => 'initiated',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'donation.initiated']);
    }

    public function test_replaying_the_same_key_returns_the_same_donation(): void
    {
        $campaign = Campaign::factory()->active()->create();
        Sanctum::actingAs(User::factory()->donor()->create());

        $payload = [
            'campaign_id' => $campaign->id,
            'amount' => 100000,
        ];

        $first = $this->withHeader('Idempotency-Key', 'donation-key-002')
            ->postJson('/api/v1/donations', $payload)
            ->assertCreated();

        $second = $this->withHeader('Idempotency-Key', 'donation-key-002')
            ->postJson('/api/v1/donations', $payload)
            ->assertOk()
            ->assertJsonPath('meta.replayed', true);

        $this->assertSame(
            $first->json('data.donation.payment_ref'),
            $second->json('data.donation.payment_ref'),
        );
        $this->assertSame(
            $first->json('data.payment.va_number'),
            $second->json('data.payment.va_number'),
        );
        $this->assertSame(1, Donation::query()->count());
    }

    public function test_the_same_key_with_a_different_amount_is_rejected(): void
    {
        $campaign = Campaign::factory()->active()->create();
        Sanctum::actingAs(User::factory()->donor()->create());

        $this->withHeader('Idempotency-Key', 'donation-key-003')
            ->postJson('/api/v1/donations', [
                'campaign_id' => $campaign->id,
                'amount' => 100000,
            ])->assertCreated();

        $this->withHeader('Idempotency-Key', 'donation-key-003')
            ->postJson('/api/v1/donations', [
                'campaign_id' => $campaign->id,
                'amount' => 200000,
            ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'IDEMPOTENCY_MISMATCH');

        $this->assertSame(1, Donation::query()->count());
    }

    public function test_the_minimum_donation_amount_is_enforced(): void
    {
        $campaign = Campaign::factory()->active()->create();
        Sanctum::actingAs(User::factory()->donor()->create());

        $this->withHeader('Idempotency-Key', 'donation-key-004')
            ->postJson('/api/v1/donations', [
                'campaign_id' => $campaign->id,
                'amount' => 5000,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_a_draft_campaign_cannot_receive_donations(): void
    {
        $campaign = Campaign::factory()->create();
        Sanctum::actingAs(User::factory()->donor()->create());

        $this->withHeader('Idempotency-Key', 'donation-key-005')
            ->postJson('/api/v1/donations', [
                'campaign_id' => $campaign->id,
                'amount' => 100000,
            ])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CAMPAIGN_NOT_ACTIVE');
    }

    public function test_a_frozen_campaign_cannot_receive_donations(): void
    {
        $campaign = Campaign::factory()->create(['status' => CampaignStatus::Frozen]);
        Sanctum::actingAs(User::factory()->donor()->create());

        $this->withHeader('Idempotency-Key', 'donation-key-006')
            ->postJson('/api/v1/donations', [
                'campaign_id' => $campaign->id,
                'amount' => 100000,
            ])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CAMPAIGN_NOT_ACTIVE')
            ->assertJsonPath('error.message', 'Kampanye sedang dibekukan.');
    }

    public function test_a_campaign_past_its_deadline_cannot_receive_donations(): void
    {
        $campaign = Campaign::factory()->active()->create([
            'deadline_at' => now()->subHour(),
        ]);
        Sanctum::actingAs(User::factory()->donor()->create());

        $this->withHeader('Idempotency-Key', 'donation-key-007')
            ->postJson('/api/v1/donations', [
                'campaign_id' => $campaign->id,
                'amount' => 100000,
            ])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CAMPAIGN_NOT_ACTIVE');
    }

    public function test_a_donor_only_sees_their_own_donations(): void
    {
        $donor = User::factory()->donor()->create();
        Donation::factory()->count(2)->create(['donor_id' => $donor->id]);
        Donation::factory()->create();

        Sanctum::actingAs($donor);

        $response = $this->getJson('/api/v1/donations')->assertOk();

        $this->assertCount(2, $response->json('data'));
    }
}
