<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'request_hash', 'response_status', 'response_body', 'locked_until', 'expires_at'])]
class IdempotencyKey extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'response_body' => 'array',
            'response_status' => 'integer',
            'locked_until' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function isCompleted(): bool
    {
        return $this->response_status !== null;
    }
}
