<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\ReceiptStatus;
use App\Http\Requests\ReviewReceiptRequest;
use App\Http\Requests\StoreReceiptRequest;
use App\Http\Resources\ReceiptResource;
use App\Models\Receipt;
use App\Models\Transaction;
use App\Services\ReceiptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

final class ReceiptController
{
    public function __construct(private readonly ReceiptService $receipts) {}

    public function store(StoreReceiptRequest $request, Transaction $transaction): JsonResponse
    {
        abort_if(
            $transaction->receipt()->exists(),
            409,
            'Transaksi ini sudah memiliki nota.',
        );

        $receipt = $this->receipts->upload(
            $request->user(),
            $transaction,
            $request->file('file'),
        );

        return response()->json([
            'data' => new ReceiptResource($receipt),
        ], 202);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Receipt::class);

        $query = Receipt::query()->with('transaction')->latest();

        if ($request->filled('status')) {
            $status = ReceiptStatus::tryFrom($request->string('status')->toString());

            if ($status === null) {
                throw ValidationException::withMessages([
                    'status' => ['Status nota tidak dikenal.'],
                ]);
            }

            $query->where('status', $status->value);
        }

        return ReceiptResource::collection($query->paginate(15)->withQueryString());
    }

    public function review(ReviewReceiptRequest $request, Receipt $receipt): JsonResponse
    {
        $reviewed = $this->receipts->review(
            $receipt,
            $request->user(),
            $request->string('decision')->toString(),
            $request->input('rejection_reason'),
        );

        return response()->json([
            'data' => new ReceiptResource($reviewed),
        ]);
    }
}
