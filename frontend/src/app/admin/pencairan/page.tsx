"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppPage } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ScreenHeader } from "@/components/screen-header";
import { SectionTabs } from "@/components/section-tabs";
import { Alert, EmptyState, ErrorState, Loading, StatusBadge } from "@/components/ui";
import { api, errorMessage, type Disbursement, type Paginated } from "@/lib/api";
import { dateTime, rupiah } from "@/lib/format";
import { reviewTabs } from "@/lib/sections";

/**
 * P8 S3 — oversight only. Admins may read every disbursement but have no
 * capture, edit, or receipt-upload action here; spending stays with the
 * fundraiser and stopping it is done by freezing the campaign.
 */
export default function DisbursementOversightPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<Disbursement> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const load = useCallback((requestedPage: number) => api.disbursements(requestedPage), []);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) return;

    let cancelled = false;

    load(page)
      .then((response) => {
        if (!cancelled) setResult(response);
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, isAdmin, load, page, router]);

  function handleReload() {
    setLoading(true);
    setError(null);
    load(page)
      .then((response) => setResult(response))
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  if (!ready || (isAdmin && loading)) {
    return (
      <AppPage>
        <Loading label="Memuat pencairan…" />
      </AppPage>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert tone="info">
          Pengawasan pencairan hanya untuk administrator.
        </Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </div>
    );
  }

  const currentPage = result?.meta?.current_page ?? page;
  const lastPage = result?.meta?.last_page ?? 1;

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="Review"
        title="Pengawasan pencairan"
        description="Baca semua pencairan untuk mencari anomali. Tidak ada aksi cairkan atau unggah nota di sini."
        className="!items-start"
      />

      <SectionTabs label="Menu review" items={reviewTabs(user?.role)} />

      <div className="rounded-sm border border-line bg-sunken p-4 text-body-sm text-ink-secondary">
        Ingin menghentikan belanja sebuah kampanye? Buka{" "}
        <Link
          href="/admin/campaigns"
          className="font-medium text-ink underline underline-offset-4"
        >
          Review → Kampanye
        </Link>{" "}
        lalu bekukan kampanye tersebut.
      </div>

      {error ? <ErrorState message={error} onRetry={handleReload} /> : null}

      {!result || result.data.length === 0 ? (
        error ? null : (
          <EmptyState
            title="Belum ada pencairan"
            description="Pencairan yang dilakukan penggalang akan muncul di sini untuk diawasi."
          />
        )
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-body-sm">
              <thead className="border-b border-line text-label uppercase text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Waktu
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Kampanye
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Merchant
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Nominal
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Nota
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.data.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-4 text-ink-muted">
                      {dateTime(item.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      {item.campaign ? (
                        <Link
                          href={`/campaigns/${item.campaign.slug}`}
                          className="font-medium text-ink hover:underline"
                        >
                          {item.campaign.title}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-ink-secondary">
                      {item.merchant?.name ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-right font-medium tabular-nums text-ink">
                      {rupiah(item.amount)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={item.status} label={item.status_label} />
                    </td>
                    <td className="px-4 py-4">
                      {item.receipt ? (
                        <span className="text-ink-secondary">
                          {item.receipt.status_label}
                        </span>
                      ) : (
                        <span className="text-ink-muted">Belum ada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastPage > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current - 1);
                }}
              >
                Sebelumnya
              </button>
              <span className="text-sm text-ink-muted">
                Halaman {currentPage} dari {lastPage}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage >= lastPage}
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current + 1);
                }}
              >
                Berikutnya
              </button>
            </div>
          ) : null}
        </>
      )}
    </AppPage>
  );
}
