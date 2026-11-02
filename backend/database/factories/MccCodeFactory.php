<?php

namespace Database\Factories;

use App\Models\MccCode;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MccCode>
 */
class MccCodeFactory extends Factory
{
    protected $model = MccCode::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => (string) fake()->unique()->numberBetween(1000, 9999),
            'title' => fake()->words(3, true),
            'category' => 'medical',
            'is_blocked' => false,
            'is_active' => true,
        ];
    }

    public function blocked(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_blocked' => true,
        ]);
    }
}
