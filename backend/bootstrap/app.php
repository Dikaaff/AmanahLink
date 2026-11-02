<?php

declare(strict_types=1);

use App\Exceptions\CampaignLockedException;
use App\Exceptions\CampaignNotActiveException;
use App\Exceptions\DuplicateRequestException;
use App\Exceptions\IdempotencyMismatchException;
use App\Exceptions\InsufficientFundsException;
use App\Exceptions\InvalidSignatureException;
use App\Exceptions\InvalidStateTransitionException;
use App\Exceptions\LedgerMismatchException;
use App\Exceptions\LimitExceededException;
use App\Exceptions\LimitExpiredException;
use App\Exceptions\MccNotAllowedException;
use App\Http\Middleware\AssignRequestId;
use App\Http\Middleware\RecordAuthorizeMetrics;
use App\Http\Middleware\SecurityHeaders;
use App\Support\ApiError;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [AssignRequestId::class]);
        $middleware->api(append: [RecordAuthorizeMetrics::class, SecurityHeaders::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $isApi = static fn (Request $request): bool => $request->is('api/*');

        $exceptions->render(function (ValidationException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response(
                'VALIDATION_ERROR',
                'Data yang dikirim tidak valid.',
                422,
                ['fields' => $e->errors()],
            );
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response(
                'UNAUTHENTICATED',
                $e->getMessage() !== '' ? $e->getMessage() : 'Silakan login terlebih dahulu.',
                401,
            );
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response(
                'FORBIDDEN',
                'Anda tidak memiliki izin untuk tindakan ini.',
                403,
            );
        });

        $exceptions->render(function (JsonException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('BAD_REQUEST', 'Body permintaan bukan JSON yang valid.', 400);
        });

        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response(
                'FORBIDDEN',
                'Anda tidak memiliki izin untuk tindakan ini.',
                403,
            );
        });

        $exceptions->render(function (UnauthorizedHttpException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response(
                'UNAUTHENTICATED',
                'Silakan login terlebih dahulu.',
                401,
            );
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            $retryAfter = (int) ($e->getHeaders()['Retry-After'] ?? 60);

            return ApiError::response(
                'RATE_LIMITED',
                'Terlalu banyak permintaan. Coba lagi nanti.',
                429,
                ['retry_after_seconds' => $retryAfter],
            )->header('Retry-After', (string) $retryAfter);
        });

        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('NOT_FOUND', 'Data yang diminta tidak ditemukan.', 404);
        });

        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('METHOD_NOT_ALLOWED', 'Metode HTTP tidak didukung untuk endpoint ini.', 405);
        });

        $exceptions->render(function (CampaignLockedException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('CAMPAIGN_LOCKED', $e->getMessage(), 409);
        });

        $exceptions->render(function (CampaignNotActiveException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('CAMPAIGN_NOT_ACTIVE', $e->getMessage(), 409);
        });

        $exceptions->render(function (InvalidStateTransitionException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response(
                'CONFLICT_STATE',
                'Perubahan status tidak diizinkan dari kondisi saat ini.',
                409,
                ['from' => $e->from->value, 'to' => $e->to->value],
            );
        });

        $exceptions->render(function (IdempotencyMismatchException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('IDEMPOTENCY_MISMATCH', $e->getMessage(), 422);
        });

        $exceptions->render(function (DuplicateRequestException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('DUPLICATE_REQUEST', $e->getMessage(), 409);
        });

        $exceptions->render(function (MccNotAllowedException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('MCC_NOT_ALLOWED', $e->getMessage(), 403);
        });

        $exceptions->render(function (InsufficientFundsException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('INSUFFICIENT_FUNDS', $e->getMessage(), 409);
        });

        $exceptions->render(function (LimitExceededException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('LIMIT_EXCEEDED', $e->getMessage(), 409, [
                'scope' => $e->scope,
                'remaining' => $e->remaining->toDecimalString(),
            ]);
        });

        $exceptions->render(function (LimitExpiredException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('LIMIT_EXPIRED', $e->getMessage(), 409);
        });

        $exceptions->render(function (InvalidSignatureException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response('INVALID_SIGNATURE', $e->getMessage(), 401);
        });

        $exceptions->render(function (LedgerMismatchException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response(
                'INTERNAL_ERROR',
                'Sistem menemukan ketidaksesuaian data keuangan. Transaksi dibatalkan.',
                500,
            );
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response(
                match ($e->getStatusCode()) {
                    400 => 'BAD_REQUEST',
                    401 => 'UNAUTHENTICATED',
                    403 => 'FORBIDDEN',
                    404 => 'NOT_FOUND',
                    405 => 'METHOD_NOT_ALLOWED',
                    409 => 'CONFLICT_STATE',
                    422 => 'VALIDATION_ERROR',
                    429 => 'RATE_LIMITED',
                    default => 'HTTP_ERROR',
                },
                $e->getMessage() !== '' ? $e->getMessage() : 'Permintaan gagal diproses.',
                $e->getStatusCode(),
            );
        });

        $exceptions->render(function (Throwable $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            return ApiError::response(
                'INTERNAL_ERROR',
                'Terjadi kesalahan pada server.',
                500,
                config('app.debug') ? ['exception' => $e->getMessage()] : [],
            );
        });
    })->create();
