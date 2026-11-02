<?php

namespace Database\Factories;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\Campaign;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Transaction>
 */
class TransactionFactory extends Factory
{
    protected $model = Transaction::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'campaign_id' => Campaign::factory()->active(),
            'user_id' => User::factory()->campaigner(),
            'donation_id' => null,
            'merchant_id' => null,
            'type' => TransactionType::Disbursement,
            'amount' => 50_000,
            'mcc_used' => null,
            'status' => TransactionStatus::Requested,
            'reference_id' => 'TRX-'.Str::upper(Str::random(12)),
            'idempotency_key' => null,
        ];
    }

    public function captured(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TransactionStatus::Captured,
        ]);
    }
}
