import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicPages = [
  { name: "beranda", path: "/" },
  { name: "login", path: "/login" },
  { name: "register", path: "/register" },
];

for (const target of publicPages) {
  test(`no WCAG 2.1 AA violations on ${target.name}`, async ({ page }) => {
    await page.goto(target.path);

    // Audit the loaded page, not the skeleton: cards and tables only exist
    // after the API answers, and they are where the real violations live.
    if (target.name === "beranda") {
      await expect(
        page.getByRole("link", { name: "Bantu Biaya Operasi Ibu Sari" }),
      ).toBeVisible();
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual(
      [],
    );
  });
}

test("no WCAG 2.1 AA violations on the campaigner dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("budi@amanahlink.test");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("link", { name: "Bantu Biaya Operasi Ibu Sari" }).first(),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual(
    [],
  );
});
