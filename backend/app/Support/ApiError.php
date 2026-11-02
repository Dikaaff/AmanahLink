<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/**
 * Single shape for every API error:
 *
 *   { "error": { "code", "message", "details", "trace_id" } }
 *
 * `code` is a stable machine contract, `message` is human-facing Indonesian,
 * `details` holds field errors or context, and `trace_id` links to logs.
 */
final class ApiError
{
    /**
     * @param  array<string, mixed>  $details
     */
    public static function response(
        string $code,
        string $message,
        int $status,
        array $details = [],
    ): JsonResponse {
        return new JsonResponse([
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => $details === [] ? (object) [] : $details,
                'trace_id' => self::traceId(),
            ],
        ], $status);
    }

    public static function traceId(): string
    {
        if (app()->bound('request_id')) {
            return (string) app('request_id');
        }

        $id = (string) Str::ulid();
        app()->instance('request_id', $id);

        return $id;
    }
}
