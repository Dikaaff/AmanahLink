<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Transaction
 */
final class DisbursementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference_id' => $this->reference_id,
            'amount' => $this->amount,
            'status' => $this->status->value,
            'mcc_used' => $this->mcc_used,
            'campaign' => $this->whenLoaded('campaign', fn (): array => [
                'id' => $this->campaign->id,
                'title' => $this->campaign->title,
            ]),
            'merchant' => $this->whenLoaded('merchant', fn (): array => [
                'id' => $this->merchant->id,
                'name' => $this->merchant->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
