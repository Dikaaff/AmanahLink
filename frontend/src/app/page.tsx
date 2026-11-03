"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, type Campaign, type Paginated } from "@/lib/api";
import { CampaignCard } from "@/components/campaign-card";
import { EmptyState, ErrorState, Loading } from "@/components/ui";

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
        className="rounded-lg border border-line-strong bg-canvas px-5 py-8 text-ink sm:px-10 sm:py-12"
      >
        <div className="max-w-2xl">
          <p className="text-label font-medium uppercase text-ink-secondary">
            Donasi dengan batas tujuan
          </p>
          <h1 className="mt-4 text-h1 font-semibold md:text-h1-lg">
            Dana tidak bisa dipakai sembarangan.
          </h1>
          <p className="mt-4 max-w-xl text-body text-ink-secondary">
            Setiap pencairan hanya boleh ke merchant terverifikasi dengan
            kategori transaksi yang disetujui kampanye. Semua pergerakan dana
            tercatat di ledger yang tidak dapat diubah.
          </p>

          <form onSubmit={handleSearch} className="mt-8 flex max-w-lg gap-2">
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Cari kampanye, mis. biaya operasi"
              className="min-h-11 w-full rounded-sm border border-line-strong bg-canvas px-5 text-body text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
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

        <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-4 border-t border-line-strong pt-6 text-body-sm sm:grid-cols-3">
          <div>
            <dt className="text-label">Bukti dana</dt>
            <dd className="mt-1 font-semibold text-ink">Ledger double-entry</dd>
          </div>
          <div>
            <dt className="text-label">Pencairan</dt>
            <dd className="mt-1 font-semibold text-ink">Merchant + MCC</dd>
          </div>
          <div>
            <dt className="text-label">Nota</dt>
            <dd className="mt-1 font-semibold text-ink">OCR + review manual</dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-h1 font-semibold text-ink">
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
            <Loading label="Memuat kampanye…" />
          ) : result && result.data.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada kampanye"
              description={
                query
                  ? "Tidak ada kampanye yang cocok dengan pencarian Anda. Coba kata kunci lain."
                  : "Kampanye yang sudah disetujui akan tampil di sini."
              }
            />
          )}
        </div>

        {lastPage > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-3">
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
            <span className="text-body-sm text-ink-secondary">
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
