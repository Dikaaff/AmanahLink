<?php

declare(strict_types=1);

namespace App\Enums;

enum MerchantStatus: string
{
    case Pending = 'pending';
    case Verified = 'verified';
    case Suspended = 'suspended';

    public function canReceiveFunds(): bool
    {
        return $this === self::Verified;
    }

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu Verifikasi',
            self::Verified => 'Terverifikasi',
            self::Suspended => 'Ditangguhkan',
        };
    }
}
