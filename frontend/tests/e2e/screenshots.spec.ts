import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const outDir = resolve(__dirname, "..", "..", "..", "docs", "e2e", "screenshots");
mkdirSync(outDir, { recursive: true });

async function settleImages(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page
    .waitForFunction(
      () =>
        Array.from(document.images).every(
          (image) => image.complete && image.naturalWidth > 0,
        ),
      null,
      { timeout: 30_000 },
    )
    .catch(() => undefined);
}

async function login(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("budi@amanahlink.test");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Halo, Budi Santoso" })).toBeVisible();
}

test.describe("Fase 5 visual evidence", () => {
  test("campaign feed at desktop and mobile widths", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Kampanye berjalan/ })).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();
    await settleImages(page);
    await page.screenshot({
      path: resolve(outDir, "feed-desktop-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: resolve(outDir, "feed-mobile-390.png"),
      fullPage: true,
    });
  });

  test("campaign detail with cover at desktop and mobile widths", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/campaigns/bantu-biaya-operasi-ibu-sari");
    await expect(
      page.getByRole("heading", { name: "Bantu Biaya Operasi Ibu Sari" }),
    ).toBeVisible();
    await settleImages(page);
    await page.screenshot({
      path: resolve(outDir, "campaign-detail-desktop-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: resolve(outDir, "campaign-detail-mobile-390.png"),
      fullPage: true,
    });
  });

  test("login form at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
    await page.screenshot({
      path: resolve(outDir, "login-mobile-390.png"),
      fullPage: true,
    });
  });

  test("dashboard at desktop and mobile widths", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await page.screenshot({
      path: resolve(outDir, "dashboard-desktop-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: resolve(outDir, "dashboard-mobile-390.png"),
      fullPage: true,
    });
  });
});
