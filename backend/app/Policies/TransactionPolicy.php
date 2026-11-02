<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Transaction;
use App\Models\User;

final class TransactionPolicy
{
    public function uploadReceipt(User $user, Transaction $transaction): bool
    {
        return $user->getKey() === $transaction->campaign?->user_id || $user->isAdmin();
    }
}
