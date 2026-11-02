<?php

namespace Database\Factories;

use App\Enums\WebhookStatus;
use App\Models\WebhookEvent;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<WebhookEvent>
 */
class WebhookEventFactory extends Factory
{
    protected $model = WebhookEvent::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'provider' => 'midtrans',
            'external_id' => 'WH-'.Str::upper(Str::random(16)),
            'payload' => ['transaction_status' => 'settlement'],
            'status' => WebhookStatus::Received,
            'attempts' => 0,
        ];
    }
}
