import { expect, test, type Page } from "@playwright/test";

/**
 * P5 — empty dan failure state. Semua API dimock: banner offline, timeout/
 * network error terpeta manusiawi, MCC ditolak, sesi berakhir (401 → toast +
 * redirect login), validasi yang mempertahankan input, dan aksi "Hapus
 * filter" pada empty hasil filter.
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

const admin = {
  id: 1,
  name: "Admin AmanahLink",
  email: "admin@amanahlink.test",
  role: "admin",
  role_label: "Administrator",
  email_verified_at: "2026-11-01T00:00:00.000000Z",
  created_at: "2026-11-01T00:00:00.000000Z",
};

function paginated<T>(rows: T[], extraMeta: Record<string, unknown> = {}) {
  return {
    data: rows,
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: rows.length,
      ...extraMeta,
    },
    links: { next: null, prev: null },
  };
}

function campaign(id: number, status: "draft" | "active" = "active") {
  return {
    id,
    title: `Kampanye Uji ${id}`,
    slug: `kampanye-uji-${id}`,
    description: "Deskripsi kampanye untuk uji state.",
    status,
    status_label: status === "draft" ? "Draf" : "Aktif",
    target_amount: "5000000.00",
    current_amount: "2000000.00",
    progress_percent: 40,
    allowed_mcc: ["5912"],
    deadline_at: "2027-01-01T00:00:00.000000Z",
    funded_at: null,
    reviewed_at: null,
    is_accepting_donations: status === "active",
    campaigner: { id: 2, name: "Budi Santoso" },
    created_at: "2026-11-01T00:00:00.000000Z",
  };
}

async function mockAuth(page: Page, asAdmin = false): Promise<void> {
  const account = asAdmin ? admin : user;

  await page.route(/\/api\/v1\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");

    if (path === "/auth/login") {
      return route.fulfill({ json: { data: { user: account, token: "p5-token" } } });
    }
    if (path === "/auth/me") {
      return route.fulfill({ json: { data: account } });
    }
    if (path === "/notifications") {
      return route.fulfill({ json: paginated([], { unread_count: 0 }) });
    }
    return route.fulfill({ json: { data: null } });
  });
}

async function login(page: Page, asAdmin = false): Promise<void> {
  const account = asAdmin ? admin : user;
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/(dashboard|admin)$/);
}

test.describe("P5 empty dan failure state", () => {
  test("banner offline muncul saat offline dan hilang saat kembali online", async ({ page }) => {
    await mockAuth(page);
    await login(page);
    await expect(page.getByRole("heading", { name: "Halo, Budi Santoso" })).toBeVisible();
    await expect(page.getByText(/Anda sedang offline/)).toHaveCount(0);

    await page.context().setOffline(true);
    await expect(page.getByText(/Anda sedang offline/)).toBeVisible();

    await page.context().setOffline(false);
    await expect(page.getByText(/Anda sedang offline/)).toHaveCount(0);
  });

  test("kegagalan jaringan memunculkan 'Data gagal dimuat' dengan pesan manusiawi dan Coba lagi", async ({ page }) => {
    await mockAuth(page);

    // Semua permintaan kecuali auth diabort: memetakan ke NETWORK_ERROR.
    await page.route(/\/api\/v1\//, async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
      if (["/auth/login", "/auth/me", "/notifications"].includes(path)) {
        return route.fetch();
      }
      return route.abort("connectionfailed");
    });

    await login(page);

    const errorState = page.locator("text=Data gagal dimuat").first();
    await expect(errorState).toBeVisible();
    await expect(
      page.getByText("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Coba lagi" }).first()).toBeVisible();
  });

  test("MCC ditolak: pesan spesifik tampil di dalam form pencairan", async ({ page }) => {
    await mockAuth(page);

    await page.route(/\/api\/v1\//, async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
      const method = route.request().method();

      if (path === "/auth/login" || path === "/auth/me" || path === "/notifications") {
        return route.fetch();
      }
      if (path === "/campaigns/mine") {
        return route.fulfill({ json: paginated([campaign(2)]) });
      }
      if (path === "/donations" || path === "/receipts") {
        return route.fulfill({ json: paginated([]) });
      }
      if (path === "/disbursements" && method !== "POST") {
        return route.fulfill({ json: paginated([]) });
      }
      if (path === "/merchants") {
        return route.fulfill({
          json: paginated([
            {
              id: 1,
              name: "Apotek Sehat",
              mcc: "5912",
              mcc_title: "Toko Obat",
              city: "Jakarta",
              status: "verified",
              status_label: "Terverifikasi",
            },
          ]),
        });
      }
      if (path === "/disbursements" && method === "POST") {
        return route.fulfill({
          status: 403,
          json: {
            error: {
              code: "MCC_NOT_ALLOWED",
              message: "Kategori transaksi merchant tidak diizinkan kampanye ini.",
            },
          },
        });
      }
      return route.fulfill({ json: { data: null } });
    });

    await login(page);

    await page.getByRole("button", { name: "Cairkan dana" }).click();
    const overlay = page.locator("[role='dialog']");
    await overlay.getByLabel("Kampanye", { exact: true }).selectOption("2");
    await overlay.getByLabel("Merchant terverifikasi").selectOption("1");
    await overlay.getByLabel("Nominal (Rp)").fill("100000");
    await overlay
      .getByRole("button", { name: "Cairkan dana", exact: true })
      .click();

    // Kegagalan mutasi uang tetap di bawah field, bukan toast, dan form
    // tidak tertutup sehingga pengguna bisa memperbaiki isian.
    await expect(
      overlay.getByText("Kategori transaksi merchant tidak diizinkan kampanye ini."),
    ).toBeVisible();
    expect(await overlay.count()).toBe(1);
  });

  test("sesi berakhir: toast + redirect ke halaman login", async ({ page }) => {
    await mockAuth(page);

    await page.route(/\/api\/v1\//, async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
      const method = route.request().method();

      if (path === "/auth/login" || path === "/auth/me" || path === "/notifications") {
        return route.fetch();
      }
      if (path === "/campaigns/mine") {
        return route.fulfill({ json: paginated([campaign(2)]) });
      }
      if (path === "/donations" || path === "/receipts") {
        return route.fulfill({ json: paginated([]) });
      }
      if (path === "/disbursements") {
        return route.fulfill({ json: paginated([]) });
      }
      if (path === "/merchants") {
        return route.fulfill({
          json: paginated([
            {
              id: 1,
              name: "Apotek Sehat",
              mcc: "5912",
              mcc_title: "Toko Obat",
              city: "Jakarta",
              status: "verified",
              status_label: "Terverifikasi",
            },
          ]),
        });
      }
      if (path === "/campaigns/2/submit" && method === "POST") {
        return route.fulfill({
          status: 401,
          json: {
            error: { code: "UNAUTHENTICATED", message: "Sesi berakhir." },
          },
        });
      }
      return route.fulfill({ json: { data: null } });
    });

    // Kampanye draf agar tombol "Ajukan review" tersedia.
    await page.route(/\/api\/v1\/campaigns\/mine/, (route) =>
      route.fulfill({ json: paginated([campaign(2, "draft")]) }),
    );

    await login(page);

    await page.getByRole("button", { name: "Ajukan review" }).first().click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(1);
    await expect(
      page.locator("[data-sonner-toast]", {
        hasText: "Sesi Anda sudah berakhir",
      }),
    ).toBeVisible();
  });

  test("validasi 422 mempertahankan isian form kampanye", async ({ page }) => {
    await mockAuth(page);
    await login(page);

    await page.route(/\/api\/v1\/campaigns$/, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 422,
            json: {
              error: {
                code: "VALIDATION_ERROR",
                message: "Periksa kembali isian yang ditandai.",
                details: { fields: { title: ["Judul sudah dipakai."] } },
              },
            },
          })
        : route.fetch(),
    );

    await page.goto("/dashboard/new");
    await page.getByLabel("Judul").fill("Kampanye Anak Yatim 2026");
    await page
      .getByLabel("Deskripsi")
      .fill("Dana untuk kebutuhan pendidikan anak yatim selama satu tahun.");
    await page.getByLabel("Target dana (Rp)").fill("1000000");
    await page.getByRole("button", { name: "Simpan draf" }).click();

    // Isian tetap ada setelah gagal validasi; galat tampil di bawah field.
    await expect(page.getByLabel("Judul")).toHaveValue("Kampanye Anak Yatim 2026");
    await expect(
      page.getByLabel("Deskripsi"),
    ).toHaveValue("Dana untuk kebutuhan pendidikan anak yatim selama satu tahun.");
    await expect(page.getByText("Periksa kembali isian yang ditandai.")).toBeVisible();
    await expect(page.getByText("Judul sudah dipakai.")).toBeVisible();
  });

  test("empty hasil filter memakai varian search dan punya aksi Hapus filter", async ({ page }) => {
    await mockAuth(page, true);

    let sawFilter = false;
    await page.route(/\/api\/v1\/admin\/webhook-events.*/, async (route) => {
      const url = new URL(route.request().url());

      if (url.searchParams.get("status")) {
        sawFilter = true;
        return route.fulfill({ json: paginated([]) });
      }
      return route.fulfill({
        json: paginated([
          {
            id: 7,
            provider: "fake",
            external_id: "evt-uji-1",
            status: "processed",
            attempts: 1,
            last_error: null,
            next_attempt_at: null,
            dead_lettered_at: null,
            processed_at: "2026-11-02T00:00:00.000000Z",
            created_at: "2026-11-02T00:00:00.000000Z",
          },
        ]),
      });
    });

    await login(page, true);

    await page.goto("/admin/webhooks");
    await expect(page.getByRole("heading", { name: "Webhook & dead-letter queue" })).toBeVisible();

    // Filter default dead_letter menghasilkan antrean kosong + aksi hapus filter.
    const empty = page.getByText("Tidak ada event");
    await expect(empty).toBeVisible();
    await expect(sawFilter).toBe(true);

    await page.getByRole("button", { name: "Hapus filter" }).click();

    await expect(empty).toHaveCount(0);
    await expect(page.getByText("evt-uji-1")).toBeVisible();
  });
});
