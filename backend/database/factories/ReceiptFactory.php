<?php

namespace Database\Factories;

use App\Enums\ReceiptStatus;
use App\Models\Receipt;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Receipt>
 */
class ReceiptFactory extends Factory
{
    protected $model = Receipt::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'transaction_id' => Transaction::factory()->captured(),
            'file_path' => 'receipts/'.fake()->uuid().'.jpg',
            'ocr_payload' => null,
            'confidence' => null,
            'status' => ReceiptStatus::Uploaded,
        ];
    }

    public function needsReview(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ReceiptStatus::NeedsReview,
            'confidence' => 0.52,
        ]);
    }
}
