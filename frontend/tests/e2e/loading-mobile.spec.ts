import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("L04 and L09/L19 skeletons fit the 390px viewport", async ({ page }) => {
  await page.route("**/api/v1/campaigns*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    await route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByRole("status", { name: "Memuat kampanye" }),
  ).toBeVisible();

  const homeOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(homeOverflow).toBeLessThanOrEqual(0);

  for (const endpoint of [
    "**/api/v1/donations*",
    "**/api/v1/disbursements*",
    "**/api/v1/campaigns/mine*",
    "**/api/v1/receipts*",
    "**/api/v1/merchants*",
  ]) {
    await page.route(endpoint, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      await route.continue();
    });
  }

  await page
    .getByRole("banner")
    .getByRole("link", { name: "Masuk" })
    .click();
  await page.getByLabel("Email").fill("budi@amanahlink.test");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("status", { name: "Memuat dasbor" }),
  ).toBeVisible();

  const dashboardOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(dashboardOverflow).toBeLessThanOrEqual(0);
});
