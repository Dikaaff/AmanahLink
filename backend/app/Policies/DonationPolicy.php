<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Donation;
use App\Models\User;

final class DonationPolicy
{
    public function create(User $user): bool
    {
        return true;
    }

    public function view(User $user, Donation $donation): bool
    {
        return $user->getKey() === $donation->donor_id || $user->role->isStaff();
    }
}
