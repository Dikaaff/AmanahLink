"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert, Loading, Stat } from "@/components/ui";
import { api, errorMessage, type Dashboard } from "@/lib/api";
import { rupiah } from "@/lib/format";

export default function AdminDashboardPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    api
      .dashboard()
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
  }, [ready, user, router]);

  if (!ready || (user?.role === "admin" && loading)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Loading label="Menghitung metrik…" />
      </div>
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
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">
            Kesehatan platform
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Snapshot {data?.window_hours ?? 24} jam terakhir. Saldo dihitung dari
            ledger, bukan dari cache.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/audit-logs" className="btn-secondary">
            Audit log
          </Link>
          <Link href="/admin/webhooks" className="btn-secondary">
            Webhook & DLQ
          </Link>
        </div>
      </header>

      {error ? <Alert>{error}</Alert> : null}

      {data ? (
        <>
          {data.ledger_mismatch_count > 0 ? (
            <Alert tone="error">
              <span className="font-semibold">
                {data.ledger_mismatch_count} kampanye memiliki cache saldo yang
                berbeda dari ledger.
              </span>{" "}
              Jangan melakukan pencairan sampai selisih ini ditelusuri; ledger
              adalah sumber kebenaran.
            </Alert>
          ) : (
            <Alert tone="success">
              Cache saldo kampanye konsisten dengan ledger.
            </Alert>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Donasi berhasil"
              value={rupiah(data.donations_settled_total)}
              hint="Total nominal settled"
            />
            <Stat
              label="Dana dicairkan"
              value={rupiah(data.disbursements_captured_total)}
              hint="Captured, receipt pending, verified, reconciled"
            />
            <Stat
              label="Refund"
              value={rupiah(data.refunds_total)}
              hint="Pengembalian setelah kampanye ditutup"
            />
            <Stat
              label="Saldo ledger"
              value={rupiah(data.ledger_campaign_balance)}
              hint="Akun 2200 seluruh kampanye"
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
              hint={`${data.authorize_sample_count} sampel / ${data.window_hours} jam`}
            />
            <Stat
              label="Antrean OCR"
              value={data.ocr_queue_depth}
              hint="Nota uploaded + extracting"
            />
            <Stat
              label="Perlu review nota"
              value={data.receipts_needs_review}
              hint="Menunggu keputusan verifikator"
            />
            <Stat
              label="Mismatch ledger"
              value={data.ledger_mismatch_count}
              hint="Kampanye dengan cache ≠ ledger"
            />
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold text-stone-900">
              Cara membaca angka ini
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-600">
              <li>
                <strong className="text-stone-800">Saldo ledger</strong> dijumlah
                dari entri akun dana terkunci kampanye (2200); ini yang dipakai
                saat authorize pencairan.
              </li>
              <li>
                <strong className="text-stone-800">Saldo cache</strong> adalah
                kolom <code className="rounded bg-stone-100 px-1">current_amount</code>{" "}
                yang dipakai halaman publik. Selisih berarti bug atau tulisan di
                luar service.
              </li>
              <li>
                <strong className="text-stone-800">p95 authorize</strong> diukur di
                middleware aplikasi, bukan end-to-end jaringan.
              </li>
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
