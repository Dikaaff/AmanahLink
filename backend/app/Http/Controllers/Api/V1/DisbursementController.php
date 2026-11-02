<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\StoreDisbursementRequest;
use App\Http\Resources\DisbursementResource;
use App\Services\DisbursementService;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

final class DisbursementController
{
    public function __construct(private readonly DisbursementService $disbursements) {}

    public function store(StoreDisbursementRequest $request): JsonResponse
    {
        $key = trim((string) $request->header('Idempotency-Key'));

        if ($key === '' || strlen($key) > 100) {
            throw ValidationException::withMessages([
                'idempotency_key' => ['Header Idempotency-Key wajib diisi (maksimal 100 karakter).'],
            ]);
        }

        $result = $this->disbursements->pay(
            $request->user(),
            $request->integer('campaign_id'),
            $request->integer('merchant_id'),
            Money::of((string) $request->input('amount')),
            $key,
        );

        return response()->json([
            'data' => new DisbursementResource(
                $result['transaction']->load(['campaign', 'merchant'])
            ),
            'meta' => ['replayed' => $result['replayed']],
        ], $result['replayed'] ? 200 : 201);
    }
}
