<?php

namespace Database\Factories;

use App\Enums\CampaignStatus;
use App\Models\Campaign;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Campaign>
 */
class CampaignFactory extends Factory
{
    protected $model = Campaign::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->campaigner(),
            'title' => 'Bantu '.fake()->words(3, true),
            'slug' => Str::slug(fake()->unique()->words(4, true)).'-'.fake()->unique()->numerify('####'),
            'description' => fake()->paragraph(),
            'target_amount' => 10_000_000,
            'current_amount' => 0,
            'allowed_mcc_array' => ['5912', '8062'],
            'status' => CampaignStatus::Draft,
            'deadline_at' => now()->addDays(30),
        ];
    }

    public function pendingReview(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CampaignStatus::PendingReview,
        ]);
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CampaignStatus::Active,
            'reviewed_at' => now(),
        ]);
    }

    public function frozen(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CampaignStatus::Frozen,
        ]);
    }
}
