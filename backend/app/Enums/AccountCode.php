<?php

declare(strict_types=1);

namespace App\Enums;

enum AccountCode: string
{
    case PlatformCash = '1000';
    case RefundPayable = '2050';
    case MerchantClearing = '2100';
    case CampaignRestricted = '2200';
    case PlatformFeeRevenue = '4000';

    public function accountType(): LedgerAccountType
    {
        return match ($this) {
            self::PlatformCash => LedgerAccountType::Asset,
            self::RefundPayable, self::MerchantClearing, self::CampaignRestricted => LedgerAccountType::Liability,
            self::PlatformFeeRevenue => LedgerAccountType::Revenue,
        };
    }

    public function defaultName(): string
    {
        return match ($this) {
            self::PlatformCash => 'Platform Cash',
            self::RefundPayable => 'Refund Payable',
            self::MerchantClearing => 'Merchant Clearing',
            self::CampaignRestricted => 'Campaign Restricted Funds',
            self::PlatformFeeRevenue => 'Platform Fee Revenue',
        };
    }

    /**
     * Campaign restricted funds live per campaign, every other account is
     * platform wide.
     */
    public function isCampaignScoped(): bool
    {
        return $this === self::CampaignRestricted;
    }
}
