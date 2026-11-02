<?php

declare(strict_types=1);

namespace App\Enums;

enum ReceiptStatus: string
{
    case Uploaded = 'uploaded';
    case Extracting = 'extracting';
    case AutoMatched = 'auto_matched';
    case NeedsReview = 'needs_review';
    case Verified = 'verified';
    case Approved = 'approved';
    case Rejected = 'rejected';

    /**
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Uploaded => [self::Extracting],
            self::Extracting => [self::AutoMatched, self::NeedsReview],
            self::AutoMatched => [self::Verified],
            self::NeedsReview => [self::Approved, self::Rejected],
            self::Verified => [],
            self::Approved => [],
            self::Rejected => [],
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

    public function label(): string
    {
        return match ($this) {
            self::Uploaded => 'Diunggah',
            self::Extracting => 'Membaca Nota',
            self::AutoMatched => 'Cocok Otomatis',
            self::NeedsReview => 'Perlu Review',
            self::Verified => 'Terverifikasi',
            self::Approved => 'Disetujui',
            self::Rejected => 'Ditolak',
        };
    }
}
