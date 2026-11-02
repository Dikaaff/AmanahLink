<?php

namespace App\Models;

use App\Enums\MerchantStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'mcc', 'mid', 'status', 'city', 'verified_at', 'verified_by'])]
class Merchant extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'status' => MerchantStatus::class,
            'verified_at' => 'datetime',
        ];
    }

    public function mccCode(): BelongsTo
    {
        return $this->belongsTo(MccCode::class, 'mcc', 'code');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeVerified(Builder $query): Builder
    {
        return $query->where('status', MerchantStatus::Verified->value);
    }
}
