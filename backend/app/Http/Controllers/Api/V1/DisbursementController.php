<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\TransactionType;
use App\Http\Requests\StoreDisbursementRequest;
use App\Http\Resources\DisbursementResource;
use App\Models\Transaction;
use App\Services\DisbursementService;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

final class DisbursementController
{
    public function __construct(private readonly DisbursementService $disbursements) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Transaction::class);

        $query = Transaction::query()
            ->where('type', TransactionType::Disbursement->value)
            ->with(['campaign', 'merchant', 'receipt'])
            ->latest();

        if (! $request->user()->isAdmin()) {
            $query->whereHas('campaign', fn ($campaigns) => $campaigns
                ->where('user_id', $request->user()->getKey()));
        }

        if ($request->filled('campaign_id')) {
            $query->where('campaign_id', $request->integer('campaign_id'));
        }

        return DisbursementResource::collection($query->paginate(15)->withQueryString());
    }

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
