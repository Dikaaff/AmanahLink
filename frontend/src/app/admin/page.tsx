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
        <Loading label="Menghitung metrik…" />
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

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="Admin"
        title="Kesehatan platform"
        description={`Snapshot ${data?.window_hours ?? 24} jam terakhir.`}
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

          <section className="grid gap-4 sm:grid-cols-3">
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
          </section>

          <Disclosure
            summary="Semua metrik (6)"
            className="border-t border-line"
          >
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

          <Disclosure summary="Cara membaca angka ini" className="border-t border-line">
            <ul className="space-y-2 text-body-sm text-ink-secondary">
              <li>
                <strong className="text-ink">Saldo ledger</strong> dijumlah dari
                entri dana terkunci kampanye; ini yang dipakai saat pencairan.
              </li>
              <li>
                <strong className="text-ink">Saldo cache</strong> adalah angka
                yang dipakai halaman publik. Selisih berarti ada bug atau tulisan
                di luar service.
              </li>
              <li>
                <strong className="text-ink">p95 authorize</strong> diukur di
                aplikasi, bukan end-to-end jaringan.
              </li>
            </ul>
          </Disclosure>
        </>
      ) : null}
    </AppPage>
  );
}
