<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Transaction;
use App\Models\User;

final class TransactionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === UserRole::Campaigner || $user->isAdmin();
    }

    public function view(User $user, Transaction $transaction): bool
    {
        return $user->isAdmin()
            || $user->getKey() === $transaction->campaign?->user_id;
    }

    public function uploadReceipt(User $user, Transaction $transaction): bool
    {
        return $user->getKey() === $transaction->campaign?->user_id || $user->isAdmin();
    }
}
