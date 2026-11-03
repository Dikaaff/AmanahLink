<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class EmailVerificationController
{
    public function verify(Request $request, int $id, string $hash): JsonResponse
    {
        $user = User::query()->findOrFail($id);

        abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403);

        if ($user instanceof MustVerifyEmail && ! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return response()->json(['data' => new UserResource($user->refresh())]);
    }

    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof MustVerifyEmail || $user->hasVerifiedEmail()) {
            return response()->json(['data' => new UserResource($user)]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'data' => new UserResource($user),
            'message' => 'Tautan verifikasi email sudah dikirim ulang.',
        ], 202);
    }
}
