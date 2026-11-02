<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\CampaignStatus;
use App\Models\Campaign;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Campaign
 */
final class CampaignResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'target_amount' => $this->target_amount,
            'current_amount' => $this->current_amount,
            'progress_percent' => Money::of($this->current_amount)
                ->percentageOf(Money::of($this->target_amount)),
            'allowed_mcc' => $this->allowed_mcc_array,
            'deadline_at' => $this->deadline_at?->toIso8601String(),
            'funded_at' => $this->funded_at?->toIso8601String(),
            'frozen_at' => $this->frozen_at?->toIso8601String(),
            'freeze_reason' => $this->when(
                $this->status === CampaignStatus::Frozen,
                $this->freeze_reason,
            ),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'rejection_reason' => $this->when(
                $this->status === CampaignStatus::Draft && $this->rejection_reason !== null,
                $this->rejection_reason,
            ),
            'is_accepting_donations' => $this->acceptsDonations(),
            'campaigner' => $this->whenLoaded('campaigner', fn (): array => [
                'id' => $this->campaigner->id,
                'name' => $this->campaigner->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
