<?php

declare(strict_types=1);

namespace App\Policies;

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

    /**
     * Only fundraisers may create campaigns. Admins moderate; they must not be
     * a party to the campaign they review (P8-admin-management, S1).
     */
    public function create(User $user): bool
    {
        return $user->role->canCreateCampaigns();
    }

    /**
     * Campaign copy belongs to its fundraiser. Admin edits would let the
     * evidence change after approval, so moderation uses freeze/close instead.
     */
    public function update(User $user, Campaign $campaign): bool
    {
        return $user->getKey() === $campaign->user_id;
    }

    public function submit(User $user, Campaign $campaign): bool
    {
        return $user->getKey() === $campaign->user_id;
    }

    public function review(User $user, Campaign $campaign): bool
    {
        return $user->role->canReviewCampaigns();
    }

    public function viewReviewQueue(User $user): bool
    {
        return $user->role->canReviewCampaigns();
    }

    /**
     * Spending is the fundraiser's action. The admin can watch and freeze, but
     * cannot initiate a disbursement (maker-checker).
     */
    public function disburse(User $user, Campaign $campaign): bool
    {
        return $user->getKey() === $campaign->user_id;
    }

    public function manageLimits(User $user, Campaign $campaign): bool
    {
        return $user->isAdmin();
    }

    public function viewLimits(User $user, Campaign $campaign): bool
    {
        return $user->getKey() === $campaign->user_id || $user->role->isStaff();
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
