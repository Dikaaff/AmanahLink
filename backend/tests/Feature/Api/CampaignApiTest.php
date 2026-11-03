<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\CampaignStatus;
use App\Enums\DonationStatus;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\User;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class CampaignApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Bantu Biaya Operasi Ibu Sari',
            'description' => 'Ibu Sari membutuhkan biaya operasi jantung. Dana hanya akan dipakai di rumah sakit dan apotek yang terdaftar.',
            'target_amount' => '10000000',
            'deadline_at' => now()->addDays(30)->toIso8601String(),
            'allowed_mcc_array' => ['5912', '8062'],
        ], $overrides);
    }

    public function test_a_donor_cannot_create_a_campaign(): void
    {
        Sanctum::actingAs(User::factory()->donor()->create());

        $this->postJson('/api/v1/campaigns', $this->payload())
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_a_campaigner_can_create_a_draft_campaign(): void
    {
        $campaigner = User::factory()->campaigner()->create();
        Sanctum::actingAs($campaigner);

        $response = $this->postJson('/api/v1/campaigns', $this->payload());

        $response->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.current_amount', '0.00')
            ->assertJsonPath('data.allowed_mcc', ['5912', '8062'])
            ->assertJsonPath('data.campaigner.id', $campaigner->id);

        $this->assertDatabaseHas('campaigns', [
            'user_id' => $campaigner->id,
            'slug' => 'bantu-biaya-operasi-ibu-sari',
            'status' => 'draft',
        ]);

        $this->assertDatabaseHas('audit_logs', ['action' => 'campaign.created']);
    }

    public function test_an_unverified_campaigner_cannot_create_a_campaign(): void
    {
        Sanctum::actingAs(User::factory()->campaigner()->unverified()->create());

        $this->postJson('/api/v1/campaigns', $this->payload())
            ->assertForbidden()
            ->assertJsonPath('error.code', 'EMAIL_UNVERIFIED');
    }

    public function test_a_campaigner_can_create_a_campaign_after_verifying_email(): void
    {
        $campaigner = User::factory()->campaigner()->unverified()->create();
        Sanctum::actingAs($campaigner);

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(5),
            ['id' => $campaigner->id, 'hash' => sha1($campaigner->email)],
        );

        $this->getJson(parse_url($url, PHP_URL_PATH).'?'.parse_url($url, PHP_URL_QUERY))
            ->assertOk();

        $campaigner->refresh();

        $this->postJson('/api/v1/campaigns', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft');
    }

    public function test_a_blocked_mcc_code_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->campaigner()->create());

        $response = $this->postJson('/api/v1/campaigns', $this->payload([
            'allowed_mcc_array' => ['5912', '5732'],
        ]));

        $response->assertUnprocessable()->assertJsonPath('error.code', 'VALIDATION_ERROR');

        $fields = $response->json('error.details.fields');
        $this->assertArrayHasKey('allowed_mcc_array.1', $fields);
    }

    public function test_an_unknown_mcc_code_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->postJson('/api/v1/campaigns', $this->payload([
            'allowed_mcc_array' => ['0000'],
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_a_past_deadline_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->postJson('/api/v1/campaigns', $this->payload([
            'deadline_at' => now()->subDay()->toIso8601String(),
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_a_draft_campaign_is_hidden_from_the_public(): void
    {
        $campaign = Campaign::factory()->create(['title' => 'Draf Rahasia']);

        $this->getJson('/api/v1/campaigns/'.$campaign->slug)->assertNotFound();

        Sanctum::actingAs($campaign->campaigner);
        $this->getJson('/api/v1/campaigns/'.$campaign->slug)
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');
    }

    public function test_the_public_index_only_lists_published_campaigns(): void
    {
        Campaign::factory()->create();
        Campaign::factory()->pendingReview()->create();
        Campaign::factory()->active()->create();

        $response = $this->getJson('/api/v1/campaigns')->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertSame('active', $response->json('data.0.status'));
    }

    public function test_submit_then_approve_moves_the_campaign_to_active(): void
    {
        $campaigner = User::factory()->campaigner()->create();
        $campaign = Campaign::factory()->create(['user_id' => $campaigner->id]);

        Sanctum::actingAs($campaigner);
        $this->postJson("/api/v1/campaigns/{$campaign->id}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_review');

        Sanctum::actingAs(User::factory()->verifier()->create());
        $this->postJson("/api/v1/campaigns/{$campaign->id}/review", [
            'decision' => 'approve',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'status' => 'active',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'campaign.approved']);
    }

    public function test_rejecting_requires_a_reason_and_returns_the_campaign_to_draft(): void
    {
        $campaign = Campaign::factory()->pendingReview()->create();
        Sanctum::actingAs(User::factory()->verifier()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/review", [
            'decision' => 'reject',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');

        $this->postJson("/api/v1/campaigns/{$campaign->id}/review", [
            'decision' => 'reject',
            'rejection_reason' => 'Deskripsi tidak jelas.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'status' => 'draft',
            'rejection_reason' => 'Deskripsi tidak jelas.',
        ]);
    }

    public function test_a_donor_cannot_review_a_campaign(): void
    {
        $campaign = Campaign::factory()->pendingReview()->create();
        Sanctum::actingAs(User::factory()->donor()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/review", [
            'decision' => 'approve',
        ])->assertForbidden();
    }

    public function test_staff_can_filter_the_campaign_review_queue(): void
    {
        $pending = Campaign::factory()->pendingReview()->create();
        Campaign::factory()->active()->create();

        Sanctum::actingAs(User::factory()->verifier()->create());

        $this->getJson('/api/v1/campaigns/review-queue?status=pending_review')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pending->id)
            ->assertJsonPath('data.0.status', 'pending_review')
            ->assertJsonPath('data.0.campaigner.id', $pending->user_id);
    }

    public function test_a_campaigner_cannot_access_the_campaign_review_queue(): void
    {
        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->getJson('/api/v1/campaigns/review-queue')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_a_campaign_with_settled_donations_cannot_be_edited(): void
    {
        $campaign = Campaign::factory()->active()->create();
        Donation::factory()->settled()->create([
            'campaign_id' => $campaign->id,
            'status' => DonationStatus::Settled,
        ]);

        Sanctum::actingAs($campaign->campaigner);

        $this->putJson("/api/v1/campaigns/{$campaign->id}", [
            'title' => 'Judul Baru Yang Menipu',
        ])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CAMPAIGN_LOCKED');
    }

    public function test_a_draft_without_donations_can_be_edited(): void
    {
        $campaign = Campaign::factory()->create();
        Sanctum::actingAs($campaign->campaigner);

        $this->putJson("/api/v1/campaigns/{$campaign->id}", [
            'title' => 'Judul Yang Sudah Diperbaiki',
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Judul Yang Sudah Diperbaiki');

        $this->assertDatabaseHas('audit_logs', ['action' => 'campaign.updated']);
    }

    public function test_a_stranger_cannot_edit_someone_elses_campaign(): void
    {
        $campaign = Campaign::factory()->create(['status' => CampaignStatus::Draft]);
        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->putJson("/api/v1/campaigns/{$campaign->id}", [
            'title' => 'Bukan Punyaku',
        ])->assertForbidden();
    }
}
