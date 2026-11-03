<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\PaymentGateway;
use App\Contracts\ReceiptOcr;
use App\Models\User;
use App\Services\Ocr\FakeReceiptOcr;
use App\Services\Ocr\HttpReceiptOcr;
use App\Services\Payment\FakePaymentGateway;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PaymentGateway::class, function (): PaymentGateway {
            return match ((string) config('amanahlink.payment_driver', 'fake')) {
                'fake' => new FakePaymentGateway,
                default => throw new \InvalidArgumentException(
                    'Unsupported payment driver: '.config('amanahlink.payment_driver')
                ),
            };
        });

        $this->app->bind(ReceiptOcr::class, function (): ReceiptOcr {
            return match ((string) config('amanahlink.ocr_driver', 'fake')) {
                'fake' => new FakeReceiptOcr,
                'http' => new HttpReceiptOcr,
                default => throw new \InvalidArgumentException(
                    'Unsupported OCR driver: '.config('amanahlink.ocr_driver')
                ),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('view-dashboard', fn (User $user): bool => $user->isAdmin());
        Gate::define('manage-webhooks', fn (User $user): bool => $user->isAdmin());

        RateLimiter::for('api', function (Request $request): Limit {
            $key = $request->user()?->getAuthIdentifier() ?? $request->ip();

            return Limit::perMinute(60)->by('api:'.$key);
        });

        RateLimiter::for('auth.register', function (Request $request): Limit {
            return Limit::perMinute(10)->by('auth.register:'.$request->ip());
        });

        RateLimiter::for('auth.login', function (Request $request): Limit {
            return Limit::perMinute(20)->by('auth.login:'.$request->ip());
        });

        RateLimiter::for('auth.email.resend', function (Request $request): Limit {
            $actor = $request->user();
            $key = $actor === null
                ? 'ip:'.$request->ip()
                : 'user:'.$actor->getAuthIdentifier().'|ip:'.$request->ip();

            return Limit::perMinute(6)->by('auth.email.resend:'.$key);
        });

        RateLimiter::for('webhooks.payments', function (Request $request): Limit {
            return Limit::perMinute(120)->by(
                'webhooks.payments:'.$request->route('provider').':'.$request->ip(),
            );
        });
    }
}
