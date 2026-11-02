<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\MccCode;
use App\Models\Merchant;
use App\Models\User;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_money_columns_use_decimal_15_2(): void
    {
        $columns = [
            ['campaigns', 'target_amount'],
            ['campaigns', 'current_amount'],
            ['donations', 'amount'],
        ];

        foreach ($columns as [$table, $column]) {
            $row = DB::selectOne(
                'select column_type as type from information_schema.columns
                 where table_schema = ? and table_name = ? and column_name = ?',
                [DB::getDatabaseName(), $table, $column]
            );

            $this->assertNotNull($row, "Kolom {$table}.{$column} tidak ditemukan.");
            $this->assertSame('decimal(15,2)', strtolower($row->type));
        }
    }

    public function test_campaign_money_is_cast_to_string_not_float(): void
    {
        $campaign = Campaign::factory()->create(['target_amount' => 10_000_000]);

        $this->assertIsString($campaign->target_amount);
        $this->assertSame('10000000.00', $campaign->target_amount);
        $this->assertSame('0.00', $campaign->current_amount);
    }

    public function test_allowed_mcc_array_is_stored_as_json_and_cast_to_array(): void
    {
        $campaign = Campaign::factory()->create(['allowed_mcc_array' => ['5912', '8062']]);

        $raw = DB::table('campaigns')->where('id', $campaign->id)->value('allowed_mcc_array');

        $this->assertJson($raw);
        $this->assertSame(['5912', '8062'], $campaign->refresh()->allowed_mcc_array);
    }

    public function test_campaign_slug_is_unique(): void
    {
        Campaign::factory()->create(['slug' => 'bantu-operasi-jantung']);

        $this->expectException(QueryException::class);

        Campaign::factory()->create(['slug' => 'bantu-operasi-jantung']);
    }

    public function test_zero_amount_donation_is_rejected_by_check_constraint(): void
    {
        $campaign = Campaign::factory()->create();
        $donor = User::factory()->create();

        $this->expectException(QueryException::class);

        DB::table('donations')->insert([
            'campaign_id' => $campaign->id,
            'donor_id' => $donor->id,
            'amount' => 0,
            'payment_ref' => 'PAY-ZERO',
            'status' => 'initiated',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_campaign_with_donations_cannot_be_deleted(): void
    {
        $donation = Donation::factory()->create();

        $this->expectException(QueryException::class);

        DB::table('campaigns')->where('id', $donation->campaign_id)->delete();
    }

    public function test_user_role_defaults_to_donor(): void
    {
        $user = User::factory()->create();

        $this->assertSame(UserRole::Donor, $user->refresh()->role);
    }

    public function test_merchant_mcc_foreign_key_is_enforced(): void
    {
        $this->expectException(QueryException::class);

        Merchant::factory()->create(['mcc' => '0000']);
    }

    public function test_mcc_seeder_blocks_electronics_and_gambling(): void
    {
        $this->seed(MccCodeSeeder::class);

        $this->assertTrue(MccCode::findOrFail('5732')->is_blocked);
        $this->assertTrue(MccCode::findOrFail('7995')->is_blocked);
        $this->assertFalse(MccCode::findOrFail('5912')->is_blocked);
        $this->assertSame('medical', MccCode::findOrFail('5912')->category);
    }
}
