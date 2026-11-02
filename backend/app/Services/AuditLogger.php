<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

final class AuditLogger
{
    /**
     * Append one immutable audit row. Never update or delete audit logs.
     *
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function record(
        string $action,
        ?Model $subject = null,
        ?array $before = null,
        ?array $after = null,
        ?User $actor = null,
    ): AuditLog {
        return AuditLog::create([
            'actor_id' => $actor?->id ?? auth()->id(),
            'action' => $action,
            'subject_type' => $subject === null ? null : $subject->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'before' => $before,
            'after' => $after,
            'ip_address' => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 255) ?: null,
            'created_at' => now(),
        ]);
    }
}
