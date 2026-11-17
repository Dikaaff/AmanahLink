"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppPage } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ScreenHeader } from "@/components/screen-header";
import { Alert, EmptyState, StatusBadge } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage, type Donation, type Paginated } from "@/lib/api";
import { dateTime, rupiah } from "@/lib/format";

function withRows<T>(page: Paginated<T> | null): Paginated<T> | null {
  if (!page) return null;
  return { ...page, data: Array.isArray(page.data) ? page.data : [] };
}

export default function DonationsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [donations, setDonations] = useState<Paginated<Donation> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    api
      .donations(page)
      .then((response) => {
        if (!cancelled) {
          setDonations(withRows(response));
          setError(null);
        }
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
  }, [ready, user, router, page]);

  function handleReload() {
    setLoading(true);
    setError(null);
    api
      .donations(page)
      .then((response) => setDonations(withRows(response)))
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  const settledTotal = useMemo(() => {
    const rows = donations?.data ?? [];
    return rows
      .filter((donation) => donation.status === "settled")
      .reduce((sum, donation) => sum + Number(donation.amount), 0);
  }, [donations]);

  if (!ready || (user && loading && donations === null)) {
    return (
      <AppPage>
        <div role="status" aria-label="Memuat donasi" className="space-y-6">
          <span className="sr-only">Memuat donasi.</span>
          <Skeleton className="h-9 w-52" />
          <div className="space-y-3 border-t border-line pt-6">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-5 w-full" />
            ))}
          </div>
        </div>
      </AppPage>
    );
  }

  if (!user) return null;

  const lastPage = donations?.meta?.last_page ?? 1;

  return (
    <AppPage>
      <ScreenHeader
        title="Donasi saya"
        description="Semua donasi yang Anda buat beserta status penyelesaiannya."
        actions={
          <Link href="/" className="btn-primary">
            Jelajahi kampanye
          </Link>
        }
        className="!items-start"
      />

      {error ? (
        <div>
          <Alert>Gagal memuat donasi: {error}</Alert>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={handleReload}
          >
            Coba lagi
          </button>
        </div>
      ) : null}

      {!donations || donations.data.length === 0 ? (
        <EmptyState
          title="Belum ada donasi"
          description="Donasi yang Anda buat akan tercatat di sini beserta status penyelesaiannya."
          action={
            <Link href="/" className="btn-primary">
              Lihat kampanye
            </Link>
          }
        />
      ) : (
        <>
          <section className="border-y border-line py-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-label font-medium uppercase text-ink-secondary">
                  Total donasi tercatat
                </p>
                <p className="numeric mt-2 text-h1 font-semibold text-ink">
                  {donations.meta?.total ?? donations.data.length}
                </p>
                <p className="mt-1 text-body-sm text-ink-secondary">
                  donasi di seluruh kampanye
                </p>
              </div>
              <div>
                <p className="text-label font-medium uppercase text-ink-secondary">
                  Nilai selesai di halaman ini
                </p>
                <p className="numeric mt-2 text-h2 font-semibold text-ink">
                  {rupiah(settledTotal)}
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="donation-list-heading">
            <h2
              id="donation-list-heading"
              className="text-h2 font-semibold text-ink"
            >
              Riwayat donasi
            </h2>

            <ul className="mt-4 divide-y divide-line border-y border-line">
              {donations.data.map((donation) => (
                <li key={donation.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {donation.campaign ? (
                        <Link
                          href={`/campaigns/${donation.campaign.slug}`}
                          className="break-words text-body-sm font-semibold text-ink hover:underline"
                        >
                          {donation.campaign.title}
                        </Link>
                      ) : (
                        <span className="break-words text-body-sm font-semibold text-ink">
                          Donasi
                        </span>
                      )}
                    </div>
                    <StatusBadge
                      status={donation.status}
                      label={donation.status_label}
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="numeric text-body-sm text-ink">
                      {rupiah(donation.amount)}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {dateTime(donation.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {lastPage > 1 ? (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Sebelumnya
                </button>
                <span className="whitespace-nowrap text-body-sm text-ink-muted">
                  Halaman {page} dari {lastPage}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page >= lastPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Berikutnya
                </button>
              </div>
            ) : null}
          </section>
        </>
      )}
    </AppPage>
  );
}
