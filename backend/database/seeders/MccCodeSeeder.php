<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MccCodeSeeder extends Seeder
{
    /**
     * Master list of merchant category codes accepted by the platform.
     *
     * Blocked codes are still stored so that rejection messages can explain
     * why a category is not allowed instead of returning a generic 422.
     */
    public function run(): void
    {
        $now = now();

        $codes = [
            ['code' => '5912', 'title' => 'Apotek dan Toko Obat', 'category' => 'medical', 'is_blocked' => false],
            ['code' => '8062', 'title' => 'Rumah Sakit', 'category' => 'medical', 'is_blocked' => false],
            ['code' => '8011', 'title' => 'Praktik Dokter', 'category' => 'medical', 'is_blocked' => false],
            ['code' => '0742', 'title' => 'Klinik Hewan', 'category' => 'medical', 'is_blocked' => false],
            ['code' => '5411', 'title' => 'Minimarket dan Supermarket', 'category' => 'daily_need', 'is_blocked' => false],
            ['code' => '8211', 'title' => 'Sekolah dan Lembaga Pendidikan', 'category' => 'education', 'is_blocked' => false],
            ['code' => '8220', 'title' => 'Perguruan Tinggi', 'category' => 'education', 'is_blocked' => false],
            ['code' => '5732', 'title' => 'Toko Elektronik', 'category' => 'retail', 'is_blocked' => true],
            ['code' => '7995', 'title' => 'Taruhan dan Perjudian', 'category' => 'gambling', 'is_blocked' => true],
        ];

        DB::table('mcc_codes')->upsert(
            array_map(fn (array $row) => $row + [
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ], $codes),
            ['code'],
            ['title', 'category', 'is_blocked', 'is_active', 'updated_at'],
        );
    }
}
