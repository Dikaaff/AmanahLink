<?php

namespace App\Models;

use App\Enums\LedgerDirection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * Append-only ledger line. Rows are never updated or deleted: the database
 * enforces the same rule with BEFORE UPDATE / BEFORE DELETE triggers.
 */
#[Fillable(['transaction_id', 'account_id', 'direction', 'amount', 'balance_after', 'created_at'])]
class LedgerEntry extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'direction' => LedgerDirection::class,
            'amount' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new LogicException('Ledger entries are immutable and cannot be updated.');
        });

        static::deleting(function (): never {
            throw new LogicException('Ledger entries are immutable and cannot be deleted.');
        });
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(LedgerAccount::class, 'account_id');
    }
}
