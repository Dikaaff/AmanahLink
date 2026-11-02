<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Campaign;
use App\Models\User;

final class CampaignPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Campaign $campaign): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, [UserRole::Campaigner, UserRole::Admin], true);
    }

    public function update(User $user, Campaign $campaign): bool
    {
        return $user->getKey() === $campaign->user_id || $user->isAdmin();
    }

    public function submit(User $user, Campaign $campaign): bool
    {
        return $user->getKey() === $campaign->user_id;
    }

    public function review(User $user, Campaign $campaign): bool
    {
        return $user->role->canReviewCampaigns();
    }

    public function disburse(User $user, Campaign $campaign): bool
    {
        return $user->getKey() === $campaign->user_id || $user->isAdmin();
    }

    public function manageLimits(User $user, Campaign $campaign): bool
    {
        return $user->isAdmin();
    }

    public function close(User $user, Campaign $campaign): bool
    {
        return $user->role->canFreezeCampaigns();
    }

    public function freeze(User $user, Campaign $campaign): bool
    {
        return $user->role->canFreezeCampaigns();
    }

    public function unfreeze(User $user, Campaign $campaign): bool
    {
        return $user->role->canFreezeCampaigns();
    }
}
