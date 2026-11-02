<?php

namespace Tests\Unit;

use App\Enums\CampaignStatus;
use App\Enums\DonationStatus;
use PHPUnit\Framework\TestCase;

class CampaignStatusTest extends TestCase
{
    public function test_active_campaign_can_be_funded_frozen_expired_or_closed(): void
    {
        $this->assertTrue(CampaignStatus::Active->canTransitionTo(CampaignStatus::Funded));
        $this->assertTrue(CampaignStatus::Active->canTransitionTo(CampaignStatus::Frozen));
        $this->assertTrue(CampaignStatus::Active->canTransitionTo(CampaignStatus::Expired));
        $this->assertTrue(CampaignStatus::Active->canTransitionTo(CampaignStatus::Closed));
    }

    public function test_draft_cannot_jump_straight_to_active(): void
    {
        $this->assertFalse(CampaignStatus::Draft->canTransitionTo(CampaignStatus::Active));
        $this->assertTrue(CampaignStatus::Draft->canTransitionTo(CampaignStatus::PendingReview));
    }

    public function test_pending_review_can_be_approved_or_rejected(): void
    {
        $this->assertTrue(CampaignStatus::PendingReview->canTransitionTo(CampaignStatus::Active));
        $this->assertTrue(CampaignStatus::PendingReview->canTransitionTo(CampaignStatus::Draft));
    }

    public function test_frozen_campaign_cannot_expire_directly(): void
    {
        $this->assertFalse(CampaignStatus::Frozen->canTransitionTo(CampaignStatus::Expired));
        $this->assertTrue(CampaignStatus::Frozen->canTransitionTo(CampaignStatus::Active));
    }

    public function test_only_refunded_is_terminal_for_campaigns(): void
    {
        $this->assertTrue(CampaignStatus::Refunded->isTerminal());
        $this->assertFalse(CampaignStatus::Closed->isTerminal());
        $this->assertFalse(CampaignStatus::Active->isTerminal());
    }

    public function test_donations_are_only_accepted_when_active_or_funded(): void
    {
        $this->assertTrue(CampaignStatus::Active->acceptsDonations());
        $this->assertTrue(CampaignStatus::Funded->acceptsDonations());

        foreach ([
            CampaignStatus::Draft,
            CampaignStatus::PendingReview,
            CampaignStatus::Frozen,
            CampaignStatus::Expired,
            CampaignStatus::Closed,
            CampaignStatus::Refunded,
        ] as $status) {
            $this->assertFalse($status->acceptsDonations());
        }
    }

    public function test_disbursement_follows_the_same_gate_as_donations(): void
    {
        foreach (CampaignStatus::cases() as $status) {
            $this->assertSame($status->acceptsDonations(), $status->allowsDisbursement());
        }
    }

    public function test_donation_status_machine(): void
    {
        $this->assertTrue(DonationStatus::Initiated->canTransitionTo(DonationStatus::Pending));
        $this->assertTrue(DonationStatus::Pending->canTransitionTo(DonationStatus::Settled));
        $this->assertTrue(DonationStatus::Settled->canTransitionTo(DonationStatus::Refunded));
        $this->assertFalse(DonationStatus::Settled->canTransitionTo(DonationStatus::Pending));
        $this->assertFalse(DonationStatus::Failed->canTransitionTo(DonationStatus::Settled));
        $this->assertTrue(DonationStatus::Failed->isTerminal());
        $this->assertTrue(DonationStatus::Settled->countsTowardsBalance());
    }
}
