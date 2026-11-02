<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\UpsertDisbursementLimitRequest;
use App\Models\Campaign;
use App\Models\DisbursementLimit;
use App\Services\AuditLogger;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

final class DisbursementLimitController
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function upsert(UpsertDisbursementLimitRequest $request, Campaign $campaign): JsonResponse
    {
        $limit = DB::transaction(function () use ($request, $campaign): DisbursementLimit {
            /** @var DisbursementLimit|null $limit */
            $limit = DisbursementLimit::query()
                ->where('campaign_id', $campaign->getKey())
                ->lockForUpdate()
                ->first();

            $before = $limit?->only(['daily_limit', 'monthly_limit', 'expires_at']);

            $attributes = [
                'daily_limit' => Money::of((string) $request->input('daily_limit'))->toDecimalString(),
                'monthly_limit' => Money::of((string) $request->input('monthly_limit'))->toDecimalString(),
                'expires_at' => $request->date('expires_at'),
            ];

            if ($limit === null) {
                $limit = DisbursementLimit::create($attributes + [
                    'campaign_id' => $campaign->getKey(),
                    'used_today' => Money::zero()->toDecimalString(),
                    'used_this_month' => Money::zero()->toDecimalString(),
                    'daily_window' => now()->toDateString(),
                    'monthly_window' => now()->format('Y-m'),
                ]);
            } else {
                $limit->forceFill($attributes)->save();
            }

            $this->audit->record('disbursement_limit.updated', $limit, $before, [
                'daily_limit' => $limit->daily_limit,
                'monthly_limit' => $limit->monthly_limit,
                'expires_at' => $limit->expires_at?->toIso8601String(),
            ]);

            return $limit->refresh();
        });

        return response()->json([
            'data' => [
                'campaign_id' => $limit->campaign_id,
                'daily_limit' => $limit->daily_limit,
                'monthly_limit' => $limit->monthly_limit,
                'used_today' => $limit->used_today,
                'used_this_month' => $limit->used_this_month,
                'daily_window' => $limit->daily_window?->toDateString(),
                'monthly_window' => $limit->monthly_window,
                'expires_at' => $limit->expires_at?->toIso8601String(),
            ],
        ]);
    }
}
