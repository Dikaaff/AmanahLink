import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export default function globalSetup(): void {
  const seeders = [
    "Database\\Seeders\\MccCodeSeeder",
    "Database\\Seeders\\DemoSeeder",
  ];

  for (const seeder of seeders) {
    execFileSync(
      "php",
      ["../backend/artisan", "db:seed", `--class=${seeder}`, "--no-interaction"],
      {
        cwd: resolve(__dirname, "..", ".."),
        stdio: "inherit",
      },
    );
  }
}
