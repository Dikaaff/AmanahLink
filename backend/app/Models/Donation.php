<?php

namespace App\Models;

use App\Enums\DonationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'campaign_id',
    'donor_id',
    'amount',
    'payment_ref',
    'status',
    'expires_at',
    'settled_at',
    'failure_reason',
])]
class Donation extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'status' => DonationStatus::class,
            'expires_at' => 'datetime',
            'settled_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function donor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'donor_id');
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeSettled(Builder $query): Builder
    {
        return $query->where('status', DonationStatus::Settled->value);
    }
}
