import { Alert } from "@/components/ui/alert";
import {
  Skeleton,
  SkeletonCampaignCard,
} from "@/components/ui/skeleton";
import { Stat } from "@/components/stat";
import type { User } from "@/lib/api";

const CAMPAIGN_GRID = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function CampaignGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Memuat kampanye" className={CAMPAIGN_GRID}>
      <span className="sr-only">Memuat kampanye.</span>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCampaignCard key={index} />
      ))}
    </div>
  );
}

export function DonationHistorySkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <section role="status" aria-label="Memuat riwayat donasi">
      <span className="sr-only">Memuat riwayat donasi.</span>
      <h2 className="text-xl font-semibold text-ink">Riwayat donasi</h2>
      <div className="card mt-4 overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Kampanye</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {Array.from({ length: rows }, (_, index) => (
                <tr key={index} aria-hidden="true">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-4 md:hidden">
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="rounded-md border border-line p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="mt-3 h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DisbursementHistorySkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <section
      role="status"
      aria-label="Memuat riwayat pencairan"
      className="card overflow-hidden"
    >
      <span className="sr-only">Memuat riwayat pencairan.</span>
      <div className="border-b border-line px-6 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
              Jejak penggunaan dana
            </p>
            <h2 className="mt-1 text-xl font-semibold text-ink">
              Riwayat pencairan
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Pantau status transaksi dan proses nota tanpa kehilangan jejak
              audit.
            </p>
          </div>
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-6 py-3">Kampanye &amp; merchant</th>
              <th className="px-4 py-3">Nominal</th>
              <th className="px-4 py-3">Transaksi</th>
              <th className="px-4 py-3">Nota</th>
              <th className="px-6 py-3">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Array.from({ length: rows }, (_, index) => (
              <tr key={index} aria-hidden="true" className="align-top">
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="mt-2 h-3 w-32" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-5 w-24" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-5 w-24" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-28" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="rounded-md border border-line p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="mt-3 h-5 w-28" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardSkeleton({
  user,
  fundraiser = false,
}: {
  user: User | null;
  fundraiser?: boolean;
}) {
  const admin = user?.role === "admin";

  return (
    <div
      role="status"
      aria-label="Memuat dasbor"
      className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6"
    >
      <span className="sr-only">Memuat dasbor.</span>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
            Dasbor
          </p>
          {user ? (
            <h1 className="mt-2 text-3xl font-semibold text-ink">
              Halo, {user.name}
            </h1>
          ) : (
            <Skeleton className="mt-2 h-9 w-56" />
          )}
          {user ? (
            <p className="mt-1 text-sm text-ink-muted">
              {user.role_label} &middot; {user.email}
            </p>
          ) : (
            <Skeleton className="mt-2 h-4 w-64" />
          )}
        </div>
        {fundraiser ? <Skeleton className="h-11 w-36" /> : null}
      </header>

      {user && !user.email_verified_at ? (
        <Alert tone="warning" title="Email belum diverifikasi">
          Verifikasi email sebelum membuat kampanye, berdonasi, atau memindahkan
          dana. Tautan verifikasi berlaku 60 menit.
          <div className="mt-3">
            <span className="btn-secondary pointer-events-none opacity-40">
              Kirim ulang tautan
            </span>
          </div>
        </Alert>
      ) : null}

      {fundraiser ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Kampanye"
              value={
                <span
                  aria-hidden="true"
                  className="skeleton-shimmer inline-block h-8 w-16 rounded-sm"
                />
              }
              hint="Termasuk draf"
            />
            <Stat
              label="Berjalan"
              value={
                <span
                  aria-hidden="true"
                  className="skeleton-shimmer inline-block h-8 w-16 rounded-sm"
                />
              }
              hint="Aktif / target tercapai"
            />
            <Stat
              label="Dana terkumpul"
              value={
                <span
                  aria-hidden="true"
                  className="skeleton-shimmer inline-block h-8 w-36 rounded-sm"
                />
              }
              hint="Saldo cache, diverifikasi terhadap ledger saat pencairan"
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink">
              Kampanye saya
            </h2>
            <div className="card mt-4 overflow-hidden">
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">Kampanye</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Terkumpul</th>
                      <th className="px-4 py-3">Tenggat</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr aria-hidden="true">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="mt-2 h-2 w-32 rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="mt-2 h-3 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="ml-auto h-9 w-24" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-4 md:hidden">
                <div
                  aria-hidden="true"
                  className="rounded-md border border-line p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="mt-3 h-11 w-28" />
                </div>
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-ink">
              {admin ? "Atur limit pencairan" : "Limit pencairan"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
              Limit membatasi pencairan baru per kampanye. Saldo tetap
              diverifikasi dari ledger dan limit yang kedaluwarsa akan ditolak
              oleh backend.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} aria-hidden="true" className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 ml-auto h-11 w-32" />
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-ink">
              Cairkan dana ke merchant
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
              Pencairan hanya berhasil ke merchant terverifikasi dengan kategori
              transaksi yang diizinkan kampanye, selama limit harian/bulanan dan
              saldo ledger mencukupi.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} aria-hidden="true" className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 h-11 w-36" />
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-line px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
                Rekonsiliasi nota
              </p>
              <h2 className="mt-1 text-xl font-semibold text-ink">
                Status nota
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-ink-muted">
                Nota yang masih menunggu review atau ditolak akan tampil di sini
                beserta alasannya.
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-3" aria-hidden="true">
                {Array.from({ length: 2 }, (_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 rounded-md border border-line p-4"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <DisbursementHistorySkeleton />
        </>
      ) : (
        <Alert tone="info">
          Akun donatur belum dapat membuat kampanye pada MVP ini. Hubungi
          pengelola platform bila Anda ingin menjadi penggalang dana.
        </Alert>
      )}

      <DonationHistorySkeleton />
    </div>
  );
}
