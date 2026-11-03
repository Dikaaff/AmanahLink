import { expect, test } from "@playwright/test";

test.describe("critical authentication paths", () => {
  test("campaigner can log in and reach the campaign dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("budi@amanahlink.test");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Halo, Budi Santoso" })).toBeVisible();
    await expect(page.getByText("Penggalang Dana · budi@amanahlink.test")).toBeVisible();
    await expect(page.getByRole("link", { name: "Buat kampanye" })).toBeVisible();
  });

  test("a new donor reaches the dashboard with an email verification warning", async ({ page }) => {
    const email = `playwright-${Date.now()}@amanahlink.test`;

    await page.goto("/register");
    await page.getByLabel("Nama lengkap").fill("Playwright Donor");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("Rahasia123!");
    await page.getByLabel("Ulangi password").fill("Rahasia123!");
    await page.getByRole("button", { name: "Daftar" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Halo, Playwright Donor" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Email belum diverifikasi" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kirim ulang tautan" })).toBeVisible();
  });
});
