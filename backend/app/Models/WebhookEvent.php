<?php

namespace App\Models;

use App\Enums\WebhookStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['provider', 'external_id', 'payload', 'status', 'attempts', 'last_error', 'processed_at'])]
class WebhookEvent extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'status' => WebhookStatus::class,
            'processed_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }

    public function markProcessed(): void
    {
        $this->forceFill([
            'status' => WebhookStatus::Processed,
            'processed_at' => now(),
        ])->save();
    }

    public function markFailed(string $error): void
    {
        $this->forceFill([
            'status' => $this->attempts >= 3 ? WebhookStatus::DeadLetter : WebhookStatus::Failed,
            'attempts' => $this->attempts + 1,
            'last_error' => $error,
        ])->save();
    }
}
