<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\ApiError;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

final class AuthController
{
    private const LOGIN_ATTEMPTS = 5;

    private const LOGIN_DECAY_SECONDS = 60;

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->string('name')->toString(),
            'email' => Str::lower($request->string('email')->toString()),
            'password' => $request->string('password')->toString(),
            'role' => UserRole::Donor,
        ]);

        event(new Registered($user));

        $token = $user->createToken('api', ['*'])->plainTextToken;

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $throttleKey = $this->throttleKey($request);

        if (RateLimiter::tooManyAttempts($throttleKey, self::LOGIN_ATTEMPTS)) {
            $retryAfter = RateLimiter::availableIn($throttleKey);

            return ApiError::response(
                'RATE_LIMITED',
                'Terlalu banyak percobaan login. Coba lagi nanti.',
                429,
                ['retry_after_seconds' => $retryAfter],
            )->header('Retry-After', (string) $retryAfter);
        }

        $email = Str::lower($request->string('email')->toString());
        $password = $request->string('password')->toString();

        $user = User::query()->where('email', $email)->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            RateLimiter::hit($throttleKey, self::LOGIN_DECAY_SECONDS);

            throw new AuthenticationException('Email atau password salah.');
        }

        RateLimiter::clear($throttleKey);

        $token = $user->createToken('api', ['*'])->plainTextToken;

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    private function throttleKey(Request $request): string
    {
        return 'login:'.Str::lower($request->string('email')->toString()).'|'.$request->ip();
    }
}
