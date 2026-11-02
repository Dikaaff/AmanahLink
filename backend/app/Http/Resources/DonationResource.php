<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Donation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Donation
 */
final class DonationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'amount' => $this->amount,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'payment_ref' => $this->when(
                $request->user()?->getKey() === $this->donor_id,
                $this->payment_ref,
            ),
            'campaign' => $this->whenLoaded('campaign', fn (): array => [
                'id' => $this->campaign->id,
                'title' => $this->campaign->title,
                'slug' => $this->campaign->slug,
            ]),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'settled_at' => $this->settled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
