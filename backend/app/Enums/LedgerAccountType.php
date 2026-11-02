<?php

declare(strict_types=1);

namespace App\Enums;

enum LedgerAccountType: string
{
    case Asset = 'asset';
    case Liability = 'liability';
    case Revenue = 'revenue';
    case Expense = 'expense';

    /**
     * Direction that increases the balance of this account type.
     */
    public function normalBalance(): LedgerDirection
    {
        return match ($this) {
            self::Asset, self::Expense => LedgerDirection::Debit,
            self::Liability, self::Revenue => LedgerDirection::Credit,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Asset => 'Aset',
            self::Liability => 'Kewajiban',
            self::Revenue => 'Pendapatan',
            self::Expense => 'Beban',
        };
    }
}
