import { expect, test } from "@playwright/test";

test("donor settles a demo payment and sees the updated campaign balance", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("siti@amanahlink.test");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Kampanye" }).click();
  await page.getByRole("link", { name: "Bantu Biaya Operasi Ibu Sari" }).click();
  await expect(
    page.getByRole("heading", { name: "Bantu Biaya Operasi Ibu Sari" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Buka formulir donasi" }).click();
  await expect(
    page.getByRole("dialog", { name: "Donasi sekarang" }),
  ).toBeVisible();
  await page.getByLabel("Nominal (Rp)").fill("100000");
  await page.getByRole("button", { name: /^Donasi Rp/ }).click();
  await expect(page.getByText("Instruksi pembayaran dibuat.")).toBeVisible();

  await page.getByRole("button", { name: "Simulasikan pembayaran (demo)" }).click();
  await expect(page.getByText("Pembayaran berhasil.")).toBeVisible();
  await expect(page.getByText(/Saldo sekarang/)).toBeVisible();
  await page.getByRole("button", { name: "Selesai" }).click();
});
