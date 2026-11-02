<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use LogicException;

/**
 * Append-only audit trail. Every state transition and every rejected
 * financial request must leave exactly one row here.
 */
#[Fillable([
    'actor_id',
    'action',
    'subject_type',
    'subject_id',
    'before',
    'after',
    'ip_address',
    'user_agent',
    'trace_id',
    'created_at',
])]
class AuditLog extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'before' => 'array',
            'after' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new LogicException('Audit logs are append-only and cannot be updated.');
        });

        static::deleting(function (): never {
            throw new LogicException('Audit logs are append-only and cannot be deleted.');
        });
    }
}
