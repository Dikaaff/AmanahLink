import { expect, test } from "@playwright/test";

test("campaigner scans a merchant QR, passes the MCC check, then disburses", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("budi@amanahlink.test");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Dana", exact: true }).click();
  await page.getByRole("link", { name: "Pindai", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pindai QR merchant" }),
  ).toBeVisible();

  const campaignOption = page
    .getByLabel("Kampanye")
    .locator("option")
    .filter({ hasText: "Bantu Biaya Operasi Ibu Sari" });

  await expect(campaignOption).toHaveCount(1, { timeout: 60_000 });
  await page
    .getByLabel("Kampanye")
    .selectOption({ label: "Bantu Biaya Operasi Ibu Sari" });
  await page.getByLabel("Nominal yang dibayarkan (Rp)").fill("25000");

  await page.getByRole("button", { name: "Tampilkan QR merchant" }).click();

  const merchantCard = page
    .getByRole("listitem")
    .filter({ hasText: "Apotek Sehat Sentosa" });
  await expect(merchantCard).toBeVisible({ timeout: 60_000 });
  await merchantCard.getByRole("button", { name: "Pakai kode" }).click();

  const qrField = page.getByLabel("Kode QR merchant");
  await expect(qrField).toHaveValue(/^AMANAH:MERCHANT:\d+:5912:/);

  await page.getByRole("button", { name: "Periksa kelayakan" }).click();

  await expect(page.getByText("Merchant cocok dengan kampanye")).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByRole("heading", { name: "Apotek Sehat Sentosa" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /^Otorisasi Rp/ }).click();
  await expect(
    page.getByRole("alertdialog", { name: "Otorisasi pembayaran sekarang?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ya, otorisasi" }).click();

  await expect(page.getByText("Pembayaran ke merchant tercatat")).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByText(/dibayarkan ke Apotek Sehat Sentosa/),
  ).toBeVisible();
});
