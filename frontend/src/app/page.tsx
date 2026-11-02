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
    load(page, query)
      .then((response) => setResult(response))
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  const lastPage = result?.meta?.last_page ?? 1;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl bg-brand-900 px-6 py-14 text-white sm:px-12">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
            Donasi dengan batas tujuan
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Dana tidak bisa dipakai sembarangan.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-100">
            Setiap pencairan hanya boleh ke merchant terverifikasi dengan
            kategori transaksi yang disetujui kampanye. Semua pergerakan dana
            tercatat di ledger yang tidak dapat diubah.
          </p>

          <form onSubmit={handleSearch} className="mt-8 flex max-w-lg gap-2">
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Cari kampanye, mis. biaya operasi"
              className="w-full rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-brand-200 focus:border-white/50 focus:outline-none"
              aria-label="Cari kampanye"
            />
            <button
              type="submit"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-100"
            >
              Cari
            </button>
          </form>
        </div>

        <dl className="relative mt-10 grid max-w-2xl grid-cols-2 gap-4 border-t border-white/15 pt-6 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-brand-200">Bukti dana</dt>
            <dd className="mt-1 font-semibold">Ledger double-entry</dd>
          </div>
          <div>
            <dt className="text-brand-200">Pencairan</dt>
            <dd className="mt-1 font-semibold">Merchant + MCC</dd>
          </div>
          <div>
            <dt className="text-brand-200">Nota</dt>
            <dd className="mt-1 font-semibold">OCR + review manual</dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">
              Kampanye berjalan
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {query
                ? `Hasil untuk “${query}”`
                : "Pilih kampanye, lihat rinciannya, lalu donasi."}
            </p>
          </div>
          {result?.meta?.total !== undefined ? (
            <span className="text-sm text-stone-500">
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
            <span className="text-sm text-stone-500">
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
