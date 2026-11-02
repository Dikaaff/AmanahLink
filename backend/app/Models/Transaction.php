<?php

namespace App\Models;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'campaign_id',
    'user_id',
    'donation_id',
    'merchant_id',
    'type',
    'amount',
    'mcc_used',
    'status',
    'reference_id',
    'idempotency_key',
])]
class Transaction extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'type' => TransactionType::class,
            'status' => TransactionStatus::class,
            'amount' => 'decimal:2',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function donation(): BelongsTo
    {
        return $this->belongsTo(Donation::class);
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class);
    }

    public function receipt(): HasOne
    {
        return $this->hasOne(Receipt::class);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeCaptured(Builder $query): Builder
    {
        return $query->whereIn('status', [
            TransactionStatus::Captured->value,
            TransactionStatus::ReceiptPending->value,
            TransactionStatus::Verified->value,
            TransactionStatus::Reconciled->value,
        ]);
    }
}
