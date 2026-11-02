<?php

namespace Tests\Unit;

use App\Enums\DonationStatus;
use App\Enums\ReceiptStatus;
use App\Enums\TransactionStatus;
use PHPUnit\Framework\TestCase;

class StateMachineTest extends TestCase
{
    public function test_disbursement_follows_the_happy_path(): void
    {
        $path = [
            TransactionStatus::Requested,
            TransactionStatus::MccValidated,
            TransactionStatus::Authorized,
            TransactionStatus::Captured,
            TransactionStatus::ReceiptPending,
            TransactionStatus::Verified,
            TransactionStatus::Reconciled,
        ];

        for ($i = 0; $i < count($path) - 1; $i++) {
            $this->assertTrue(
                $path[$i]->canTransitionTo($path[$i + 1]),
                "{$path[$i]->value} should transition to {$path[$i + 1]->value}"
            );
        }
    }

    public function test_disbursement_cannot_skip_mcc_validation(): void
    {
        $this->assertFalse(TransactionStatus::Requested->canTransitionTo(TransactionStatus::Authorized));
        $this->assertFalse(TransactionStatus::MccValidated->canTransitionTo(TransactionStatus::Captured));
    }

    public function test_captured_transaction_must_pass_receipt_stage_before_reconciliation(): void
    {
        $this->assertFalse(TransactionStatus::Captured->canTransitionTo(TransactionStatus::Reconciled));
        $this->assertTrue(TransactionStatus::Captured->canTransitionTo(TransactionStatus::ReceiptPending));
    }

    public function test_disputed_transaction_can_be_reconciled_after_manual_review(): void
    {
        $this->assertTrue(TransactionStatus::Disputed->canTransitionTo(TransactionStatus::Reconciled));
    }

    public function test_a_donation_can_be_settled_directly_from_initiated(): void
    {
        $this->assertTrue(DonationStatus::Initiated->canTransitionTo(DonationStatus::Settled));
        $this->assertFalse(DonationStatus::Refunded->canTransitionTo(DonationStatus::Settled));
    }

    public function test_receipt_state_machine(): void
    {
        $this->assertTrue(ReceiptStatus::Uploaded->canTransitionTo(ReceiptStatus::Extracting));
        $this->assertTrue(ReceiptStatus::Extracting->canTransitionTo(ReceiptStatus::AutoMatched));
        $this->assertTrue(ReceiptStatus::Extracting->canTransitionTo(ReceiptStatus::NeedsReview));
        $this->assertTrue(ReceiptStatus::AutoMatched->canTransitionTo(ReceiptStatus::Verified));
        $this->assertTrue(ReceiptStatus::NeedsReview->canTransitionTo(ReceiptStatus::Approved));
        $this->assertFalse(ReceiptStatus::Uploaded->canTransitionTo(ReceiptStatus::Approved));
        $this->assertFalse(ReceiptStatus::AutoMatched->canTransitionTo(ReceiptStatus::Approved));
        $this->assertTrue(ReceiptStatus::Verified->isTerminal());
        $this->assertTrue(ReceiptStatus::Approved->isTerminal());
        $this->assertTrue(ReceiptStatus::Rejected->isTerminal());
    }
}
