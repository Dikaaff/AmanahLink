import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3104",
    actionTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  expect: { timeout: 45_000 },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: [
    {
      command: "php ../backend/artisan serve --host=127.0.0.1 --port=8000",
      url: "http://127.0.0.1:8000/healthz",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3104",
      url: "http://127.0.0.1:3104/login",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
