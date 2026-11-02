<?php

namespace App\Models;

use App\Enums\CampaignStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'user_id',
    'title',
    'slug',
    'description',
    'target_amount',
    'current_amount',
    'allowed_mcc_array',
    'status',
    'deadline_at',
    'reviewed_by',
    'reviewed_at',
    'rejection_reason',
    'funded_at',
    'frozen_at',
    'freeze_reason',
    'closed_at',
    'refunded_at',
])]
class Campaign extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:2',
            'current_amount' => 'decimal:2',
            'allowed_mcc_array' => 'array',
            'status' => CampaignStatus::class,
            'deadline_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'funded_at' => 'datetime',
            'frozen_at' => 'datetime',
            'closed_at' => 'datetime',
            'refunded_at' => 'datetime',
        ];
    }

    public function campaigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function donations(): HasMany
    {
        return $this->hasMany(Donation::class);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query->whereIn('status', [
            CampaignStatus::Active->value,
            CampaignStatus::Funded->value,
            CampaignStatus::Expired->value,
            CampaignStatus::Closed->value,
            CampaignStatus::Refunded->value,
        ]);
    }

    public function acceptsDonations(): bool
    {
        return $this->status->acceptsDonations() && $this->deadline_at->isFuture();
    }

    public function isPubliclyVisible(): bool
    {
        return in_array($this->status, [
            CampaignStatus::Active,
            CampaignStatus::Funded,
            CampaignStatus::Expired,
            CampaignStatus::Closed,
            CampaignStatus::Refunded,
        ], true);
    }

    public function allowsDisbursement(): bool
    {
        return $this->status->allowsDisbursement();
    }
}
