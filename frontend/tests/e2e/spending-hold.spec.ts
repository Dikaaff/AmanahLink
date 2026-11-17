import { expect, test, type Page } from "@playwright/test";

const user = {
  id: 2,
  name: "Budi Santoso",
  email: "budi@amanahlink.test",
  role: "campaigner",
  role_label: "Penggalang dana",
  email_verified_at: "2026-11-01T00:00:00.000000Z",
  created_at: "2026-11-01T00:00:00.000000Z",
};

const campaign = {
  id: 1,
  title: "Bantu Biaya Operasi Ibu Sari",
  slug: "bantu-biaya-operasi",
  description: "Biaya operasi dan obat di rumah sakit.",
  cover_image_url: null,
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
  spending_held: false,
  campaigner: { id: 2, name: "Budi Santoso" },
  created_at: "2026-11-01T00:00:00.000000Z",
};

const merchant = {
  id: 1,
  name: "Apotek Sehat",
  mcc: "5912",
  mcc_title: "Apotek dan Toko Obat",
  city: "Jakarta",
  status: "verified",
  status_label: "Terverifikasi",
};

const disputed = {
  id: 7,
  reference_id: "DSB-DISPUTED-0001",
  amount: "20000.00",
  status: "disputed",
  status_label: "Sengketa",
  settled_at: "2026-11-10T00:00:00.000000Z",
  receipt_due_at: null,
  receipt_overdue: false,
  mcc_used: "5912",
  campaign: { id: 1, title: campaign.title, slug: campaign.slug },
  merchant: { id: 1, name: merchant.name },
  receipt: {
    id: 9,
    status: "rejected",
    status_label: "Ditolak",
    confidence: "0.9",
    rejection_reason: "Nota tidak sesuai transaksi.",
    reviewed_at: "2026-11-11T00:00:00.000000Z",
    created_at: "2026-11-10T00:00:00.000000Z",
  },
  created_at: "2026-11-10T00:00:00.000000Z",
};

function paginated<T>(data: T[]) {
  return {
    data,
    meta: { current_page: 1, last_page: 1, per_page: 10, total: data.length },
    links: { next: null, prev: null },
  };
}

async function mockAuth(page: Page) {
  await page.route(/\/api\/v1\/auth\/(login|me)/, async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path.endsWith("/login")) {
      return route.fulfill({ json: { data: { user, token: "hold-token" } } });
    }

    return route.fulfill({ json: { data: user } });
  });
}

async function login(page: Page) {
  await mockAuth(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("a held campaign explains why and never offers the Belanja button", async ({
  page,
}) => {
  await page.route(/\/api\/v1\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    const method = route.request().method();

    if (path.startsWith("/auth/")) return route.fallback();
    if (path === "/campaigns/mine") {
      return route.fulfill({ json: paginated([campaign]) });
    }
    if (path === "/merchants") {
      return route.fulfill({ json: paginated([merchant]) });
    }
    if (path === "/disbursements" && method === "GET") {
      return route.fulfill({ json: paginated([]) });
    }
    if (path === "/campaigns/1/spending-hold") {
      return route.fulfill({
        json: {
          data: {
            held: true,
            code: "receipt_rejected",
            message:
              "Belanja ditahan karena nota pembayaran DSB-DISPUTED-0001 ditolak: Nota tidak sesuai transaksi.",
            reference_id: "DSB-DISPUTED-0001",
            due_at: null,
          },
        },
      });
    }
    if (path === "/disbursements/simulate") {
      return route.fulfill({
        json: {
          data: {
            allowed: false,
            code: "SPENDING_HELD",
            message:
              "Belanja ditahan karena nota pembayaran DSB-DISPUTED-0001 ditolak.",
            details: {
              hold_code: "receipt_rejected",
              reference_id: "DSB-DISPUTED-0001",
            },
          },
        },
      });
    }
    if (path === "/receipts/pending-count") {
      return route.fulfill({ json: { data: { pending: 1, overdue: 0 } } });
    }
    return route.fulfill({ json: { data: null } });
  });

  await login(page);
  await page.getByRole("link", { name: "Dana", exact: true }).click();
  await page.getByLabel("Kampanye", { exact: true }).selectOption("1");
  await page.getByLabel("Merchant terverifikasi").selectOption("1");
  await page.getByLabel("Nominal (Rp)").fill("30000");

  await expect(
    page.getByText("Belanja kampanye ini sedang ditahan"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Periksa kelayakan" }).click();

  await expect(page.getByText(/Pembayaran ini akan ditolak/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Belanja Rp/ }),
  ).toHaveCount(0);
});

test("Nota badge and replacement upload appear for a rejected receipt", async ({
  page,
}) => {
  await page.route(/\/api\/v1\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    const method = route.request().method();

    if (path.startsWith("/auth/")) return route.fallback();
    if (path === "/disbursements" && method === "GET") {
      return route.fulfill({ json: paginated([disputed]) });
    }
    if (path === "/receipts") {
      return route.fulfill({ json: paginated([]) });
    }
    if (path === "/receipts/pending-count") {
      return route.fulfill({ json: { data: { pending: 1, overdue: 0 } } });
    }
    if (path === "/notifications") {
      return route.fulfill({ json: paginated([]) });
    }
    return route.fulfill({ json: { data: null } });
  });

  await login(page);
  await page.getByRole("link", { name: "Dana", exact: true }).click();
  await page.getByRole("link", { name: /Nota/ }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/nota$/);

  await expect(
    page.getByRole("link", { name: /Nota.*1 menunggu/ }),
  ).toBeVisible();

  await page.getByLabel("Transaksi").selectOption("7");

  await expect(page.getByText(/Nota sebelumnya ditolak/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upload nota pengganti" }),
  ).toBeVisible();
});

test("public campaign shows a neutral review badge, not the dispute detail", async ({
  page,
}) => {
  await page.route(/\/api\/v1\/campaigns\/bantu-biaya-operasi$/, (route) =>
    route.fulfill({
      json: { data: { ...campaign, spending_held: true } },
    }),
  );

  await page.goto("/campaigns/bantu-biaya-operasi");

  await expect(
    page.getByText("Penyaluran dana sedang ditinjau"),
  ).toBeVisible();
  await expect(page.getByText("DSB-DISPUTED-0001")).toHaveCount(0);
  await expect(page.getByText("Nota tidak sesuai transaksi.")).toHaveCount(0);
});
