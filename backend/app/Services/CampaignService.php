<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\CampaignStatus;
use App\Exceptions\CampaignLockedException;
use App\Exceptions\InvalidStateTransitionException;
use App\Models\Campaign;
use App\Models\MccCode;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class CampaignService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array{title: string, description: string, target_amount: string|int, allowed_mcc_array: list<string>, deadline_at: string}  $data
     */
    public function create(User $owner, array $data): Campaign
    {
        $mcc = $this->normalizeMcc($data['allowed_mcc_array']);

        return DB::transaction(function () use ($owner, $data, $mcc): Campaign {
            $campaign = Campaign::create([
                'user_id' => $owner->getKey(),
                'title' => $data['title'],
                'slug' => $this->uniqueSlug($data['title']),
                'description' => $data['description'],
                'target_amount' => Money::of($data['target_amount'])->toDecimalString(),
                'current_amount' => Money::zero()->toDecimalString(),
                'allowed_mcc_array' => $mcc,
                'status' => CampaignStatus::Draft,
                'deadline_at' => $data['deadline_at'],
            ]);

            $this->audit->record('campaign.created', $campaign, null, [
                'title' => $campaign->title,
                'target_amount' => $campaign->target_amount,
                'allowed_mcc_array' => $mcc,
            ], $owner);

            return $campaign;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Campaign $campaign, array $data): Campaign
    {
        return DB::transaction(function () use ($campaign, $data): Campaign {
            $locked = Campaign::query()->whereKey($campaign->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->donations()->settled()->exists()) {
                throw new CampaignLockedException;
            }

            if (! in_array($locked->status, [
                CampaignStatus::Draft,
                CampaignStatus::PendingReview,
                CampaignStatus::Active,
            ], true)) {
                throw new InvalidStateTransitionException($locked->status, CampaignStatus::Draft);
            }

            $before = $locked->only([
                'title', 'description', 'target_amount', 'allowed_mcc_array', 'deadline_at',
            ]);

            $changes = $data;

            if (array_key_exists('target_amount', $changes)) {
                $changes['target_amount'] = Money::of($changes['target_amount'])->toDecimalString();
            }

            if (array_key_exists('allowed_mcc_array', $changes)) {
                $changes['allowed_mcc_array'] = $this->normalizeMcc($changes['allowed_mcc_array']);
            }

            $locked->fill($changes)->save();

            $this->audit->record('campaign.updated', $locked, $before, $locked->only(array_keys($before)));

            return $locked->refresh();
        });
    }

    public function submit(Campaign $campaign, User $actor): Campaign
    {
        return DB::transaction(function () use ($campaign, $actor): Campaign {
            $locked = Campaign::query()->whereKey($campaign->getKey())->lockForUpdate()->firstOrFail();

            $this->transition($locked, CampaignStatus::PendingReview);
            $locked->forceFill(['rejection_reason' => null])->save();

            $this->audit->record('campaign.submitted', $locked, null, ['status' => $locked->status->value], $actor);

            return $locked->refresh();
        });
    }

    public function review(Campaign $campaign, User $reviewer, string $decision, ?string $reason = null): Campaign
    {
        return DB::transaction(function () use ($campaign, $reviewer, $decision, $reason): Campaign {
            $locked = Campaign::query()->whereKey($campaign->getKey())->lockForUpdate()->firstOrFail();

            $approve = $decision === 'approve';

            if ($approve) {
                $this->transition($locked, CampaignStatus::Active);
                $locked->forceFill([
                    'reviewed_by' => $reviewer->getKey(),
                    'reviewed_at' => now(),
                    'rejection_reason' => null,
                ])->save();

                $this->audit->record('campaign.approved', $locked, null, ['status' => $locked->status->value], $reviewer);
            } else {
                $this->transition($locked, CampaignStatus::Draft);
                $locked->forceFill([
                    'reviewed_by' => $reviewer->getKey(),
                    'reviewed_at' => now(),
                    'rejection_reason' => $reason,
                ])->save();

                $this->audit->record('campaign.rejected', $locked, null, [
                    'status' => $locked->status->value,
                    'rejection_reason' => $reason,
                ], $reviewer);
            }

            return $locked->refresh();
        });
    }

    public function freeze(Campaign $campaign, User $actor, string $reason): Campaign
    {
        return DB::transaction(function () use ($campaign, $actor, $reason): Campaign {
            $locked = Campaign::query()->whereKey($campaign->getKey())->lockForUpdate()->firstOrFail();
            $previous = $locked->status;

            $this->transition($locked, CampaignStatus::Frozen);
            $locked->forceFill([
                'frozen_at' => now(),
                'freeze_reason' => $reason,
            ])->save();

            $this->audit->record('campaign.frozen', $locked, [
                'status' => $previous->value,
            ], [
                'status' => CampaignStatus::Frozen->value,
                'reason' => $reason,
            ], $actor);

            return $locked->refresh();
        });
    }

    public function unfreeze(Campaign $campaign, User $actor): Campaign
    {
        return DB::transaction(function () use ($campaign, $actor): Campaign {
            $locked = Campaign::query()->whereKey($campaign->getKey())->lockForUpdate()->firstOrFail();
            $previous = $locked->status;
            $reason = $locked->freeze_reason;

            $target = Money::of($locked->current_amount)
                ->isLessThan(Money::of($locked->target_amount))
                ? CampaignStatus::Active
                : CampaignStatus::Funded;

            $this->transition($locked, $target);
            $locked->forceFill([
                'frozen_at' => null,
                'freeze_reason' => null,
            ])->save();

            $this->audit->record('campaign.unfrozen', $locked, [
                'status' => $previous->value,
                'reason' => $reason,
            ], [
                'status' => $target->value,
            ], $actor);

            return $locked->refresh();
        });
    }

    private function transition(Campaign $campaign, CampaignStatus $next): void
    {
        if (! $campaign->status->canTransitionTo($next)) {
            throw new InvalidStateTransitionException($campaign->status, $next);
        }

        $campaign->forceFill(['status' => $next])->save();
    }

    /**
     * Deny by default: every code must exist in the registry, be active, and
     * not be globally blocked (D-003, layer 1).
     *
     * @param  list<string>  $codes
     * @return list<string>
     */
    private function normalizeMcc(array $codes): array
    {
        $codes = array_values(array_unique(array_map(
            fn (mixed $code): string => trim((string) $code),
            $codes,
        )));

        $approved = MccCode::query()
            ->whereIn('code', $codes)
            ->where('is_active', true)
            ->where('is_blocked', false)
            ->pluck('code')
            ->all();

        $rejected = array_values(array_diff($codes, $approved));

        if ($rejected !== []) {
            throw ValidationException::withMessages([
                'allowed_mcc_array' => [
                    'Kode MCC tidak diizinkan: '.implode(', ', $rejected).'.',
                ],
            ]);
        }

        return $codes;
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title);

        if ($base === '') {
            $base = 'kampanye';
        }

        $slug = $base;
        $suffix = 2;

        while (Campaign::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
