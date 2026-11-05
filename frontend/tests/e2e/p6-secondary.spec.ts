import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const outDir = resolve(__dirname, "..", "..", "..", "docs", "e2e", "screenshots");
mkdirSync(outDir, { recursive: true });

/**
 * P6 — mobile secondary surfaces at 390x844.
 *
 * L11 dashboard, L12 campaign form, L16 limit card, L17 disbursement form
 * (scan simulation) and L19 usage history already share the dashboard route.
 * These tests prove they are usable at 390 with real contracts; all API
 * responses are mocked so the evidence is deterministic.
 */

const user = {
  id: 2,
  name: "Budi Santoso",
  email: "budi@amanahlink.test",
  role: "campaigner",
  role_label: "Penggalang dana",
  email_verified_at: "2026-11-01T00:00:00.000000Z",
  created_at: "2026-11-01T00:00:00.000000Z",
};

const activeCampaign = {
  id: 1,
  title: "Bantu Biaya Operasi Ibu Sari",
  slug: "bantu-biaya-operasi",
  description: "Biaya operasi dan obat di rumah sakit.",
  status: "active",
  status_label: "Aktif",
  target_amount: "10000000.00",
  current_amount: "2500000.00",
  progress_percent: 25,
  allowed_mcc: ["5912"],
  deadline_at: "2027-01-01T00:00:00.000000Z",
  funded_at: null,
  reviewed_at: "2026-11-02T00:00:00.000000Z",
  is_accepting_donations: true,
  campaigner: { id: 2, name: "Budi Santoso" },
  created_at: "2026-11-01T00:00:00.000000Z",
};

const draftCampaign = {
  ...activeCampaign,
  id: 2,
  title: "Draf Kampanye Baru",
  slug: "draf-kampanye-baru",
  status: "draft",
  status_label: "Draf",
  current_amount: "0.00",
  progress_percent: 0,
  is_accepting_donations: false,
};

function donation(index: number, title: string) {
  return {
    id: index,
    amount: "100000.00",
    status: "settled",
    status_label: "Dana diterima",
    payment_ref: `VA-${index}`,
    campaign: { id: 1, title, slug: activeCampaign.slug },
    expires_at: null,
    settled_at: "2026-11-02T00:00:00.000000Z",
    created_at: "2026-11-02T00:00:00.000000Z",
  };
}

function disbursement(index: number, merchant: string) {
  return {
    id: index,
    reference_id: `DSB-${index}0000000000000000000000000000`,
    amount: "50000.00",
    status: "captured",
    status_label: "Dana keluar",
    mcc_used: "5912",
    campaign: {
      id: 1,
      title: activeCampaign.title,
      slug: activeCampaign.slug,
    },
    merchant: { id: index, name: merchant },
    receipt: null,
    created_at: "2026-11-02T00:00:00.000000Z",
  };
}

const limit = {
  campaign_id: 1,
  daily_limit: "5000000.00",
  monthly_limit: "20000000.00",
  used_today: "1000000.00",
  used_this_month: "3000000.00",
  daily_window: "2026-11-04",
  monthly_window: "2026-11",
  expires_at: "2026-12-31T00:00:00.000000Z",
};

const receipt = {
  id: 1,
  transaction_id: 1,
  status: "needs_review",
  status_label: "Perlu review",
  confidence: 0.52,
  ocr: null,
  rejection_reason: "Nominal tidak cocok dengan nota.",
  reviewed_at: null,
  created_at: "2026-11-02T00:00:00.000000Z",
  transaction: {
    id: 1,
    amount: "50000.00",
    status: "captured",
    status_label: "Dana keluar",
    campaign: { id: 1, title: activeCampaign.title },
  },
};

function paginated<T>(rows: T[], meta: Record<string, number> = {}) {
  return {
    data: rows,
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 2,
      total: rows.length,
      ...meta,
    },
    links: { next: null, prev: null },
  };
}

interface Scenario {
  disbursementReply?: { status: number; json: unknown };
  campaignReply?: { status: number; json: unknown };
  simulationReply?: { status: number; json: unknown };
}

