<?php

namespace Database\Factories;

use App\Models\IdempotencyKey;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<IdempotencyKey>
 */
class IdempotencyKeyFactory extends Factory
{
    protected $model = IdempotencyKey::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'key' => (string) Str::uuid(),
            'request_hash' => hash('sha256', Str::random(32)),
            'response_status' => null,
            'response_body' => null,
            'locked_until' => null,
            'expires_at' => now()->addDay(),
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'response_status' => 200,
            'response_body' => ['ok' => true],
        ]);
    }
}
