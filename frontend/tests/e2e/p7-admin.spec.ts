import { expect, test, type Page } from "@playwright/test";

/**
 * P7 — admin surfaces at 768 and 1440 in the dense mode.
 *
 * /admin, /admin/campaigns, /admin/receipts, /admin/audit-logs and
 * /admin/webhooks are exercised with mocked API responses so the evidence is
 * deterministic and independent of seeded audit history.
 */

const admin = {
  id: 1,
  name: "Admin AmanahLink",
  email: "admin@amanahlink.test",
  role: "admin",
  role_label: "Administrator",
  email_verified_at: "2026-11-01T00:00:00.000000Z",
  created_at: "2026-11-01T00:00:00.000000Z",
};

const adminDashboard = {
  window_hours: 24,
  donations_settled_total: "2500000.00",
  disbursements_captured_total: "500000.00",
  refunds_total: "0.00",
  ledger_campaign_balance: "2000000.00",
  campaign_cache_balance: "2000000.00",
  ledger_mismatch_count: 0,
  ocr_queue_depth: 2,
  receipts_needs_review: 1,
  authorize_p95_ms: 180,
  authorize_sample_count: 42,
  queue: {
    campaigns_pending_review: 1,
    receipts_needs_review: 1,
    disbursements_awaiting_receipt: 1,
    webhook_dead_letter: 1,
    suspended_users: 1,
  },
};

const donorUser = {
  id: 5,
  name: "Siti Aminah",
  email: "siti@amanahlink.test",
  role: "donor",
  role_label: "Donatur",
  email_verified_at: "2026-11-01T00:00:00.000000Z",
  suspended_at: null,
  is_suspended: false,
  created_at: "2026-11-01T00:00:00.000000Z",
};

const suspendedUser = {
  id: 6,
  name: "Akun Ditahan",
  email: "ditahan@amanahlink.test",
  role: "campaigner",
  role_label: "Penggalang Dana",
  email_verified_at: "2026-11-01T00:00:00.000000Z",
  suspended_at: "2026-11-05T00:00:00.000000Z",
  is_suspended: true,
  created_at: "2026-11-01T00:00:00.000000Z",
};

const disbursement = {
  id: 4,
  reference_id: "TRX-ADMIN-1",
  amount: "50000.00",
  status: "receipt_pending",
  status_label: "Menunggu Nota",
  mcc_used: "5912",
  campaign: {
    id: 7,
    title: "Bantu Biaya Operasi Ibu Sari",
    slug: "bantu-biaya-operasi",
  },
  merchant: { id: 3, name: "Apotek Sehat Sentosa" },
  receipt: null,
  created_at: "2026-11-03T00:00:00.000000Z",
};

const pendingCampaign = {
  id: 7,
  title: "Bantu Biaya Operasi Ibu Sari",
  slug: "bantu-biaya-operasi",
  description: "Biaya operasi dan obat di rumah sakit.",
  status: "pending_review",
  status_label: "Menunggu Review",
  target_amount: "10000000.00",
  current_amount: "2500000.00",
  progress_percent: 25,
  allowed_mcc: ["5912"],
  deadline_at: "2027-01-01T00:00:00.000000Z",
  funded_at: null,
  reviewed_at: null,
  rejection_reason: null,
  freeze_reason: null,
  is_accepting_donations: false,
  campaigner: { id: 2, name: "Budi Santoso" },
  created_at: "2026-11-01T00:00:00.000000Z",
};

const receipt = {
  id: 11,
  transaction_id: 4,
  status: "needs_review",
  status_label: "Perlu Review",
  confidence: 0.52,
  ocr: {
    merchant_name: "Apotek Sehat Sentosa",
    amount: "50000",
    date: "2026-11-03",
  },
  rejection_reason: null,
  reviewed_at: null,
  created_at: "2026-11-03T00:00:00.000000Z",
};

const auditLog = {
  id: 31,
  actor_id: 1,
  action: "campaign.approved",
  subject_type: "App\\Models\\Campaign",
  subject_id: 7,
  before: { status: "pending_review" },
  after: { status: "active" },
  ip_address: "127.0.0.1",
  user_agent: "Playwright",
  created_at: "2026-11-03T00:00:00.000000Z",
};

const webhookEvent = {
  id: 9,
  provider: "fake",
  external_id: "ext-9",
  status: "dead_letter",
  attempts: 4,
  last_error: "Provider timeout",
  next_attempt_at: null,
  dead_lettered_at: "2026-11-03T00:00:00.000000Z",
  processed_at: null,
  created_at: "2026-11-03T00:00:00.000000Z",
};

function paginated<T>(rows: T[]) {
  return {
    data: rows,
    meta: { current_page: 1, last_page: 1, per_page: 15, total: rows.length },
    links: { next: null, prev: null },
  };
}

