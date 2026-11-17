<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call(MccCodeSeeder::class);
        $this->call(DemoSeeder::class);

        User::factory()->admin()->create([
            'name' => 'Admin AmanahLink',
            'email' => 'admin@amanahlink.test',
        ]);

        // A second reviewer makes the maker-checker rule demoable: the admin
        // who rejects a receipt cannot approve its replacement.
        User::factory()->verifier()->create([
            'name' => 'Verifikator AmanahLink',
            'email' => 'verifier@amanahlink.test',
        ]);
    }
}
