<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\ReceiptStatus;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Http\Requests\ReviewReceiptRequest;
use App\Http\Requests\StoreReceiptRequest;
use App\Http\Resources\ReceiptResource;
use App\Models\Receipt;
use App\Models\Transaction;
use App\Services\ReceiptService;
use App\Services\SpendingHoldService;
use Illuminate\Database\Eloquent\Builder;
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
        $latest = $transaction->receipt()->first();

        $canAddReplacement = $transaction->status === TransactionStatus::Disputed
            && $latest?->status === ReceiptStatus::Rejected;

        abort_if(
            $latest !== null && ! $canAddReplacement,
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

    /**
     * Counts for the Nota badge: payments still waiting for proof, and the
     * subset past the deadline that currently holds spending.
     */
    public function pendingCount(Request $request): JsonResponse
    {
        $user = $request->user();
        $isStaff = $user !== null && $user->role->canReviewReceipts();

        $base = fn (): Builder => Transaction::query()
            ->where('type', TransactionType::Disbursement->value)
            ->whereIn('status', [
                TransactionStatus::Settled->value,
                TransactionStatus::ReceiptPending->value,
            ])
            ->when(
                ! $isStaff,
                fn (Builder $query) => $query->whereHas(
                    'campaign',
                    fn (Builder $campaign) => $campaign->where('user_id', $user?->getKey()),
                ),
            );

        return response()->json([
            'data' => [
                'pending' => $base()->count(),
                'overdue' => $base()
                    ->whereNotNull('settled_at')
                    ->where('settled_at', '<=', now()->subDays(SpendingHoldService::RECEIPT_DUE_DAYS))
                    ->count(),
            ],
        ]);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Receipt::class);

        $user = $request->user();

        $query = Receipt::query()
            ->with(['transaction.campaign'])
            ->latest();

        if ($user === null || ! $user->role->canReviewReceipts()) {
            $query->whereHas('transaction.campaign', function (Builder $builder) use ($user): void {
                $builder->where('user_id', $user?->getKey());
            });
        }

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
