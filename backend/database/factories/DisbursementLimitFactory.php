<?php

namespace Database\Factories;

use App\Models\Campaign;
use App\Models\DisbursementLimit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DisbursementLimit>
 */
class DisbursementLimitFactory extends Factory
{
    protected $model = DisbursementLimit::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'campaign_id' => Campaign::factory()->active(),
            'daily_limit' => 5_000_000,
            'monthly_limit' => 50_000_000,
            'used_today' => 0,
            'used_this_month' => 0,
            'daily_window' => now()->toDateString(),
            'monthly_window' => now()->format('Y-m'),
            'expires_at' => now()->addDays(30),
        ];
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'expires_at' => now()->subDay(),
        ]);
    }
}
