"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, type Campaign, type Paginated } from "@/lib/api";
import { CampaignCard } from "@/components/campaign-card";
import { CampaignGridSkeleton } from "@/components/loading-skeletons";
import { ClearFilterAction, EmptyState, ErrorState } from "@/components/ui";

export default function HomePage() {
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<Campaign> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (requestedPage: number, requestedQuery: string) =>
      api.campaigns({ page: requestedPage, q: requestedQuery }),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    load(page, query)
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
  }, [load, page, query]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPage(1);
    setQuery(draftQuery.trim());
  }

  function handleRetry() {
    setLoading(true);
    setError(null);
    setQuery((q) => q);
    load(page, query)
      .then((response) => setResult(response))
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  const lastPage = result?.meta?.last_page ?? 1;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6">
      <section
        id="cara-kerja"
        className="rounded-lg border border-line-strong bg-canvas px-5 py-8 text-ink sm:px-8 sm:py-10 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-12 lg:px-10 lg:py-12"
      >
        <div>
          <p className="text-label font-medium uppercase text-ink-secondary">
            Donasi dengan batas tujuan
          </p>
          <h1 className="mt-4 max-w-xl text-display font-semibold sm:text-display-lg">
            Dana tidak bisa dipakai sembarangan.
          </h1>
          <p className="mt-4 max-w-xl text-body text-ink-secondary">
            Setiap pembayaran hanya boleh ke merchant terverifikasi dengan
            kategori transaksi yang disetujui kampanye. Semua pergerakan dana
            tercatat di ledger yang tidak dapat diubah.
          </p>

          <form onSubmit={handleSearch} className="mt-8 flex max-w-lg gap-2">
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Cari kampanye, mis. biaya operasi"
              className="min-h-11 w-full rounded-sm border border-line-strong bg-canvas px-5 text-body text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              aria-label="Cari kampanye"
            />
            <button
              type="submit"
              className="min-h-11 rounded-sm border border-line-strong bg-canvas px-5 text-body font-medium text-ink transition-colors hover:bg-sunken"
            >
              Cari
            </button>
          </form>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-line-strong pt-6 sm:grid-cols-3 lg:mt-0 lg:grid-cols-1 lg:gap-0 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <div className="lg:border-b lg:border-line lg:py-4 lg:first:pt-0">
            <dt className="text-label">Bukti dana</dt>
            <dd className="mt-1 text-body-sm font-semibold text-ink">
              Ledger double-entry
            </dd>
            <dd className="mt-1 hidden text-xs text-ink-muted lg:block">
              Setiap rupiah punya jejak debit-kredit yang dapat diaudit.
            </dd>
          </div>
          <div className="lg:border-b lg:border-line lg:py-4">
            <dt className="text-label">Pembayaran</dt>
            <dd className="mt-1 text-body-sm font-semibold text-ink">
              Merchant + MCC
            </dd>
            <dd className="mt-1 hidden text-xs text-ink-muted lg:block">
              Dana hanya keluar ke merchant terverifikasi di kategori yang sah.
            </dd>
          </div>
          <div className="lg:py-4 lg:last:pb-0">
            <dt className="text-label">Nota</dt>
            <dd className="mt-1 text-body-sm font-semibold text-ink">
              OCR + review manual
            </dd>
            <dd className="mt-1 hidden text-xs text-ink-muted lg:block">
              Bukti belanja dibaca mesin, lalu diputuskan manusia.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-h1 font-semibold text-ink sm:text-h1-lg">
              Kampanye berjalan
            </h2>
            <p className="mt-1 text-body-sm text-ink-secondary">
              {query
                ? `Hasil untuk “${query}”`
                : "Pilih kampanye, lihat rinciannya, lalu donasi."}
            </p>
          </div>
          {result?.meta?.total !== undefined ? (
            <span className="text-body-sm text-ink-secondary">
              {result.meta.total} kampanye
            </span>
          ) : null}
        </div>

        <div className="mt-6">
          {error ? (
            <ErrorState message={error} onRetry={handleRetry} />
          ) : loading ? (
            <CampaignGridSkeleton count={3} />
          ) : result && result.data.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.map((campaign, index) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  priority={index === 0}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              variant={query ? "search" : "default"}
              title="Belum ada kampanye"
              description={
                query
                  ? "Tidak ada kampanye yang cocok dengan pencarian Anda. Coba kata kunci lain."
                  : "Kampanye yang sudah disetujui akan tampil di sini."
              }
              action={
                query ? (
                  <ClearFilterAction
                    onClear={() => {
                      setDraftQuery("");
                      setQuery("");
                      setPage(1);
                    }}
                  />
                ) : undefined
              }
            />
          )}
        </div>

        {lastPage > 1 ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => {
                setLoading(true);
                setPage((current) => current - 1);
              }}
            >
              Sebelumnya
            </button>
            <span className="whitespace-nowrap text-body-sm text-ink-secondary">
              Halaman {page} dari {lastPage}
            </span>
            <button
              type="button"
              className="btn-secondary"
              disabled={page >= lastPage}
              onClick={() => {
                setLoading(true);
                setPage((current) => current + 1);
              }}
            >
              Berikutnya
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
