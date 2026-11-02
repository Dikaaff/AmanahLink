<?php

namespace Database\Factories;

use App\Enums\AccountCode;
use App\Models\LedgerAccount;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LedgerAccount>
 */
class LedgerAccountFactory extends Factory
{
    protected $model = LedgerAccount::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => AccountCode::PlatformCash->value,
            'name' => AccountCode::PlatformCash->defaultName(),
            'type' => AccountCode::PlatformCash->accountType(),
            'owner_type' => LedgerAccount::OWNER_PLATFORM,
            'owner_id' => 0,
            'currency' => 'IDR',
        ];
    }

    public function forCampaign(int $campaignId): static
    {
        return $this->state(fn (array $attributes) => [
            'code' => AccountCode::CampaignRestricted->value,
            'name' => AccountCode::CampaignRestricted->defaultName(),
            'type' => AccountCode::CampaignRestricted->accountType(),
            'owner_type' => LedgerAccount::OWNER_CAMPAIGN,
            'owner_id' => $campaignId,
        ]);
    }
}
