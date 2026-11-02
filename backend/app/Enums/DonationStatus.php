<?php

declare(strict_types=1);

namespace App\Enums;

enum DonationStatus: string
{
    case Initiated = 'initiated';
    case Pending = 'pending';
    case Settled = 'settled';
    case Failed = 'failed';
    case Expired = 'expired';
    case Refunded = 'refunded';

    /**
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Initiated => [self::Pending, self::Settled, self::Failed, self::Expired],
            self::Pending => [self::Settled, self::Failed, self::Expired],
            self::Settled => [self::Refunded],
            self::Failed => [],
            self::Expired => [],
            self::Refunded => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }

    public function isTerminal(): bool
    {
        return $this->allowedTransitions() === [];
    }

    public function countsTowardsBalance(): bool
    {
        return $this === self::Settled;
    }

    public function label(): string
    {
        return match ($this) {
            self::Initiated => 'Dibuat',
            self::Pending => 'Menunggu Pembayaran',
            self::Settled => 'Berhasil',
            self::Failed => 'Gagal',
            self::Expired => 'Kedaluwarsa',
            self::Refunded => 'Dikembalikan',
        };
    }
}
