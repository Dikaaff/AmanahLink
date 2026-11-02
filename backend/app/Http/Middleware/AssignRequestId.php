<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Every API response carries an X-Request-Id so a user can quote it and an
 * operator can find the matching log lines. Incoming ids are accepted only
 * when they look sane; otherwise we mint a ULID.
 */
final class AssignRequestId
{
    public const HEADER = 'X-Request-Id';

    public const CONTAINER_KEY = 'request_id';

    public function handle(Request $request, Closure $next): Response
    {
        $incoming = $request->header(self::HEADER);

        $requestId = is_string($incoming) && preg_match('/^[A-Za-z0-9._-]{8,64}$/', $incoming) === 1
            ? $incoming
            : (string) Str::ulid();

        app()->instance(self::CONTAINER_KEY, $requestId);

        $response = $next($request);

        $response->headers->set(self::HEADER, $requestId);

        return $response;
    }
}
