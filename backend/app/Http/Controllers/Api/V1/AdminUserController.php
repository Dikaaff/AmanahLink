<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Requests\SuspendUserRequest;
use App\Http\Requests\UpdateUserRoleRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Account lifecycle for admins (S5). This surface manages access, never money:
 * it can stop an account or change what an account may do, but it cannot touch
 * campaigns, donations, transactions, receipts, or the ledger.
 */
final class AdminUserController
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('manage-users');

        $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::enum(UserRole::class)],
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
        ]);

        $query = User::query()->latest('id');

        if ($request->filled('q')) {
            $term = '%'.$request->string('q')->trim()->toString().'%';

            $query->where(fn ($builder) => $builder
                ->where('name', 'like', $term)
                ->orWhere('email', 'like', $term));
        }

        if ($request->filled('role')) {
            $query->where('role', $request->string('role')->toString());
        }

        if ($request->string('status')->toString() === 'suspended') {
            $query->whereNotNull('suspended_at');
        } elseif ($request->string('status')->toString() === 'active') {
            $query->whereNull('suspended_at');
        }

        return UserResource::collection($query->paginate(20)->withQueryString());
    }

    public function updateRole(UpdateUserRoleRequest $request, User $user): JsonResponse
    {
        $actor = $request->user();

        abort_if($user->getKey() === $actor->getKey(), 403, 'Anda tidak dapat mengubah peran akun sendiri.');
        abort_if($user->isAdmin(), 403, 'Peran administrator tidak dapat diubah dari console.');

        $next = UserRole::from($request->string('role')->toString());
        $before = ['role' => $user->role->value];

        if ($user->role !== $next) {
            $user->forceFill(['role' => $next])->save();

            $this->audit->record(
                'user.role_changed',
                $user,
                $before,
                ['role' => $next->value],
                $actor,
            );
        }

        return response()->json([
            'data' => new UserResource($user->refresh()),
        ]);
    }

    public function suspend(SuspendUserRequest $request, User $user): JsonResponse
    {
        $actor = $request->user();

        abort_if($user->getKey() === $actor->getKey(), 403, 'Anda tidak dapat menangguhkan akun sendiri.');
        abort_if($user->isAdmin(), 403, 'Akun administrator tidak dapat ditangguhkan dari console.');

        if (! $user->isSuspended()) {
            $user->forceFill(['suspended_at' => now()])->save();
            $user->tokens()->delete();

            $this->audit->record(
                'user.suspended',
                $user,
                ['suspended_at' => null],
                [
                    'suspended_at' => $user->suspended_at?->toIso8601String(),
                    'reason' => $request->string('reason')->toString(),
                ],
                $actor,
            );
        }

        return response()->json([
            'data' => new UserResource($user->refresh()),
        ]);
    }

    public function reactivate(Request $request, User $user): JsonResponse
    {
        Gate::authorize('manage-users');

        $actor = $request->user();

        abort_if($user->isAdmin(), 403, 'Akun administrator tidak dikelola dari console.');

        if ($user->isSuspended()) {
            $previous = $user->suspended_at?->toIso8601String();

            $user->forceFill(['suspended_at' => null])->save();

            $this->audit->record(
                'user.reactivated',
                $user,
                ['suspended_at' => $previous],
                ['suspended_at' => null],
                $actor,
            );
        }

        return response()->json([
            'data' => new UserResource($user->refresh()),
        ]);
    }
}
