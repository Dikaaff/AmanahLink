<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountCode;
use App\Enums\DonationStatus;
use App\Enums\ReceiptStatus;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\LedgerAccount;
use App\Models\Receipt;
use App\Models\Transaction;
use App\Support\Money;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * Operational snapshot for admins (US-25). Balances are recomputed from
 * ledger entries; `campaigns.current_amount` is shown next to them only so the
 * cache can be compared, never as the source of truth.
 */
final class AdminDashboardController
{
    private const WINDOW_HOURS = 24;

    public function __invoke(Request $request): JsonResponse
    {
        Gate::authorize('view-dashboard');

        $ledgerBalance = $this->ledgerCampaignBalance();
        $cacheBalance = $this->money(Campaign::query()->sum('current_amount'));

        return response()->json([
            'data' => [
                'window_hours' => self::WINDOW_HOURS,
                'donations_settled_total' => $this->money(
                    Donation::query()->where('status', DonationStatus::Settled->value)->sum('amount')
                ),
                'disbursements_captured_total' => $this->money(
                    Transaction::query()
                        ->where('type', TransactionType::Disbursement->value)
                        ->whereIn('status', [
                            TransactionStatus::Captured->value,
                            TransactionStatus::ReceiptPending->value,
                            TransactionStatus::Verified->value,
                            TransactionStatus::Reconciled->value,
                        ])
                        ->sum('amount')
                ),
                'refunds_total' => $this->money(
                    Transaction::query()
                        ->where('type', TransactionType::Refund->value)
                        ->whereNotNull('donation_id')
                        ->sum('amount')
                ),
                'ledger_campaign_balance' => $ledgerBalance,
                'campaign_cache_balance' => $cacheBalance,
                'ledger_mismatch_count' => $this->ledgerMismatchCount(),
                'ocr_queue_depth' => Receipt::query()
                    ->whereIn('status', [ReceiptStatus::Uploaded->value, ReceiptStatus::Extracting->value])
                    ->count(),
                'receipts_needs_review' => Receipt::query()
                    ->where('status', ReceiptStatus::NeedsReview->value)
                    ->count(),
                'authorize_p95_ms' => $this->authorizeP95(),
                'authorize_sample_count' => $this->authorizeSampleCount(),
            ],
        ]);
    }

    private function ledgerCampaignBalance(): string
    {
        $total = DB::table('ledger_entries as le')
            ->join('ledger_accounts as la', 'la.id', '=', 'le.account_id')
            ->where('la.code', AccountCode::CampaignRestricted->value)
            ->where('la.owner_type', LedgerAccount::OWNER_CAMPAIGN)
            ->selectRaw("CAST(COALESCE(SUM(CASE WHEN le.direction = 'credit' THEN le.amount ELSE -le.amount END), 0) AS CHAR) AS total")
            ->value('total');

        return $this->money($total);
    }

    /**
     * A campaign is inconsistent when its cached amount differs from the
     * balance of its restricted ledger account (including campaigns that never
     * received a ledger entry but carry a non-zero cache).
     */
    private function ledgerMismatchCount(): int
    {
        $balances = DB::table('ledger_entries as le')
            ->join('ledger_accounts as la', 'la.id', '=', 'le.account_id')
            ->where('la.code', AccountCode::CampaignRestricted->value)
            ->where('la.owner_type', LedgerAccount::OWNER_CAMPAIGN)
            ->groupBy('la.owner_id')
            ->selectRaw("la.owner_id AS campaign_id, SUM(CASE WHEN le.direction = 'credit' THEN le.amount ELSE -le.amount END) AS balance");

        return (int) DB::table('campaigns as c')
            ->leftJoinSub($balances, 'b', 'b.campaign_id', '=', 'c.id')
            ->whereRaw('c.current_amount <> COALESCE(b.balance, 0)')
            ->count();
    }

    private function authorizeSampleCount(): int
    {
        return $this->authorizeSamples()->count();
    }

    /**
     * Nearest-rank p95 over the last 24 hours of authorize samples.
     */
    private function authorizeP95(): ?int
    {
        $count = $this->authorizeSampleCount();

        if ($count === 0) {
            return null;
        }

        $offset = max(0, (int) ceil($count * 0.95) - 1);

        $value = $this->authorizeSamples()
            ->orderBy('duration_ms')
            ->skip($offset)
            ->value('duration_ms');

        return $value === null ? null : (int) $value;
    }

    /**
     * @return Builder
     */
    private function authorizeSamples()
    {
        return DB::table('request_metrics')
            ->where('route', 'disbursements.store')
            ->where('created_at', '>=', now()->subHours(self::WINDOW_HOURS));
    }

    private function money(mixed $value): string
    {
        return Money::of((string) ($value ?? '0'))->toDecimalString();
    }
}
