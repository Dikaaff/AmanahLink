import { defineConfig, devices } from "@playwright/test";

/**
 * Mock-only E2E for P4/P5: starts Next.js without the Laravel/MySQL backend
 * because every API request is intercepted by the specs themselves.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3104",
    actionTimeout: 30_000,
    trace: "retain-on-failure",
    video: "off",
  },
  expect: { timeout: 45_000 },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3104",
    url: "http://127.0.0.1:3104/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
