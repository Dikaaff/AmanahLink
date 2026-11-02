<?php

namespace App\Models;

use App\Support\Money;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'campaign_id',
    'daily_limit',
    'monthly_limit',
    'used_today',
    'used_this_month',
    'daily_window',
    'monthly_window',
    'expires_at',
])]
class DisbursementLimit extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'daily_limit' => 'decimal:2',
            'monthly_limit' => 'decimal:2',
            'used_today' => 'decimal:2',
            'used_this_month' => 'decimal:2',
            'daily_window' => 'date',
            'expires_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function remainingToday(): Money
    {
        return Money::of($this->daily_limit)->minus(Money::of($this->used_today));
    }

    public function remainingThisMonth(): Money
    {
        return Money::of($this->monthly_limit)->minus(Money::of($this->used_this_month));
    }
}
