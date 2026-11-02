<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AccountCode;
use App\Exceptions\LedgerMismatchException;
use App\Models\Campaign;
use App\Support\Money;

final class CampaignBalanceService
{
    public function __construct(private readonly LedgerService $ledger) {}

    /**
     * Balance derived from the ledger. This is the authoritative number.
     */
    public function expected(Campaign $campaign): Money
    {
        return $this->ledger->balanceOf(AccountCode::CampaignRestricted, $campaign->id);
    }

    /**
     * Rebuild the cached campaigns.current_amount from the ledger.
     *
     * The caller must already hold a row lock on the campaign (settlement and
     * disbursement services lock it before mutating money).
     */
    public function sync(Campaign $campaign): Money
    {
        $expected = $this->expected($campaign);

        $campaign->forceFill([
            'current_amount' => $expected->toDecimalString(),
        ])->save();

        return $expected;
    }

    public function assertConsistent(Campaign $campaign): void
    {
        $expected = $this->expected($campaign);
        $cached = Money::of($campaign->current_amount);

        if (! $expected->equals($cached)) {
            throw new LedgerMismatchException(
                "Campaign {$campaign->id} balance mismatch: cached {$cached->toDecimalString()} vs ledger {$expected->toDecimalString()}."
            );
        }
    }
}
