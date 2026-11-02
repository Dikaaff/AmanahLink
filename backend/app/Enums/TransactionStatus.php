<?php

declare(strict_types=1);

namespace App\Enums;

enum TransactionStatus: string
{
    case Requested = 'requested';
    case MccValidated = 'mcc_validated';
    case Authorized = 'authorized';
    case Captured = 'captured';
    case ReceiptPending = 'receipt_pending';
    case Verified = 'verified';
    case Reconciled = 'reconciled';
    case Disputed = 'disputed';
    case Failed = 'failed';

    /**
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Requested => [self::MccValidated, self::Failed],
            self::MccValidated => [self::Authorized, self::Failed],
            self::Authorized => [self::Captured, self::Failed],
            self::Captured => [self::ReceiptPending],
            self::ReceiptPending => [self::Verified, self::Disputed],
            self::Verified => [self::Reconciled, self::Disputed],
            self::Reconciled => [],
            self::Disputed => [self::Reconciled],
            self::Failed => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }

    public function isTerminal(): bool
    {
        return $this->allowedTransitions() === [];
    }

    public function movesFunds(): bool
    {
        return in_array($this, [self::Captured, self::Reconciled], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::Requested => 'Diminta',
            self::MccValidated => 'MCC Tervalidasi',
            self::Authorized => 'Diotorisasi',
            self::Captured => 'Dana Ditarik',
            self::ReceiptPending => 'Menunggu Nota',
            self::Verified => 'Nota Terverifikasi',
            self::Reconciled => 'Terekonsiliasi',
            self::Disputed => 'Sengketa',
            self::Failed => 'Gagal',
        };
    }
}
