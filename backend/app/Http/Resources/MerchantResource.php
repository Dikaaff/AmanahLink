<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\UserRole;
use App\Models\Merchant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Merchant
 */
final class MerchantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isManager = $request->user()?->role === UserRole::Admin;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'mcc' => $this->mcc,
            'mcc_title' => $this->whenLoaded('mccCode', fn (): ?string => $this->mccCode?->title),
            'category' => $this->whenLoaded('mccCode', fn (): ?string => $this->mccCode?->category),
            'city' => $this->city,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'mid' => $this->when($isManager, $this->mid),
            'verified_at' => $this->when(
                $isManager,
                fn (): ?string => $this->verified_at?->toIso8601String(),
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
