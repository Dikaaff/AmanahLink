"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert, ErrorState, Loading, Progress, StatusBadge } from "@/components/ui";
import {
  api,
  errorMessage,
  type Campaign,
  type PaymentInstruction,
} from "@/lib/api";
import { dateOnly, daysLeft, rupiah } from "@/lib/format";
import { mccTitle } from "@/lib/mcc";

const PRESETS = [50_000, 100_000, 250_000, 500_000];

export default function CampaignDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, ready } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("100000");
  const [donating, setDonating] = useState(false);
  const [donationError, setDonationError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentInstruction | null>(null);

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

  async function handleDonate(event: React.FormEvent) {
    event.preventDefault();
    setDonationError(null);

    if (!user) {
      router.push("/login");
      return;
    }

    if (!campaign) return;

    setDonating(true);

    try {
      const response = await api.createDonation(campaign.id, amount);
      setPayment(response.data.payment);
    } catch (caught) {
      setDonationError(errorMessage(caught));
    } finally {
      setDonating(false);
    }
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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm font-medium text-stone-500 hover:text-stone-800">
        ← Semua kampanye
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={campaign.status} label={campaign.status_label} />
            <span className="text-sm text-stone-500">
              {daysLeft(campaign.deadline_at)} · tenggat {dateOnly(campaign.deadline_at)}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight text-stone-900 sm:text-4xl">
            {campaign.title}
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Dikelola oleh {campaign.campaigner?.name ?? "penggalang dana"}
          </p>

          <div className="card mt-6 p-5">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Terkumpul
                </p>
                <p className="mt-1 text-3xl font-semibold text-brand-700">
                  {rupiah(campaign.current_amount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Target
                </p>
                <p className="mt-1 text-lg font-semibold text-stone-800">
                  {rupiah(campaign.target_amount)}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={Math.round(campaign.progress_percent)} />
            </div>
            <p className="mt-2 text-xs text-stone-500">
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
            <h2 className="text-xl font-semibold text-stone-900">
              Untuk apa dana ini?
            </h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-stone-700">
              {campaign.description}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-stone-900">
              Batas penggunaan dana
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Pencairan hanya dapat dilakukan ke merchant terverifikasi dengan
              kategori transaksi berikut:
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {campaign.allowed_mcc.map((code) => (
                <li
                  key={code}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                >
                  {mccTitle(code)} · {code}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-stone-500">
              Platform tidak mengklaim pemblokiran di level jaringan. Batas
              ditegakkan lewat registry merchant terverifikasi dan validasi
              kategori transaksi saat pencairan.
            </p>
          </section>
        </div>

        <aside className="card p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-stone-900">Donasi sekarang</h2>

          {campaign.is_accepting_donations ? (
            <>
              <p className="mt-1 text-sm text-stone-500">
                Dana langsung masuk ke saldo terkunci kampanye setelah pembayaran
                terkonfirmasi.
              </p>

              {!ready ? (
                <Loading label="Menyiapkan formulir…" />
              ) : (
                <form onSubmit={handleDonate} className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(String(preset))}
                        className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                          amount === String(preset)
                            ? "border-brand-600 bg-brand-50 text-brand-700"
                            : "border-stone-200 text-stone-600 hover:border-stone-300"
                        }`}
                      >
                        {rupiah(preset)}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label htmlFor="amount" className="field-label">
                      Nominal (Rp)
                    </label>
                    <input
                      id="amount"
                      inputMode="numeric"
                      required
                      min={10000}
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value.replace(/[^\d]/g, ""))
                      }
                      className="input"
                    />
                    <p className="mt-1 text-xs text-stone-500">
                      Minimal Rp 10.000. Biaya platform 2% dipotong sekali saat
                      dana diterima.
                    </p>
                  </div>

                  {donationError ? (
                    <Alert>{donationError}</Alert>
                  ) : null}

                  {payment ? (
                    <Alert tone="success">
                      <p className="font-semibold">Instruksi pembayaran dibuat.</p>
                      <dl className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between gap-3">
                          <dt>Virtual account</dt>
                          <dd className="font-mono">{payment.va_number}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt>Referensi</dt>
                          <dd className="font-mono">{payment.payment_ref}</dd>
                        </div>
                      </dl>
                      <p className="mt-2 text-xs">
                        Pembayaran diperiksa lewat webhook provider. Status donasi
                        berubah menjadi “Berhasil” setelah konfirmasi diterima.
                      </p>
                    </Alert>
                  ) : null}

                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={donating}
                  >
                    {!user
                      ? "Masuk untuk berdonasi"
                      : donating
                        ? "Membuat tagihan…"
                        : `Donasi ${rupiah(amount || 0)}`}
                  </button>

                  {!user ? (
                    <p className="text-center text-xs text-stone-500">
                      Belum punya akun?{" "}
                      <Link href="/register" className="font-semibold text-brand-700">
                        Daftar
                      </Link>
                    </p>
                  ) : null}
                </form>
              )}
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
    </div>
  );
}
