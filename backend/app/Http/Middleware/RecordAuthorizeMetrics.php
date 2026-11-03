<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * NFR-01 measures authorize latency. The sample is written after the response
 * is produced so a failed metric write can never break a financial request.
 * Only the disbursement authorize endpoint is recorded; everything else is
 * passed through untouched.
 */
final class RecordAuthorizeMetrics
{
    public function handle(Request $request, Closure $next): Response
    {
        $records = $request->isMethod('post') && $request->is('api/v1/disbursements');
        $profileQueries = $records && (bool) config('amanahlink.profile_queries', false);
        $queryCount = 0;

        if ($profileQueries) {
            DB::listen(static function () use (&$queryCount): void {
                $queryCount++;
            });
        }

        $startedAt = hrtime(true);
        $response = $next($request);

        if (! $records) {
            return $response;
        }

        try {
            DB::table('request_metrics')->insert([
                'route' => 'disbursements.store',
                'status_code' => $response->getStatusCode(),
                'duration_ms' => max(0, (int) round((hrtime(true) - $startedAt) / 1_000_000)),
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Observability must never fail the business request.
        }

        if ($profileQueries) {
            $response->headers->set('X-Perf-Query-Count', (string) max(0, $queryCount - 1));
        }

        return $response;
    }
}
