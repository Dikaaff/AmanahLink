<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\AccountSuspendedException;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Suspension takes effect on the next request, not only at login, so an
 * already-issued token cannot outlive the admin decision (S5).
 */
final class EnsureAccountIsActive
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User && $user->isSuspended()) {
            throw new AccountSuspendedException;
        }

        return $next($request);
    }
}
