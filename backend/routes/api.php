<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CampaignController;
use App\Http\Controllers\Api\V1\DisbursementController;
use App\Http\Controllers\Api\V1\DisbursementLimitController;
use App\Http\Controllers\Api\V1\DonationController;
use App\Http\Controllers\Api\V1\EmailVerificationController;
use App\Http\Controllers\Api\V1\MerchantController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PaymentWebhookController;
use App\Http\Controllers\Api\V1\ReceiptController;
use App\Http\Controllers\Api\V1\WebhookEventController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:auth.register');
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:auth.login');
    Route::get('auth/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->name('verification.verify')
        ->middleware('signed');

    Route::post('webhooks/payments/{provider}', [PaymentWebhookController::class, 'handle'])
        ->middleware('throttle:webhooks.payments');

    Route::get('campaigns', [CampaignController::class, 'index']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/email/resend', [EmailVerificationController::class, 'resend'])
            ->middleware('throttle:auth.email.resend');

        Route::get('campaigns/mine', [CampaignController::class, 'mine']);
        Route::get('campaigns/review-queue', [CampaignController::class, 'reviewQueue']);
        Route::middleware('email.verified')->group(function (): void {
            Route::post('campaigns', [CampaignController::class, 'store']);
            Route::put('campaigns/{campaign}', [CampaignController::class, 'update']);
            Route::post('campaigns/{campaign}/submit', [CampaignController::class, 'submit']);
            Route::post('campaigns/{campaign}/freeze', [CampaignController::class, 'freeze']);
            Route::post('campaigns/{campaign}/unfreeze', [CampaignController::class, 'unfreeze']);
            Route::post('campaigns/{campaign}/close', [CampaignController::class, 'close']);
            Route::put('campaigns/{campaign}/disbursement-limit', [DisbursementLimitController::class, 'upsert']);
            Route::post('donations', [DonationController::class, 'store']);
            Route::post('disbursements', [DisbursementController::class, 'store']);
            Route::post('disbursements/{transaction}/receipts', [ReceiptController::class, 'store']);
        });
        Route::post('campaigns/{campaign}/review', [CampaignController::class, 'review']);
        Route::get('campaigns/{campaign}/disbursement-limit', [DisbursementLimitController::class, 'show']);

        Route::get('donations', [DonationController::class, 'index']);

        Route::get('merchants', [MerchantController::class, 'index']);
        Route::post('merchants', [MerchantController::class, 'store']);
        Route::put('merchants/{merchant}', [MerchantController::class, 'update']);
        Route::patch('merchants/{merchant}/verify', [MerchantController::class, 'verify']);

        Route::get('disbursements', [DisbursementController::class, 'index']);

        Route::get('receipts', [ReceiptController::class, 'index']);
        Route::post('receipts/{receipt}/review', [ReceiptController::class, 'review']);

        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead']);

        Route::get('admin/dashboard', AdminDashboardController::class);
        Route::get('admin/webhook-events', [WebhookEventController::class, 'index']);
        Route::post('admin/webhook-events/{webhookEvent}/replay', [WebhookEventController::class, 'replay']);

        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::match(['put', 'patch', 'delete'], 'audit-logs/{auditLog}', [AuditLogController::class, 'immutable']);
    });

    Route::get('campaigns/{campaign:slug}', [CampaignController::class, 'show']);
});
