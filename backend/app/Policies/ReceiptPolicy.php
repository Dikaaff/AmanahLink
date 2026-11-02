<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Receipt;
use App\Models\User;

final class ReceiptPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role->canReviewReceipts()
            || $user->role === UserRole::Campaigner;
    }

    public function review(User $user, Receipt $receipt): bool
    {
        return $user->role->canReviewReceipts();
    }
}
