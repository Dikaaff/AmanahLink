<?php

namespace Database\Factories;

use App\Enums\MerchantStatus;
use App\Models\MccCode;
use App\Models\Merchant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Merchant>
 */
class MerchantFactory extends Factory
{
    protected $model = Merchant::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'mcc' => fn () => MccCode::factory()->create()->code,
            'mid' => 'MID'.Str::upper(Str::random(12)),
            'status' => MerchantStatus::Verified,
            'city' => 'Jakarta',
            'verified_at' => now(),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => MerchantStatus::Pending,
            'verified_at' => null,
            'verified_by' => null,
        ]);
    }

    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => MerchantStatus::Suspended,
        ]);
    }
}
