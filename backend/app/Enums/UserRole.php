<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case Donor = 'donor';
    case Campaigner = 'campaigner';
    case Verifier = 'verifier';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Donor => 'Donatur',
            self::Campaigner => 'Penggalang Dana',
            self::Verifier => 'Verifikator',
            self::Admin => 'Administrator',
        };
    }

    public function isStaff(): bool
    {
        return in_array($this, [self::Verifier, self::Admin], true);
    }

    public function canReviewCampaigns(): bool
    {
        return in_array($this, [self::Verifier, self::Admin], true);
    }

    public function canReviewReceipts(): bool
    {
        return in_array($this, [self::Verifier, self::Admin], true);
    }

    public function canFreezeCampaigns(): bool
    {
        return $this === self::Admin;
    }

    public function canManageMerchants(): bool
    {
        return $this === self::Admin;
    }
}
