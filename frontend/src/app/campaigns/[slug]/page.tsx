"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DonationSheet } from "@/components/donation-sheet";
import { Alert, ErrorState, Loading, Progress, StatusBadge } from "@/components/ui";
import { api, errorMessage, type Campaign } from "@/lib/api";
import { dateOnly, daysLeft, rupiah } from "@/lib/format";
import { mccTitle } from "@/lib/mcc";

export default function CampaignDetailPage() {
  const params = useParams<{ slug: string }>();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [donationOpen, setDonationOpen] = useState(false);

  const load = useCallback(() => api.campaign(params.slug), [params.slug]);

  useEffect(() => {
    let cancelled = false;

    load()
      .then((response) => {
        if (!cancelled) setCampaign(response.data);
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
  }, [load]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    load()
      .then((response) => setCampaign(response.data))
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Loading label="Memuat kampanye…" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 sm:px-6">
        <ErrorState
          message={error ?? "Kampanye tidak ditemukan."}
          onRetry={handleRetry}
        />
        <Link href="/" className="btn-secondary">
          Kembali ke daftar kampanye
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:py-10 md:pb-10">
      <Link href="/" className="text-sm font-medium text-ink-muted hover:text-ink">
        ← Semua kampanye
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={campaign.status} label={campaign.status_label} />
            <span className="text-sm text-ink-muted">
              {daysLeft(campaign.deadline_at)} · tenggat {dateOnly(campaign.deadline_at)}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            {campaign.title}
          </h1>

          <p className="mt-2 text-sm text-ink-muted">
            Dikelola oleh {campaign.campaigner?.name ?? "penggalang dana"}
          </p>

          <div className="card mt-6 p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Terkumpul
                </p>
                <p className="mt-1 text-3xl font-semibold text-ink">
                  {rupiah(campaign.current_amount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Target
                </p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {rupiah(campaign.target_amount)}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={Math.round(campaign.progress_percent)} />
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              {Math.round(campaign.progress_percent)}% dari target
            </p>
          </div>

          {campaign.freeze_reason ? (
            <div className="mt-5">
              <Alert tone="warning">
                Kampanye dibekukan: {campaign.freeze_reason}
              </Alert>
            </div>
          ) : null}

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-ink">
              Untuk apa dana ini?
            </h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-secondary">
              {campaign.description}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-ink">
              Batas penggunaan dana
            </h2>
            <p className="mt-2 text-sm text-ink-secondary">
              Pencairan hanya dapat dilakukan ke merchant terverifikasi dengan
              kategori transaksi berikut:
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {campaign.allowed_mcc.map((code) => (
                <li
                  key={code}
                  className="rounded-full border border-line-strong bg-sunken px-3 py-1 text-xs font-medium text-ink"
                >
                  {mccTitle(code)} · {code}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              Platform tidak mengklaim pemblokiran di level jaringan. Batas
              ditegakkan lewat registry merchant terverifikasi dan validasi
              kategori transaksi saat pencairan.
            </p>
          </section>
        </div>

        <aside id="donation-panel" className="card scroll-mt-20 p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-stone-900">Donasi sekarang</h2>

          {campaign.is_accepting_donations ? (
            <>
              <p className="mt-1 text-sm text-stone-500">
                Dana langsung masuk ke saldo terkunci kampanye setelah pembayaran
                terkonfirmasi. Biaya platform 2% dipotong sekali saat dana diterima.
              </p>
              <button
                type="button"
                className="btn-primary mt-4 w-full"
                onClick={() => setDonationOpen(true)}
              >
                Buka formulir donasi
              </button>
              <p className="mt-3 text-xs leading-relaxed text-stone-500">
                Pilih nominal, lihat ringkasan, lalu bayar tanpa meninggalkan
                halaman kampanye ini.
              </p>
            </>
          ) : (
            <div className="mt-3">
              <Alert tone="info">
                Kampanye ini belum atau tidak menerima donasi baru saat ini.
              </Alert>
            </div>
          )}
        </aside>
      </div>

      <div className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 md:hidden">
        <button
          type="button"
          className="flex min-h-[52px] w-full items-center justify-center rounded-sm bg-ink px-5 text-body-sm font-medium text-inverse shadow-sheet"
          onClick={() => setDonationOpen(true)}
        >
          {campaign.is_accepting_donations ? "Donasi sekarang" : "Lihat status kampanye"}
        </button>
      </div>

      {campaign.is_accepting_donations ? (
        <DonationSheet
          campaign={campaign}
          open={donationOpen}
          onOpenChange={setDonationOpen}
          onSettled={(updatedCampaign) => setCampaign(updatedCampaign)}
        />
      ) : null}
    </div>
  );
}
