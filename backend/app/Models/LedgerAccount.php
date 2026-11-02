<?php

namespace App\Models;

use App\Enums\LedgerAccountType;
use App\Enums\LedgerDirection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'type', 'owner_type', 'owner_id', 'currency'])]
class LedgerAccount extends Model
{
    use HasFactory;

    public const OWNER_PLATFORM = 'platform';

    public const OWNER_CAMPAIGN = 'campaign';

    protected function casts(): array
    {
        return [
            'type' => LedgerAccountType::class,
        ];
    }

    public function entries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class, 'account_id');
    }

    public function normalBalance(): LedgerDirection
    {
        return $this->type->normalBalance();
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeForCampaign(Builder $query, int $campaignId): Builder
    {
        return $query
            ->where('owner_type', self::OWNER_CAMPAIGN)
            ->where('owner_id', $campaignId);
    }
}
