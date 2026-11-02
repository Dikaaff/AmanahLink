<?php

namespace App\Models;

use App\Enums\ReceiptStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'transaction_id',
    'file_path',
    'ocr_payload',
    'confidence',
    'status',
    'reviewed_by',
    'reviewed_at',
    'rejection_reason',
])]
class Receipt extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'ocr_payload' => 'array',
            'confidence' => 'decimal:2',
            'status' => ReceiptStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