async function mockApi(page: Page, scenario: Scenario = {}) {
  await page.route(/\/api\/v1\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    const pageNumber = Number(url.searchParams.get("page") ?? "1");

    if (path === "/auth/login") {
      return route.fulfill({
        json: { data: { user, token: "p6-test-token" } },
      });
    }

    if (path === "/auth/me") return route.fulfill({ json: { data: user } });

    if (path === "/notifications") {
      return route.fulfill({ json: { data: [], meta: { unread_count: 0 } } });
    }

    if (path === "/campaigns" && method === "POST") {
      return route.fulfill(
        scenario.campaignReply ?? {
          json: {
            data: {
              ...draftCampaign,
              id: 3,
              title: "Kampanye Baru dari Form",
              slug: "kampanye-baru",
            },
          },
        },
      );
    }

    if (
      path.startsWith("/campaigns/") &&
      path !== "/campaigns/mine" &&
      !path.endsWith("/disbursement-limit")
    ) {
      return route.fulfill({
        json: {
          data: {
            ...activeCampaign,
            slug: path.split("/").pop(),
          },
        },
      });
    }

    if (path.endsWith("/disbursement-limit")) {
      return route.fulfill({ json: { data: limit } });
    }

    if (path === "/campaigns") {
      return route.fulfill({
        json: paginated([activeCampaign, draftCampaign]),
      });
    }

    if (path === "/campaigns/mine") {
      return route.fulfill({
        json: paginated([activeCampaign, draftCampaign]),
      });
    }

    if (path === "/donations") {
      return route.fulfill({
        json: paginated([donation(1, activeCampaign.title)]),
      });
    }

    if (path === "/disbursements/simulate" && method === "POST") {
      return route.fulfill(
        scenario.simulationReply ?? {
          json: {
            data: {
              allowed: true,
              code: null,
              message: "Pencairan dapat diproses.",
              mcc: "5912",
              allowed_mcc: ["5912"],
              ledger_balance: "2500000.00",
              remaining_today: "4000000.00",
              remaining_month: "17000000.00",
              limit_expires_at: "2026-12-31T00:00:00+00:00",
              details: null,
            },
          },
        },
      );
    }

    if (path === "/disbursements" && method === "POST") {
      return route.fulfill(
        scenario.disbursementReply ?? {
          json: { data: disbursement(9, "Apotek Sehat Sentosa") },
        },
      );
    }

    if (path === "/disbursements") {
      return route.fulfill({
        json:
          pageNumber === 1
            ? paginated(
                [
                  disbursement(1, "Apotek Sehat Sentosa"),
                  disbursement(2, "Klinik Mitra Sehat"),
                ],
                { current_page: 1, last_page: 2, total: 3 },
              )
            : paginated([disbursement(3, "Apotek Halaman Dua")], {
                current_page: 2,
                last_page: 2,
                total: 3,
              }),
      });
    }

    if (path === "/receipts") {
      return route.fulfill({ json: paginated([receipt]) });
    }

    if (path === "/merchants") {
      return route.fulfill({
        json: paginated([
          {
            id: 1,
            name: "Apotek Sehat Sentosa",
            mcc: "5912",
            mcc_title: "Apotek & toko obat",
            city: "Bandung",
            status: "verified",
            status_label: "Terverifikasi",
          },
          {
            id: 2,
            name: "Toko Elektronik Jaya",
            mcc: "5732",
            mcc_title: "Elektronik",
            city: "Bandung",
            status: "verified",
            status_label: "Terverifikasi",
          },
        ]),
      });
    }

    return route.fulfill({
      status: 404,
      json: { error: { code: "NOT_MOCKED", message: path } },
    });
  });
}

