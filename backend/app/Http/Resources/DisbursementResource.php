<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Transaction
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
            'status_label' => $this->status->label(),
            'mcc_used' => $this->mcc_used,
            'campaign' => $this->whenLoaded('campaign', fn (): array => [
                'id' => $this->campaign->id,
                'title' => $this->campaign->title,
                'slug' => $this->campaign->slug,
            ]),
            'merchant' => $this->whenLoaded('merchant', fn (): array => [
                'id' => $this->merchant->id,
                'name' => $this->merchant->name,
            ]),
            'receipt' => $this->when(
                $this->relationLoaded('receipt'),
                fn (): ?array => $this->receipt === null ? null : [
                    'id' => $this->receipt->id,
                    'status' => $this->receipt->status->value,
                    'status_label' => $this->receipt->status->label(),
                    'confidence' => $this->receipt->confidence,
                    'rejection_reason' => $this->receipt->rejection_reason,
                    'reviewed_at' => $this->receipt->reviewed_at?->toIso8601String(),
                    'created_at' => $this->receipt->created_at?->toIso8601String(),
                ],
            ),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
