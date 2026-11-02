<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Support\ApiError;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

final class AuditLogController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', AuditLog::class);

        $validated = $request->validate([
            'actor_id' => ['nullable', 'integer', 'min:1'],
            'action' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $query = AuditLog::query()
            ->when(isset($validated['actor_id']), fn ($builder) => $builder->where('actor_id', $validated['actor_id']))
            ->when(isset($validated['action']), fn ($builder) => $builder->where('action', $validated['action']))
            ->when(isset($validated['from']), fn ($builder) => $builder->whereDate('created_at', '>=', $validated['from']))
            ->when(isset($validated['to']), fn ($builder) => $builder->whereDate('created_at', '<=', $validated['to']))
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        return AuditLogResource::collection($query->cursorPaginate(25));
    }

    public function immutable(): JsonResponse
    {
        return ApiError::response(
            'METHOD_NOT_ALLOWED',
            'Audit log bersifat append-only dan tidak dapat diubah atau dihapus.',
            405,
        );
    }
}
