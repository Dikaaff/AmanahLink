"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppPage } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ScreenHeader } from "@/components/screen-header";
import { SectionTabs } from "@/components/section-tabs";
import { Alert, ErrorState, Loading, Stat } from "@/components/ui";
import { Disclosure } from "@/components/ui/disclosure";
import { api, errorMessage, type Dashboard } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { OPS_TABS } from "@/lib/sections";

function QueueCard({
  href,
  label,
  value,
  hint,
  urgent = false,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="card group flex min-w-0 flex-col justify-between gap-4 p-5 transition-colors hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-body-sm font-medium text-ink-secondary">
          {label}
        </span>
        <span
          className={
            value === 0
              ? "whitespace-nowrap rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-ink-muted"
              : urgent
                ? "whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-inverse"
                : "whitespace-nowrap rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-ink-muted"
          }
        >
          {value === 0 ? "bersih" : urgent ? "perlu tindakan" : "dipantau"}
        </span>
      </div>
      <div>
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">
          {value}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{hint}</p>
      </div>
      <span className="text-body-sm font-medium text-ink underline-offset-4 group-hover:underline">
        Buka antrean
      </span>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api.dashboard(), []);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "admin") {
      return;
    }

    let cancelled = false;

    load()
      .then((response) => {
        if (!cancelled) setData(response.data);
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
  }, [load, ready, user, router]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    load()
      .then((response) => setData(response.data))
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  if (!ready || (user?.role === "admin" && loading)) {
    return (
      <AppPage>
        <Loading label="Menyiapkan antrean…" />
      </AppPage>
    );
  }

  if (!user) return null;

  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert tone="info">Halaman ini hanya untuk administrator.</Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </div>
    );
  }

  const queue = data?.queue;
  const pendingCampaigns = queue?.campaigns_pending_review ?? 0;
  const needsReview = queue?.receipts_needs_review ?? data?.receipts_needs_review ?? 0;
  const awaitingReceipt = queue?.disbursements_awaiting_receipt ?? 0;
  const deadLetters = queue?.webhook_dead_letter ?? 0;
  const totalQueue =
    pendingCampaigns + needsReview + awaitingReceipt + deadLetters;

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="Admin"
        title="Pusat tugas"
        description="Antrean keputusan lebih dulu; angka platform di bawahnya. Admin memutuskan, bukan membuat kampanye atau mencairkan dana."
        className="!items-start"
      />

      <SectionTabs label="Menu operasional" items={OPS_TABS} />

      {error ? <ErrorState message={error} onRetry={handleRetry} /> : null}

      {data ? (
        <>
          {data.ledger_mismatch_count > 0 ? (
            <Alert tone="error">
              <span className="font-semibold">
                {data.ledger_mismatch_count} kampanye memiliki saldo yang berbeda
                dari catatan ledger.
              </span>{" "}
              Tahan pencairan sampai selisih ini ditelusuri.
            </Alert>
          ) : (
            <Alert tone="success">Saldo kampanye konsisten dengan ledger.</Alert>
          )}

          <section aria-labelledby="antrean-keputusan" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2
                id="antrean-keputusan"
                className="text-h2 font-semibold tracking-tight text-ink"
              >
                Antrean keputusan
              </h2>
              <p className="text-body-sm text-ink-muted">
                {totalQueue > 0
                  ? `${totalQueue} item menunggu tindakan admin atau verifikator.`
                  : "Tidak ada item yang menunggu tindakan."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <QueueCard
                href="/admin/campaigns"
                label="Kampanye menunggu review"
                value={pendingCampaigns}
                hint="Periksa cerita, target, tenggat, dan kategori MCC sebelum tayang."
                urgent
              />
              <QueueCard
                href="/admin/receipts"
                label="Nota perlu review"
                value={needsReview}
                hint="Cocokkan bukti dengan merchant, nominal, dan transaksi asal."
                urgent
              />
              <QueueCard
                href="/admin/pencairan"
                label="Pencairan menunggu nota"
                value={awaitingReceipt}
                hint="Penggalang belum mengunggah bukti; pantau, jangan unggah sendiri."
              />
              <QueueCard
                href="/admin/webhooks"
                label="Webhook gagal"
                value={deadLetters}
                hint="Replay event yang masuk dead-letter setelah penyebabnya jelas."
                urgent
              />
            </div>

            <p className="text-body-sm text-ink-secondary">
              Butuh menghentikan akses?{" "}
              <Link href="/admin/users" className="font-medium text-ink underline underline-offset-4">
                Kelola pengguna dan peran
              </Link>
              .
            </p>
          </section>

          <section aria-labelledby="kesehatan-platform" className="space-y-4">
            <h2
              id="kesehatan-platform"
              className="text-h2 font-semibold tracking-tight text-ink"
            >
              Kesehatan platform
            </h2>
            <p className="text-body-sm text-ink-muted">
              Snapshot {data.window_hours} jam terakhir untuk memeriksa kesehatan
              dana dan antrean teknis.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                label="Saldo dari ledger"
                value={rupiah(data.ledger_campaign_balance)}
                hint="Dana terkunci seluruh kampanye"
              />
              <Stat
                label="Dana dicairkan"
                value={rupiah(data.disbursements_captured_total)}
                hint="Total pencairan tercatat"
              />
              <Stat
                label="Perlu review nota"
                value={data.receipts_needs_review}
                hint="Menunggu keputusan verifikator"
              />
            </div>

            <Disclosure summary="Semua metrik (6)" className="border-t border-line">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Stat
                  label="Donasi berhasil"
                  value={rupiah(data.donations_settled_total)}
                  hint="Total nominal settle"
                />
                <Stat
                  label="Refund"
                  value={rupiah(data.refunds_total)}
                  hint="Setelah kampanye ditutup"
                />
                <Stat
                  label="Saldo cache"
                  value={rupiah(data.campaign_cache_balance)}
                  hint={
                    data.ledger_mismatch_count === 0
                      ? "Sama dengan ledger"
                      : `${data.ledger_mismatch_count} kampanye menyimpang`
                  }
                />
                <Stat
                  label="p95 authorize"
                  value={
                    data.authorize_p95_ms === null
                      ? "Belum ada data"
                      : `${data.authorize_p95_ms} ms`
                  }
                  hint={`${data.authorize_sample_count} sampel`}
                />
                <Stat
                  label="Antrean OCR"
                  value={data.ocr_queue_depth}
                  hint="Nota uploaded + extracting"
                />
                <Stat
                  label="Mismatch ledger"
                  value={data.ledger_mismatch_count}
                  hint="Kampanye dengan selisih saldo"
                />
              </div>
            </Disclosure>

            <Disclosure summary="Batas tugas admin" className="border-t border-line">
              <ul className="space-y-2 text-body-sm text-ink-secondary">
                <li>
                  Admin <strong className="text-ink">tidak</strong> membuat
                  kampanye, berdonasi, memulai pencairan, atau mengunggah nota.
                  Tindakan itu milik donatur dan penggalang.
                </li>
                <li>
                  Admin memutuskan review, membekukan/menutup kampanye, mengatur
                  limit, memverifikasi merchant, dan mengelola akses pengguna.
                </li>
                <li>
                  Setiap keputusan tercatat di audit log bersama aktor, waktu, dan
                  alasannya.
                </li>
              </ul>
            </Disclosure>
          </section>
        </>
      ) : null}
    </AppPage>
  );
}
