<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * In-app inbox for the authenticated user (US-28). A notification always
 * belongs to exactly one recipient; ids from other users are not readable.
 */
final class NotificationController
{
    public function index(Request $request): AnonymousResourceCollection|JsonResponse
    {
        $request->validate([
            'unread' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();

        $query = $user->notifications()
            ->when(
                $request->boolean('unread'),
                fn ($builder) => $builder->whereNull('read_at'),
            )
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        $page = $query->cursorPaginate(25);

        return NotificationResource::collection($page)->additional([
            'meta' => [
                'unread_count' => $user->unreadNotifications()->count(),
            ],
        ]);
    }

    public function markRead(Request $request, string $notification): NotificationResource
    {
        $record = $request->user()
            ->notifications()
            ->whereKey($notification)
            ->firstOrFail();

        if ($record->read_at === null) {
            $record->markAsRead();
        }

        return new NotificationResource($record->refresh());
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $marked = $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json([
            'data' => [
                'marked' => $marked,
                'unread_count' => 0,
            ],
        ]);
    }
}
