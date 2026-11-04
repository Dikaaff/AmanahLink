import { expect, test, type Page } from "@playwright/test";

/**
 * R08 states that are not covered by loading.spec.ts: extreme data, keyboard
 * focus, and the layout width left by a 200% browser zoom on a 768px window
 * (768 / 2 = 384 CSS px). All API responses are mocked so the evidence does
 * not depend on seeded database rows.
 *
 * Extreme strings are deliberately unbroken: a 60-character name without
 * spaces is the worst case for wrapping and the case that exposes missing
 * `min-w-0` / `break-words`.
 */

const LONG_TITLE =
  "BantuanBiayaOperasiIbuSariDiRumahSakitUmumDaerahJakartaPusat";
const LONG_MERCHANT =
  "ApotekSehatSentosaCabangJakartaSelatanNomorDuaPuluhTujuh";
const MAX_AMOUNT = "999999999.00";
const ROWS = 50;

const user = {
  id: 2,
  name: "Budi Santoso",
  email: "budi@amanahlink.test",
  role: "campaigner",
  role_label: "Penggalang dana",
  email_verified_at: "2026-11-01T00:00:00.000000Z",
  created_at: "2026-11-01T00:00:00.000000Z",
};

function campaign(index: number) {
  return {
    id: index,
    title: index === 1 ? LONG_TITLE : `Kampanye ${index}`,
    slug: `kampanye-${index}`,
    description:
      "Dana dipakai untuk biaya operasi, obat, dan pemeriksaan lanjutan.",
    status: "active",
    status_label: "Aktif",
    target_amount: MAX_AMOUNT,
    current_amount: MAX_AMOUNT,
    progress_percent: 100,
    allowed_mcc: ["5912"],
    deadline_at: "2027-01-01T00:00:00.000000Z",
    funded_at: null,
    reviewed_at: null,
    is_accepting_donations: true,
    campaigner: { id: 2, name: "Yayasan Contoh" },
    created_at: "2026-11-01T00:00:00.000000Z",
  };
}

function donation(index: number) {
  return {
    id: index,
    amount: MAX_AMOUNT,
    status: "settled",
    status_label: "Dana diterima",
    payment_ref: `VA-${"9".repeat(24)}-${index}`,
    campaign: { id: 1, title: LONG_TITLE, slug: "kampanye-1" },
    expires_at: null,
    settled_at: "2026-11-02T00:00:00.000000Z",
    created_at: "2026-11-02T00:00:00.000000Z",
  };
}

function disbursement(index: number) {
  return {
    id: index,
    reference_id: `DSB-${"8".repeat(32)}-${index}`,
    amount: MAX_AMOUNT,
    status: "captured",
    status_label: "Dana keluar",
    mcc_used: "5912",
    campaign: { id: 1, title: LONG_TITLE, slug: "kampanye-1" },
    merchant: { id: index, name: LONG_MERCHANT },
    receipt: {
      id: index,
      status: "needs_review",
      status_label: "Perlu review",
      confidence: "0.52",
      rejection_reason:
        "NominalTidakCocokDenganNotaDanMerchantTidakTerdaftarPadaKategoriKampanye",
      reviewed_at: null,
      created_at: "2026-11-02T00:00:00.000000Z",
    },
    created_at: "2026-11-02T00:00:00.000000Z",
  };
}

function receipt(index: number) {
  return {
    id: index,
    transaction_id: index,
    status: "needs_review",
    status_label: "Perlu review",
    confidence: 0.52,
    ocr: null,
    rejection_reason:
      "NominalTidakCocokDenganNotaDanMerchantTidakTerdaftarPadaKategoriKampanye",
    reviewed_at: null,
    created_at: "2026-11-02T00:00:00.000000Z",
    transaction: {
      id: index,
      amount: MAX_AMOUNT,
      status: "captured",
      status_label: "Dana keluar",
      campaign: { id: 1, title: LONG_TITLE },
    },
  };
}

function paginated<T>(rows: T[]) {
  return {
    data: rows,
    meta: { current_page: 1, last_page: 1, per_page: ROWS, total: rows.length },
    links: { next: null, prev: null },
  };
}

interface ApiFixture {
  campaigns?: unknown[];
}

