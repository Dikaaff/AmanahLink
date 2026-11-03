<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Throwable;

final class HealthController
{
    public function healthz(): JsonResponse
    {
        return $this->response('ok', [], 200);
    }

    public function readyz(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'queue' => $this->checkQueue(),
            'ocr' => $this->checkOcr(),
        ];
        $ready = collect($checks)->every(
            static fn (array $check): bool => $check['status'] === 'ok'
        );

        return $this->response($ready ? 'ok' : 'unavailable', $checks, $ready ? 200 : 503);
    }

    /**
     * @return array{status: string, driver?: string}
     */
    private function checkDatabase(): array
    {
        try {
            DB::select('select 1');

            return ['status' => 'ok', 'driver' => (string) config('database.default')];
        } catch (Throwable $exception) {
            report($exception);

            return ['status' => 'failed'];
        }
    }

    /**
     * @return array{status: string, driver?: string, pending?: int}
     */
    private function checkQueue(): array
    {
        $driver = (string) config('queue.default');

        try {
            $pending = Queue::connection($driver)->size();

            return [
                'status' => 'ok',
                'driver' => $driver,
                'pending' => (int) $pending,
            ];
        } catch (Throwable $exception) {
            report($exception);

            return ['status' => 'failed', 'driver' => $driver];
        }
    }

    /**
     * @return array{status: string, driver?: string}
     */
    private function checkOcr(): array
    {
        $driver = (string) config('amanahlink.ocr_driver', 'fake');

        if ($driver === 'fake') {
            return ['status' => 'ok', 'driver' => $driver];
        }

        if ($driver !== 'http') {
            return ['status' => 'failed', 'driver' => $driver];
        }

        try {
            $response = Http::timeout(2)
                ->acceptJson()
                ->get(rtrim((string) config('amanahlink.ocr_service_url'), '/').'/healthz');

            if (! $response->successful() || $response->json('status') !== 'ok') {
                return ['status' => 'failed', 'driver' => $driver];
            }

            return ['status' => 'ok', 'driver' => $driver];
        } catch (Throwable $exception) {
            report($exception);

            return ['status' => 'failed', 'driver' => $driver];
        }
    }

    /**
     * @param  array<string, array{status: string, driver?: string, pending?: int}>  $checks
     */
    private function response(string $status, array $checks, int $httpStatus): JsonResponse
    {
        return response()->json([
            'status' => $status,
            'checks' => $checks,
            'timestamp' => now()->toIso8601String(),
        ], $httpStatus)->header('Cache-Control', 'no-store');
    }
}
