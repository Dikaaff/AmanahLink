<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\WebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WebhookEvent
 */
final class WebhookEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'provider' => $this->provider,
            'external_id' => $this->external_id,
            'status' => $this->status->value,
            'attempts' => $this->attempts,
            'last_error' => $this->last_error,
            'next_attempt_at' => $this->next_attempt_at?->toIso8601String(),
            'dead_lettered_at' => $this->dead_lettered_at?->toIso8601String(),
            'processed_at' => $this->processed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