async function mockApi(page: Page, fixture: ApiFixture = {}) {
  const campaignRows =
    fixture.campaigns ??
    Array.from({ length: ROWS }, (_, index) => campaign(index + 1));

  await page.route(/\/api\/v1\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");

    switch (path) {
      case "/auth/login":
        return route.fulfill({
          json: { data: { user, token: "resilience-test-token" } },
        });
      case "/auth/me":
        return route.fulfill({ json: { data: user } });
      case "/notifications":
        return route.fulfill({
          json: { data: [], meta: { unread_count: 0 } },
        });
      case "/campaigns":
        return route.fulfill({ json: paginated(campaignRows) });
      case "/campaigns/mine":
        return route.fulfill({ json: paginated(campaignRows) });
      case "/donations":
        return route.fulfill({
          json: paginated(Array.from({ length: ROWS }, (_, index) => donation(index + 1))),
        });
      case "/disbursements":
        return route.fulfill({
          json: paginated(
            Array.from({ length: ROWS }, (_, index) => disbursement(index + 1)),
          ),
        });
      case "/receipts":
        return route.fulfill({
          json: paginated(Array.from({ length: ROWS }, (_, index) => receipt(index + 1))),
        });
      case "/merchants":
        return route.fulfill({ json: paginated([]) });
      default:
        return route.fulfill({
          status: 404,
          json: { error: { code: "NOT_MOCKED", message: path } },
        });
    }
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  expect(overflow, `${label} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
}

async function expectInsideViewport(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  label: string,
) {
  const box = await locator.boundingBox();
  const width = page.viewportSize()?.width ?? 0;

  expect(box, `${label} has no box`).not.toBeNull();
  expect(box!.x, `${label} starts off-screen`).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width, `${label} extends past ${width}px`).toBeLessThanOrEqual(
    width + 1,
  );
}

test.describe("L04 extreme data", () => {
  test("50 campaigns with a 60-character title fit 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApi(page);
    await page.goto("/");

    const title = page.getByRole("link", { name: LONG_TITLE }).first();
    await expect(title).toBeVisible();
    await expectInsideViewport(page, title, "L04 campaign title");
    await expectNoHorizontalOverflow(page, "L04 @390");
    await expect(page.getByText("Kampanye 50", { exact: true })).toBeVisible();
  });

  test("empty result shows the empty state without overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApi(page, { campaigns: [] });
    await page.goto("/");

    await expect(page.getByText("Belum ada kampanye")).toBeVisible();
    await expectNoHorizontalOverflow(page, "L04 empty @390");
  });
});

test.describe("L04 keyboard focus", () => {
  test("every tab stop against 390px shows the 2px ink focus ring", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApi(page, { campaigns: [campaign(1), campaign(2)] });
    await page.goto("/");
    await expect(page.getByRole("link", { name: LONG_TITLE })).toBeVisible();

    const stops: {
      element: string;
      outlineWidth: string;
      outlineOffset: string;
      outlineColor: string;
    }[] = [];

    for (let press = 0; press < 14; press += 1) {
      await page.keyboard.press("Tab");
      // `transition-colors` also animates outline-color; measure the settled ring.
      await page.waitForTimeout(200);

      const stop = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;

        // The Next.js dev overlay is not a product surface; it also owns a
        // portal that can receive Tab in development only.
        if (!element || element === document.body || element.closest("nextjs-portal")) {
          return null;
        }

        const style = getComputedStyle(element);

        return {
          element: `${element.tagName.toLowerCase()}:${(element.textContent ?? "")
            .trim()
            .slice(0, 24)}`,
          outlineWidth: style.outlineWidth,
          outlineOffset: style.outlineOffset,
          outlineColor: style.outlineColor,
        };
      });

      if (stop) stops.push(stop);
    }

    expect(stops.length, "keyboard reaches fewer than four stops").toBeGreaterThanOrEqual(4);

    for (const stop of stops) {
      expect(stop.outlineWidth, `${stop.element} has no 2px ring`).toBe("2px");
      expect(stop.outlineOffset, `${stop.element} ring offset`).toBe("2px");
      expect(stop.outlineColor, `${stop.element} ring colour`).toBe(
        "rgb(10, 10, 10)",
      );
    }
  });
});

test.describe("200% zoom proxy (768px window -> 384 CSS px)", () => {
  for (const width of [384, 320]) {
    test(`L04 stays readable at ${width}px with extreme data`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await mockApi(page);
      await page.goto("/");

      const title = page.getByRole("link", { name: LONG_TITLE }).first();
      await expect(title).toBeVisible();
      await expectInsideViewport(page, title, `L04 title @${width}`);
      await expectNoHorizontalOverflow(page, `L04 @${width}`);
    });
  }
});

test.describe("L09/L19 extreme data", () => {
  test("dashboard with 50 long rows fits 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApi(page);
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: `Halo, ${user.name}` }),
    ).toBeVisible();

    const title = page.getByRole("link", { name: LONG_TITLE }).first();
    await expect(title).toBeVisible();
    await expectInsideViewport(page, title, "L09 campaign title");
    await expect(
      page.getByRole("heading", { name: "Riwayat pencairan" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, "L09/L19 @390");
  });

  test("dashboard table at 768px keeps the page inside the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await mockApi(page);
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Riwayat donasi" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, "L09/L19 @768");
  });
});