async function mockAdminApi(page: Page) {
  await page.route(/\/api\/v1\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");

    switch (path) {
      case "/auth/login":
        return route.fulfill({
          json: { data: { user: admin, token: "p7-admin-token" } },
        });
      case "/auth/me":
        return route.fulfill({ json: { data: admin } });
      case "/notifications":
        return route.fulfill({ json: { data: [], meta: { unread_count: 0 } } });
      case "/campaigns/mine":
      case "/donations":
        return route.fulfill({ json: paginated([]) });
      case "/disbursements":
        return route.fulfill({ json: paginated([disbursement]) });
      case "/receipts":
        return route.fulfill({ json: paginated([receipt]) });
      case "/admin/users":
        return route.fulfill({ json: paginated([donorUser, suspendedUser]) });
      case "/merchants":
        return route.fulfill({ json: paginated([]) });
      case "/admin/dashboard":
        return route.fulfill({ json: { data: adminDashboard } });
      case "/campaigns/review-queue":
        return route.fulfill({ json: paginated([pendingCampaign]) });
      case "/audit-logs":
        return route.fulfill({ json: paginated([auditLog]) });
      case "/admin/webhook-events":
        return route.fulfill({ json: paginated([webhookEvent]) });
      default:
        return route.fulfill({
          status: 404,
          json: { error: { code: "NOT_MOCKED", message: path } },
        });
    }
  });
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  // Admin accounts land on /admin, staff on /dashboard.
  await expect(page).toHaveURL(/\/(dashboard|admin)$/);
}

async function expectNoOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  expect(overflow, `${label} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
}

for (const width of [768, 1440]) {
  test(`P7 admin surfaces at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    await mockAdminApi(page);
    await login(page);

    await page.locator('nav a[href="/admin"]:visible').first().click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: "Pusat tugas" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Kesehatan platform" }),
    ).toBeVisible();
    await expect(page.getByText("Saldo dari ledger").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Antrean keputusan" }),
    ).toBeVisible();
    // Admin must not get the fundraiser/donor surfaces.
    await expect(page.locator('nav a[href="/dashboard/campaigns"]')).toHaveCount(0);
    await expect(page.locator('nav a[href="/dashboard/pencairan"]')).toHaveCount(0);
    await expect(page.locator('nav a[href="/dashboard/donasi"]')).toHaveCount(0);
    await expectNoOverflow(page, `P7 dashboard @${width}`);

    await page.locator('nav a[href="/admin/campaigns"]:visible').first().click();
    await expect(page).toHaveURL(/\/admin\/campaigns$/);
    await expect(
      page.getByRole("heading", { name: "Operasi kampanye" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Setujui" })).toBeVisible();
    await expectNoOverflow(page, `P7 campaigns @${width}`);

    await page.getByRole("link", { name: "Nota", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/receipts$/);
    await expect(page.getByRole("heading", { name: "Antrean nota" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Setujui nota" }),
    ).toBeVisible();
    await expectNoOverflow(page, `P7 receipts @${width}`);

    await page.getByRole("link", { name: "Pencairan", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/pencairan$/);
    await expect(
      page.getByRole("heading", { name: "Pengawasan pencairan" }),
    ).toBeVisible();
    await expect(page.getByText("Apotek Sehat Sentosa").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cairkan" }),
    ).toHaveCount(0);
    await expectNoOverflow(page, `P7 disbursements @${width}`);

    await page.getByRole("link", { name: "Audit log", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/audit-logs$/);
    await expect(
      page.getByRole("heading", { name: "Jejak perubahan" }),
    ).toBeVisible();
    await expect(page.getByText("campaign.approved")).toBeVisible();
    await expectNoOverflow(page, `P7 audit @${width}`);

    await page.locator('nav a[href="/admin/users"]:visible').first().click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Pengguna" })).toBeVisible();
    await expect(page.getByText("Siti Aminah")).toBeVisible();
    await expect(page.getByText("Akun Ditahan")).toBeVisible();
    await expectNoOverflow(page, `P7 users @${width}`);

    await page.locator('nav a[href="/admin/webhooks"]:visible').first().click();
    await expect(page).toHaveURL(/\/admin\/webhooks$/);
    await expect(
      page.getByRole("heading", { name: "Webhook & dead-letter queue" }),
    ).toBeVisible();
    await expect(page.getByText("ext-9")).toBeVisible();
    await expectNoOverflow(page, `P7 webhooks @${width}`);
  });
}

test("P3 admin reason forms open as guarded overlays", async ({ page }) => {
  await mockAdminApi(page);
  await login(page);

  await page.locator('nav a[href="/admin/campaigns"]:visible').first().click();
  await expect(page).toHaveURL(/\/admin\/campaigns$/);
  await expect(
    page.getByRole("heading", { name: "Operasi kampanye" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tolak", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Tolak kampanye" }),
  ).toBeVisible();
  await page.locator("#campaign-reason").fill("Dokumen kampanye tidak lengkap.");
  await page.getByLabel("Tutup").click();
  await expect(
    page.getByRole("alertdialog", { name: "Buang perubahan?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buang perubahan" }).click();
  await expect(
    page.getByRole("dialog", { name: "Tolak kampanye" }),
  ).not.toBeVisible();

  await page.locator('nav a[href="/admin/campaigns"]:visible').first().click();
  await page.getByRole("link", { name: "Nota", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/receipts$/);
  await expect(page.getByRole("heading", { name: "Antrean nota" })).toBeVisible();
  await page.getByRole("button", { name: "Tolak", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Tolak nota" })).toBeVisible();
  await page.locator("#receipt-rejection-reason").fill("Nominal tidak cocok.");
  await page.getByRole("button", { name: "Tutup", exact: true }).first().click();
  await expect(
    page.getByRole("alertdialog", { name: "Buang perubahan?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buang perubahan" }).click();
  await expect(page.getByRole("dialog", { name: "Tolak nota" })).not.toBeVisible();
});