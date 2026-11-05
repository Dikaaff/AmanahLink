import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email = "siti@amanahlink.test") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function openDonationSheet(page: Page) {
  await page.goto("/campaigns/bantu-biaya-operasi-ibu-sari");
  await expect(
    page.getByRole("heading", { name: "Bantu Biaya Operasi Ibu Sari" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buka formulir donasi" }).click();
  await expect(
    page.getByRole("dialog", { name: "Donasi sekarang" }),
  ).toBeVisible();
}

test("P3 donation sheet keeps a dirty draft behind an explicit discard step", async ({
  page,
}) => {
  await login(page);
  await openDonationSheet(page);

  await page.getByLabel("Nominal (Rp)").fill("75000");
  await page.getByRole("button", { name: "Tutup" }).click();

  await expect(
    page.getByRole("alertdialog", { name: "Buang perubahan donasi?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tetap di sini" }).click();
  await expect(page.getByLabel("Nominal (Rp)")).toHaveValue("75000");

  await page.getByLabel("Tutup").click();
  await page.getByRole("button", { name: "Buang perubahan" }).click();
  await expect(
    page.getByRole("dialog", { name: "Donasi sekarang" }),
  ).not.toBeVisible();
});

test("P3 donation amount validates on blur without clearing the input", async ({
  page,
}) => {
  await login(page);
  await openDonationSheet(page);

  const amount = page.getByLabel("Nominal (Rp)");
  await amount.fill("5000");
  await amount.blur();

  await expect(page.getByText("Nominal minimal Rp 10.000.")).toBeVisible();
  await expect(amount).toHaveValue("5000");
});

test("P3 disbursement sheet guards a dirty draft", async ({ page }) => {
  await login(page, "budi@amanahlink.test");

  await page
    .getByRole("button", { name: "Cairkan dana", exact: true })
    .click({ timeout: 90_000 });
  await page.locator("#campaign").selectOption({ index: 1 });

  await page.getByLabel("Tutup").click();
  await expect(
    page.getByRole("alertdialog", { name: "Buang perubahan?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lanjut mengisi" }).click();
  await expect(page.locator("#campaign")).toBeVisible();

  await page.getByLabel("Tutup").click();
  await page.getByRole("button", { name: "Buang perubahan" }).click();
  await expect(page.locator("#campaign")).not.toBeVisible();
});