async function expectNoOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  expect(overflow, `${label} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
}

async function login(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: `Halo, ${user.name}` }),
  ).toBeVisible();
}

test.describe("P6 mobile secondary @390", () => {
  test("L11 dashboard shows stats, campaigns, and history without overflow", async ({
    page,
  }) => {
    await mockApi(page);
    await login(page);

    await expect(page.getByText("Dana terkumpul")).toBeVisible();
    await expect(page.getByText("Kampanye saya")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Riwayat donasi" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Riwayat pencairan" }),
    ).toBeVisible();
    await expect(
      page
        .locator("section")
        .filter({ hasText: "Riwayat pencairan" })
        .first()
        .getByText(/Apotek Sehat Sentosa/)
        .filter({ visible: true }),
    ).toBeVisible();
    await expectNoOverflow(page, "L11 @390");
  });

  test("L16 campaigner reads limits for the selected campaign", async ({
    page,
  }) => {
    await mockApi(page);
    await login(page);

    await page.locator("#limit-view-campaign").selectOption("1");

    await expect(page.getByText(/Rp\s?5\.000\.000/)).toBeVisible();
    await expect(page.getByText(/Rp\s?20\.000\.000/)).toBeVisible();
    await expect(page.getByText(/Terpakai hari ini/)).toBeVisible();
    await expectNoOverflow(page, "L16 @390");
  });

  test("L17 disbursement form reports a captured transaction", async ({
    page,
  }) => {
    await mockApi(page);
    await login(page);

    await page.getByRole("button", { name: "Cairkan dana", exact: true }).click();
    await page.locator("#campaign").selectOption("1");
    await page.locator("#merchant").selectOption("1");
    await page.locator("#disbursement-amount").fill("50000");
    await page.getByRole("button", { name: "Cairkan dana", exact: true }).click();

    await expect(
      page.getByText(/Pencairan Rp\s?50\.000.*tercatat sebagai captured/),
    ).toBeVisible();
    await expectNoOverflow(page, "L17 success @390");
  });

  test("L17 rejected disbursement names the reason and keeps the form", async ({
    page,
  }) => {
    await mockApi(page, {
      disbursementReply: {
        status: 409,
        json: {
          error: {
            code: "MCC_NOT_ALLOWED",
            message:
              "Transaksi ini tidak bisa diproses di toko elektronik. Dana kampanye hanya bisa dipakai di apotek, rumah sakit, dan klinik.",
          },
        },
      },
    });
    await login(page);

    await page.getByRole("button", { name: "Cairkan dana", exact: true }).click();
    await page.locator("#campaign").selectOption("1");
    await page.locator("#merchant").selectOption("1");
    await page.locator("#disbursement-amount").fill("50000");
    await page.getByRole("button", { name: "Cairkan dana", exact: true }).click();

    await expect(page.getByText(/tidak bisa diproses di toko elektronik/)).toBeVisible();
    await expect(page.locator("#disbursement-amount")).toBeVisible();
    await expectNoOverflow(page, "L17 rejected @390");
  });

  test("L19 usage history paginates at 390", async ({ page }) => {
    await mockApi(page);
    await login(page);

    const history = page
      .locator("section")
      .filter({ hasText: "Riwayat pencairan" })
      .first();

    await expect(
      history.getByText(/Apotek Sehat Sentosa/).filter({ visible: true }),
    ).toBeVisible();
    await history.getByRole("button", { name: "Berikutnya" }).click();
    await expect(
      history.getByText(/Apotek Halaman Dua/).filter({ visible: true }),
    ).toBeVisible();
    await expectNoOverflow(page, "L19 page 2 @390");
  });

  test("L12 campaign form saves a draft from 390", async ({ page }) => {
    await mockApi(page);
    await login(page);

    await page.getByRole("link", { name: "Buat kampanye" }).click();
    await expect(page).toHaveURL(/\/dashboard\/new$/);

    await page.getByLabel("Judul kampanye").fill("Kampanye Baru dari Form");
    await page
      .getByLabel("Deskripsi dan rencana penggunaan dana")
      .fill(
        "Dana akan dipakai untuk biaya operasi, obat, dan pemeriksaan lanjutan di rumah sakit mitra.",
      );
    await page.getByLabel("Target dana (Rp)").fill("10000000");
    await page.getByRole("button", { name: "Simpan draf" }).click();

    await expect(page).toHaveURL(/\/campaigns\/kampanye-baru$/);
  });

  test("L17 simulation route previews without moving money", async ({ page }) => {
    await mockApi(page);
    await login(page);

    await page.getByRole("link", { name: "Simulasi pindai" }).click();
    await expect(page).toHaveURL(/\/dashboard\/simulasi$/);
    await page.locator("#simulation-campaign").selectOption("1");
    await page.locator("#simulation-merchant").selectOption("1");
    await page.locator("#simulation-amount").fill("50000");
    await page.getByRole("button", { name: "Periksa kelayakan" }).click();

    await expect(
      page.getByText("Pencairan dapat diproses", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Sisa limit hari ini/)).toBeVisible();
    await expectNoOverflow(page, "L17 simulation @390");
  });

  test("L17 simulation shows the rejection scope and remaining limit", async ({
    page,
  }) => {
    await mockApi(page, {
      simulationReply: {
        status: 200,
        json: {
          data: {
            allowed: false,
            code: "LIMIT_EXCEEDED",
            message: "Pencairan melebihi limit harian kampanye.",
            details: { scope: "daily", remaining: "10000.00" },
          },
        },
      },
    });
    await login(page);

    await page.getByRole("link", { name: "Simulasi pindai" }).click();
    await page.locator("#simulation-campaign").selectOption("1");
    await page.locator("#simulation-merchant").selectOption("1");
    await page.locator("#simulation-amount").fill("50000");
    await page.getByRole("button", { name: "Periksa kelayakan" }).click();

    await expect(
      page.getByText("Pencairan akan ditolak", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Sisa limit harian: Rp\s?10\.000/)).toBeVisible();
    await expectNoOverflow(page, "L17 rejected simulation @390");
  });

  test("captures the P6 390 evidence", async ({ page }) => {
    await mockApi(page);
    await login(page);

    await page.screenshot({
      path: resolve(outDir, "p6-l11-dashboard-390.png"),
      fullPage: true,
    });

    await page.getByRole("link", { name: "Buat kampanye" }).click();
    await expect(page).toHaveURL(/\/dashboard\/new$/);
    await page.screenshot({
      path: resolve(outDir, "p6-l12-campaign-form-390.png"),
      fullPage: true,
    });

    await page.getByRole("link", { name: "← Dasbor" }).click();
    await page.locator("#limit-view-campaign").selectOption("1");
    await expect(page.getByText(/Rp\s?5\.000\.000/)).toBeVisible();
    await page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Limit pencairan" }),
      })
      .first()
      .screenshot({
        path: resolve(outDir, "p6-l16-limit-card-390.png"),
      });

    await page.getByRole("link", { name: "Simulasi pindai" }).click();
    await page.locator("#simulation-campaign").selectOption("1");
    await page.locator("#simulation-merchant").selectOption("1");
    await page.locator("#simulation-amount").fill("50000");
    await page.getByRole("button", { name: "Periksa kelayakan" }).click();
    await expect(page.getByText(/Sisa limit hari ini/)).toBeVisible();
    await page.screenshot({
      path: resolve(outDir, "p6-l17-simulasi-390.png"),
      fullPage: true,
    });

    await page.getByRole("link", { name: "← Dasbor" }).click();
    await expect(
      page.getByText(/Apotek Sehat Sentosa/).filter({ visible: true }),
    ).toBeVisible();
    await page
      .locator("section")
      .filter({ hasText: "Apotek Sehat Sentosa" })
      .first()
      .screenshot({
        path: resolve(outDir, "p6-l19-riwayat-390.png"),
      });
  });

  test("L12 shows an inline field error when the API rejects the draft", async ({
    page,
  }) => {
    await mockApi(page, {
      campaignReply: {
        status: 422,
        json: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data kampanye belum lengkap.",
            details: { fields: { title: ["Judul kampanye wajib diisi."] } },
          },
        },
      },
    });
    await login(page);

    await page.getByRole("link", { name: "Buat kampanye" }).click();
    await page.getByLabel("Judul kampanye").fill("Kampanye Baru dari Form");
    await page
      .getByLabel("Deskripsi dan rencana penggunaan dana")
      .fill(
        "Dana akan dipakai untuk biaya operasi, obat, dan pemeriksaan lanjutan di rumah sakit mitra.",
      );
    await page.getByRole("button", { name: "Simpan draf" }).click();

    await expect(page.getByText("Judul kampanye wajib diisi.")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/new$/);
    await expectNoOverflow(page, "L12 error @390");
  });
});
