<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\DonationStatus;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\User;
use App\Notifications\DonationSettled;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DonationSimulationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_donor_can_settle_with_the_offline_driver_and_both_sides_are_notified(): void
    {
        config(['amanahlink.payment_driver' => 'fake']);

        $campaigner = User::factory()->campaigner()->create();
        $campaign = Campaign::factory()->active()->create([
            'user_id' => $campaigner->id,
            'target_amount' => '1000000.00',
            'current_amount' => '0.00',
        ]);
        $donor = User::factory()->donor()->create();

        $donation = Donation::create([
            'campaign_id' => $campaign->id,
            'donor_id' => $donor->id,
            'amount' => '100000.00',
            'payment_ref' => 'PAY-DEMO-SIMULATE',
            'status' => DonationStatus::Initiated,
            'expires_at' => now()->addDay(),
        ]);

        Sanctum::actingAs($donor);

        $this->postJson("/api/v1/donations/{$donation->id}/simulate-payment")
            ->assertOk()
            ->assertJsonPath('data.donation.status', 'settled')
            ->assertJsonPath('data.campaign.current_amount', '98000.00');

        $this->assertDatabaseHas('donations', [
            'id' => $donation->id,
            'status' => 'settled',
        ]);
        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'current_amount' => '98000.00',
        ]);
        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $donor->id,
            'type' => DonationSettled::class,
        ]);
        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $campaigner->id,
            'type' => DonationSettled::class,
        ]);

        $this->postJson("/api/v1/donations/{$donation->id}/simulate-payment")
            ->assertOk()
            ->assertJsonPath('data.campaign.current_amount', '98000.00');
    }

    public function test_only_the_donor_owner_can_simulate_a_payment(): void
    {
        config(['amanahlink.payment_driver' => 'fake']);

        $campaign = Campaign::factory()->active()->create();
        $donor = User::factory()->donor()->create();
        $other = User::factory()->donor()->create();

        $donation = Donation::create([
            'campaign_id' => $campaign->id,
            'donor_id' => $donor->id,
            'amount' => '50000.00',
            'payment_ref' => 'PAY-DEMO-OTHER',
            'status' => DonationStatus::Initiated,
            'expires_at' => now()->addDay(),
        ]);

        Sanctum::actingAs($other);

        $this->postJson("/api/v1/donations/{$donation->id}/simulate-payment")
            ->assertForbidden();
    }

    public function test_the_shortcut_is_hidden_when_the_real_driver_is_active(): void
    {
        config(['amanahlink.payment_driver' => 'fake']);
        $this->app['env'] = 'production';

        $campaign = Campaign::factory()->active()->create();
        $donor = User::factory()->donor()->create();

        $donation = Donation::create([
            'campaign_id' => $campaign->id,
            'donor_id' => $donor->id,
            'amount' => '50000.00',
            'payment_ref' => 'PAY-REAL-DRIVER',
            'status' => DonationStatus::Initiated,
            'expires_at' => now()->addDay(),
        ]);

        Sanctum::actingAs($donor);

        $this->postJson("/api/v1/donations/{$donation->id}/simulate-payment")
            ->assertNotFound();
    }
}
