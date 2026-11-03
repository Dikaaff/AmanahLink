<?php

namespace App\Console\Commands;

use App\Enums\CampaignStatus;
use App\Enums\UserRole;
use App\Models\Campaign;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\RefundService;
use DateTimeInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class RunCampaignCycle extends Command
{
    protected $signature = 'amanah:campaign-cycle';

    protected $description = 'Expire campaigns, close expired campaigns after the refund window, and prune request metrics';

    public function handle(RefundService $refunds, AuditLogger $audit): int
    {
        $now = now();
        $expired = $this->expireCampaigns($now, $audit);
        $refunded = $this->closeExpiredCampaigns($now, $refunds);
        $pruned = $this->pruneRequestMetrics();

        $this->info("Expired {$expired} campaign(s); refunded {$refunded}; pruned {$pruned} request metric(s).");

        return self::SUCCESS;
    }

    private function expireCampaigns(DateTimeInterface $now, AuditLogger $audit): int
    {
        $campaigns = Campaign::query()
            ->whereIn('status', [CampaignStatus::Active->value, CampaignStatus::Funded->value])
            ->where('deadline_at', '<', $now)
            ->get();

        $expired = 0;

        foreach ($campaigns as $campaign) {
            DB::transaction(function () use ($campaign, $audit): void {
                $locked = Campaign::query()->whereKey($campaign->getKey())->lockForUpdate()->firstOrFail();

                if (! in_array($locked->status, [CampaignStatus::Active, CampaignStatus::Funded], true)
                    || $locked->deadline_at->isFuture()) {
                    return;
                }

                $previous = $locked->status;
                $locked->forceFill(['status' => CampaignStatus::Expired])->save();
                $audit->record('campaign.expired', $locked, [
                    'status' => $previous->value,
                    'deadline_at' => $locked->deadline_at->toIso8601String(),
                ], [
                    'status' => CampaignStatus::Expired->value,
                    'refund_window_days' => config('amanahlink.campaign_refund_window_days'),
                ]);
            });

            $expired++;
        }

        return $expired;
    }

    private function closeExpiredCampaigns(DateTimeInterface $now, RefundService $refunds): int
    {
        $actor = User::query()->where('role', UserRole::Admin->value)->orderBy('id')->first();

        if ($actor === null) {
            return 0;
        }

        $cutoff = now()->subDays((int) config('amanahlink.campaign_refund_window_days', 7));
        $campaigns = Campaign::query()
            ->where('status', CampaignStatus::Expired->value)
            ->where('deadline_at', '<=', min($now, $cutoff))
            ->orderBy('id')
            ->get();

        $refunded = 0;

        foreach ($campaigns as $campaign) {
            $refunds->closeAndRefund($campaign, $actor);
            $refunded++;
        }

        return $refunded;
    }

    private function pruneRequestMetrics(): int
    {
        $cutoff = now()->subHours((int) config('amanahlink.request_metrics_retention_hours', 90));

        return DB::table('request_metrics')->where('created_at', '<', $cutoff)->delete();
    }
}
