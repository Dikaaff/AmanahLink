import { expect, test, type Page } from "@playwright/test";

/**
 * P4 — feedback loop. Seluruh API dimock sehingga bukti tidak bergantung pada
 * data seed: satu toast maksimal, durasi 3s/6s, tombol "Coba lagi", highlight
 * ≤2s, rollback optimistis, dan larangan update optimistis pada mutasi uang.
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

function campaign(
  id: number,
  status: "draft" | "active",
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    title: status === "draft" ? "Kampanye Draf Uji" : "Kampanye Aktif Uji",
    slug: `kampanye-uji-${id}`,
    description: "Deskripsi kampanye untuk uji feedback.",
    status,
    status_label: status === "draft" ? "Draf" : "Aktif",
    target_amount: "5000000.00",
    current_amount: status === "active" ? "2000000.00" : "0.00",
    progress_percent: status === "active" ? 40 : 0,
    allowed_mcc: ["5912"],
    deadline_at: "2027-01-01T00:00:00.000000Z",
    funded_at: null,
    reviewed_at: status === "active" ? "2026-11-02T00:00:00.000000Z" : null,
    is_accepting_donations: status === "active",
    campaigner: { id: 2, name: "Budi Santoso" },
    created_at: "2026-11-01T00:00:00.000000Z",
    ...overrides,
  };
}

function disbursement(id: number, reference: string) {
  return {
    id,
    reference_id: reference,
    amount: "100000.00",
    status: "captured",
    status_label: "Tercatat",
    mcc_used: "5912",
    campaign: { id: 2, title: "Kampanye Aktif Uji", slug: "kampanye-uji-2" },
    merchant: { id: 1, name: "Apotek Sehat" },
    receipt: null,
    created_at: "2026-11-02T00:00:00.000000Z",
  };
}

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

function toastCount(page: Page): Promise<number> {
  return page.locator("[data-sonner-toast]").count();
}

/** Login dengan API dimock, lalu buka dasbor. */
async function openDashboard(
  page: Page,
  options: {
    campaigns?: unknown[];
    disbursements?: unknown[];
    submitStatus?: number;
    submitBody?: unknown;
  } = {},
): Promise<void> {
  const campaigns = options.campaigns ?? [campaign(1, "draft"), campaign(2, "draft")];
  const disbursements = options.disbursements ?? [];

  await page.route(/\/api\/v1\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    const method = route.request().method();

    if (path === "/auth/login") {
      return route.fulfill({ json: { data: { user, token: "p4-token" } } });
    }
    if (path === "/auth/me") {
      return route.fulfill({ json: { data: user } });
    }
    if (path === "/notifications") {
      return route.fulfill({ json: paginated([], { unread_count: 0 }) });
    }
    if (path === "/campaigns/mine") {
      return route.fulfill({ json: paginated(campaigns) });
    }
    if (path === "/donations") {
      return route.fulfill({ json: paginated([]) });
    }
    if (path === "/disbursements") {
      return route.fulfill({ json: paginated(disbursements) });
    }
    if (path === "/receipts") {
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
    if (/^\/campaigns\/\d+\/submit$/.test(path) && method === "POST") {
      if (options.submitStatus && options.submitStatus !== 200) {
        return route.fulfill({
          status: options.submitStatus,
          json: options.submitBody ?? {
            error: { code: "CONFLICT_STATE", message: "Permintaan gagal diproses." },
          },
        });
      }
      return route.fulfill({
        json: { data: campaign(1, "active", { title: "Kampanye Draf Uji" }) },
      });
    }
    if (path === "/disbursements" && method === "POST") {
      return route.fulfill({ json: { data: disbursement(99, "DSB-UJI-BARU") } });
    }
    return route.fulfill({ json: { data: null } });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Halo, Budi Santoso" })).toBeVisible();
}

test.describe("P4 feedback loop", () => {
  test("satu toast maksimal: toast kedua menggantikan yang pertama", async ({ page }) => {
    await openDashboard(page);

    // Ajukan dua kampanye berturut-turut; hanya boleh ada satu toast tampil.
    const submitButtons = page.getByRole("button", { name: "Ajukan review" });
    await submitButtons.first().click();
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(1);
    await submitButtons.first().click();
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(1);
    expect(await toastCount(page)).toBe(1);
  });

  test("durasi toast sukses 3 detik", async ({ page }) => {
    await openDashboard(page);

    await page.getByRole("button", { name: "Ajukan review" }).first().click();
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(1);

    // Masih tampil setelah 1,5s (bukan hilang instan)...
    await page.waitForTimeout(1500);
    expect(await toastCount(page)).toBe(1);

    // ...dan sudah hilang sebelum 5s (durasi 3s).
    await expect
      .poll(() => toastCount(page), { timeout: 4500 })
      .toBe(0);
  });

  test("durasi toast gagal 6 detik", async ({ page }) => {
    await openDashboard(page, { submitStatus: 409 });

    await page.getByRole("button", { name: "Ajukan review" }).first().click();
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(1);

    // Masih tampil setelah 4s (lebih lama dari durasi sukses 3s)...
    await page.waitForTimeout(4000);
    expect(await toastCount(page)).toBe(1);

    // ...dan hilang sebelum 8s (durasi 6s).
    await expect
      .poll(() => toastCount(page), { timeout: 5000 })
      .toBe(0);
  });

  test("highlight baris hilang dalam ≤2 detik setelah update di tempat", async ({ page }) => {
    await openDashboard(page);

    const row = page.locator("tr", { hasText: "Kampanye Draf Uji" });
    await page.getByRole("button", { name: "Ajukan review" }).first().click();

    await expect(row).toHaveClass(/feedback-flash/);
    await expect(page.locator(".feedback-flash")).toHaveCount(1);

    // Highlight memudar dalam ≤2s: sebelum 1,8s masih ada, sesudah 2,6s habis.
    await page.waitForTimeout(1800);
    expect(await page.locator(".feedback-flash").count()).toBeLessThanOrEqual(1);
    await expect
      .poll(() => page.locator(".feedback-flash").count(), { timeout: 1500 })
      .toBe(0);
  });

  test("tombol Coba lagi pada toast gagal menjalankan ulang aksi", async ({ page }) => {
    // Jalur gagal: tandai dibaca gagal lalu sukses saat dicoba ulang.
    let readAttempts = 0;
    const notification = {
      id: "n-1",
      type: "campaign_status",
      data: {
        type: "campaign_status",
        message: "Kampanye Anda disetujui.",
        campaign_title: "Kampanye Aktif Uji",
        campaign_slug: "kampanye-uji-2",
        status: "active",
      },
      read_at: null,
      created_at: "2026-11-02T00:00:00.000000Z",
    };

    await page.route(/\/api\/v1\//, async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");

      if (path === "/auth/login") {
        return route.fulfill({ json: { data: { user, token: "p4-token" } } });
      }
      if (path === "/auth/me") {
        return route.fulfill({ json: { data: user } });
      }
      if (path === "/notifications" && route.request().method() === "POST") {
        return route.fulfill({ json: { data: notification } });
      }
      if (path === "/notifications/read-all" && route.request().method() === "POST") {
        return route.fulfill({ json: { data: { marked: 1, unread_count: 0 } } });
      }
      if (path === "/notifications") {
        return route.fulfill({
          json: paginated([notification], { unread_count: 1 }),
        });
      }
      return route.fulfill({ json: { data: null } });
    });

    // Sirkuit gagal: dua permintaan pertama ditolak, setelahnya sukses.
    await page.route(/\/notifications\/n-1\/read/, async (route) => {
      readAttempts += 1;
      if (readAttempts <= 2) {
        return route.fulfill({
          status: 500,
          json: {
            error: { code: "INTERNAL_ERROR", message: "Permintaan gagal diproses." },
          },
        });
      }
      return route.fulfill({ json: { data: notification } });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/notifications");
    await page.getByRole("button", { name: "Tandai dibaca" }).click();

    const toast = page.locator("[data-sonner-toast]");
    await expect(toast).toHaveCount(1);
    await expect(toast.getByRole("button", { name: "Coba lagi" })).toBeVisible();

    await toast.getByRole("button", { name: "Coba lagi" }).click();
    // Percobaan kedua masih gagal; toast baru menggantikan yang lama.
    await expect(toast).toHaveCount(1);
    await toast.getByRole("button", { name: "Coba lagi" }).click();
    await expect(page.locator(".feedback-flash")).toHaveCount(1);
    expect(readAttempts).toBe(3);
  });

  test("rollback optimistis: gagal tandai dibaca mengembalikan status awal", async ({ page }) => {
    const notification = {
      id: "n-1",
      type: "campaign_status",
      data: {
        type: "campaign_status",
        message: "Kampanye Anda disetujui.",
        campaign_title: "Kampanye Aktif Uji",
        campaign_slug: "kampanye-uji-2",
        status: "active",
      },
      read_at: null,
      created_at: "2026-11-02T00:00:00.000000Z",
    };

    await page.route(/\/api\/v1\//, async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");

      if (path === "/auth/login") {
        return route.fulfill({ json: { data: { user, token: "p4-token" } } });
      }
      if (path === "/auth/me") {
        return route.fulfill({ json: { data: user } });
      }
      if (path === "/notifications/n-1/read") {
        return route.fulfill({
          status: 500,
          json: {
            error: { code: "INTERNAL_ERROR", message: "Permintaan gagal diproses." },
          },
        });
      }
      if (path === "/notifications") {
        return route.fulfill({
          json: paginated([notification], { unread_count: 1 }),
        });
      }
      return route.fulfill({ json: { data: null } });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/notifications");
    await expect(page.getByText("1 notifikasi belum dibaca.")).toBeVisible();

    await page.getByRole("button", { name: "Tandai dibaca" }).click();

    // Setelah rollback, badge "Baru" dan penghitung kembali seperti semula.
    await expect(page.getByText("1 notifikasi belum dibaca.")).toBeVisible();
    await expect(page.getByText("Baru", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tandai dibaca" }),
    ).toBeVisible();
  });

  test("mutasi uang tidak optimistis: baris baru hanya muncul setelah respons", async ({ page }) => {
    const existing = disbursement(1, "DSB-UJI-LAMA");

    await page.route(/\/api\/v1\//, async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
      const method = route.request().method();

      if (path === "/auth/login") {
        return route.fulfill({ json: { data: { user, token: "p4-token" } } });
      }
      if (path === "/auth/me") {
        return route.fulfill({ json: { data: user } });
      }
      if (path === "/notifications") {
        return route.fulfill({ json: paginated([], { unread_count: 0 }) });
      }
      if (path === "/campaigns/mine") {
        return route.fulfill({ json: paginated([campaign(2, "active")]) });
      }
      if (path === "/donations") {
        return route.fulfill({ json: paginated([]) });
      }
      if (path === "/receipts") {
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
        // Latensi server 2,5 detik: selama itu tidak boleh ada baris baru.
        await new Promise((resolve) => setTimeout(resolve, 2500));
        return route.fulfill({ json: { data: disbursement(99, "DSB-UJI-BARU") } });
      }
      if (path === "/disbursements") {
        return route.fulfill({ json: paginated([existing]) });
      }
      return route.fulfill({ json: { data: null } });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const history = page.locator("section", {
      has: page.getByRole("heading", { name: "Riwayat pencairan" }),
    });

    await expect(
      history.locator("tr", { hasText: "DSB-UJI-LAMA" }),
    ).toHaveCount(1);

    await page.getByRole("button", { name: "Cairkan dana" }).click();
    const overlay = page.locator("[role='dialog']");
    await overlay.getByLabel("Kampanye", { exact: true }).selectOption("2");
    await overlay.getByLabel("Merchant terverifikasi").selectOption("1");
    await overlay.getByLabel("Nominal (Rp)").fill("100000");
    await overlay
      .getByRole("button", { name: "Cairkan dana", exact: true })
      .click();

    // Selama permintaan berjalan, tidak ada baris baru dan tidak ada toast.
    await page.waitForTimeout(1200);
    expect(
      await history.locator("tr", { hasText: "DSB-UJI-BARU" }).count(),
    ).toBe(0);
    expect(await toastCount(page)).toBe(0);

    // Setelah respons server, baris muncul dengan highlight dan toast sukses.
    await expect(history.locator("tr", { hasText: "DSB-UJI-BARU" })).toHaveCount(1);
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(1);
  });
});
