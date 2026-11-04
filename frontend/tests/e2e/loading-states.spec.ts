import { expect, test, type Page } from "@playwright/test";

const CLS_LIMIT = 0.02;

async function trackLayoutShift(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = window as unknown as { __cls: number };
    state.__cls = 0;

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };

        if (!shift.hadRecentInput) state.__cls += shift.value ?? 0;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

async function readCls(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __cls: number }).__cls ?? 0,
  );
}

test("L04 campaign skeleton keeps layout stable", async ({ page }) => {
  await trackLayoutShift(page);
  await page.route("**/api/v1/campaigns*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.continue();
  });

  await page.goto("/");
  await expect(
    page.getByRole("status", { name: "Memuat kampanye" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Memuat kampanye" }),
  ).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Bantu Biaya Operasi Ibu Sari" }),
  ).toBeVisible();

  const cls = await readCls(page);
  console.log(`L04 CLS=${cls.toFixed(4)}`);
  expect(cls).toBeLessThan(CLS_LIMIT);
});

test("L09 and L19 dashboard skeletons keep layout stable", async ({ page }) => {
  for (const endpoint of [
    "**/api/v1/donations*",
    "**/api/v1/disbursements*",
    "**/api/v1/campaigns/mine*",
    "**/api/v1/receipts*",
    "**/api/v1/merchants*",
  ]) {
    await page.route(endpoint, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await route.continue();
    });
  }

  await trackLayoutShift(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill("budi@amanahlink.test");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const skeleton = page.getByRole("status", { name: "Memuat dasbor" });
  await expect(skeleton).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { __cls: number }).__cls = 0;
  });

  await expect(skeleton).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Bantu Biaya Operasi Ibu Sari" }).first(),
  ).toBeVisible();

  const cls = await readCls(page);
  console.log(`L09/L19 CLS=${cls.toFixed(4)}`);
  expect(cls).toBeLessThan(CLS_LIMIT);
});
