<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Merchant;
use App\Models\User;

final class MerchantPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [UserRole::Campaigner, UserRole::Verifier, UserRole::Admin], true);
    }

    public function view(User $user, Merchant $merchant): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->role->canManageMerchants();
    }

    public function update(User $user, Merchant $merchant): bool
    {
        return $user->role->canManageMerchants();
    }

    public function verify(User $user, Merchant $merchant): bool
    {
        return $user->role->canManageMerchants();
    }
}
