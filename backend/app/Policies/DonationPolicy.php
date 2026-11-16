<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Donation;
use App\Models\User;

final class DonationPolicy
{
    /**
     * Donating is a user action. An admin who could donate into a campaign
     * would also be donating to a campaign they review and can freeze (S1/S6).
     */
    public function create(User $user): bool
    {
        return $user->role->canDonate();
    }

    public function view(User $user, Donation $donation): bool
    {
        return $user->getKey() === $donation->donor_id || $user->role->isStaff();
    }
}
