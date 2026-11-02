<?php

namespace Database\Factories;

use App\Enums\DonationStatus;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Donation>
 */
class DonationFactory extends Factory
{
    protected $model = Donation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'campaign_id' => Campaign::factory()->active(),
            'donor_id' => User::factory()->donor(),
            'amount' => 100_000,
            'payment_ref' => 'PAY-'.Str::upper(Str::random(12)),
            'status' => DonationStatus::Initiated,
            'expires_at' => now()->addHours(24),
        ];
    }

    public function settled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => DonationStatus::Settled,
            'settled_at' => now(),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => DonationStatus::Failed,
            'failure_reason' => 'insufficient_balance',
        ]);
    }
}
