import { expect, test } from "@playwright/test";

test("sheet, dialog, and toast primitives preserve context and feedback", async ({
  page,
}) => {
  await page.goto("/design/components");

  await page.getByRole("button", { name: "Buka sheet filter" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Filter kampanye")).toBeVisible();
  await sheet.getByLabel("Tutup").click();
  await expect(sheet).toBeHidden();

  await page.getByRole("button", { name: "Buka dialog nominal" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Input nominal donasi")).toBeVisible();
  await dialog.getByRole("button", { name: "Simpan nominal" }).click();
  await expect(page.getByText("Nominal donasi tersimpan.")).toBeVisible();

  await page.getByRole("button", { name: "Toast gagal" }).click();
  const failure = page.locator("[data-sonner-toast]").filter({ hasText: "Gagal" });
  await expect(failure).toBeVisible();
  await expect(failure.getByRole("button", { name: "Coba lagi" })).toBeVisible();
});
