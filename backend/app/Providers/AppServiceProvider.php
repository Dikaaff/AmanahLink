<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\PaymentGateway;
use App\Contracts\ReceiptOcr;
use App\Services\Ocr\FakeReceiptOcr;
use App\Services\Ocr\HttpReceiptOcr;
use App\Services\Payment\FakePaymentGateway;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
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
        RateLimiter::for('api', function (Request $request): Limit {
            $key = $request->user()?->getAuthIdentifier() ?? $request->ip();

            return Limit::perMinute(60)->by('api:'.$key);
        });
    }
}
