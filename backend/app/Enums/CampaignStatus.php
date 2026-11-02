<?php

declare(strict_types=1);

namespace App\Enums;

enum CampaignStatus: string
{
    case Draft = 'draft';
    case PendingReview = 'pending_review';
    case Active = 'active';
    case Funded = 'funded';
    case Frozen = 'frozen';
    case Expired = 'expired';
    case Closed = 'closed';
    case Refunded = 'refunded';

    /**
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Draft => [self::PendingReview],
            self::PendingReview => [self::Active, self::Draft],
            self::Active => [self::Funded, self::Frozen, self::Expired, self::Closed],
            self::Funded => [self::Active, self::Frozen, self::Expired, self::Closed],
            self::Frozen => [self::Active, self::Funded],
            self::Expired => [self::Closed, self::Refunded],
            self::Closed => [self::Refunded],
            self::Refunded => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }

    public function acceptsDonations(): bool
    {
        return in_array($this, [self::Active, self::Funded], true);
    }

    public function allowsDisbursement(): bool
    {
        return $this->acceptsDonations();
    }

    public function isTerminal(): bool
    {
        return $this->allowedTransitions() === [];
    }

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draf',
            self::PendingReview => 'Menunggu Review',
            self::Active => 'Aktif',
            self::Funded => 'Target Tercapai',
            self::Frozen => 'Dibekukan',
            self::Expired => 'Kedaluwarsa',
            self::Closed => 'Ditutup',
            self::Refunded => 'Dana Dikembalikan',
        };
    }
}
