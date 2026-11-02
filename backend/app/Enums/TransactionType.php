<?php

declare(strict_types=1);

namespace App\Enums;

enum TransactionType: string
{
    case DonationSettlement = 'donation_settlement';
    case PlatformFee = 'platform_fee';
    case Disbursement = 'disbursement';
    case MerchantSettlement = 'merchant_settlement';
    case Refund = 'refund';

    public function label(): string
    {
        return match ($this) {
            self::DonationSettlement => 'Donasi Masuk',
            self::PlatformFee => 'Fee Platform',
            self::Disbursement => 'Pencairan',
            self::MerchantSettlement => 'Settlement Merchant',
            self::Refund => 'Refund',
        };
    }
}
