"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AppPage } from "@/components/app-shell";
import { ScreenHeader } from "@/components/screen-header";
import { SectionTabs } from "@/components/section-tabs";
import { Alert, ErrorState, Loading } from "@/components/ui";
import {
  api,
  errorMessage,
  type Campaign,
  type DisbursementSimulation,
  type Merchant,
} from "@/lib/api";
import { rupiah } from "@/lib/format";
import { DANA_TABS } from "@/lib/sections";

const DISBURSABLE = ["active", "funded"];

export default function SimulateScanPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const canUse = user?.role === "campaigner" || user?.role === "admin";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    campaignId: "",
    merchantId: "",
    amount: "50000",
  });
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [result, setResult] = useState<DisbursementSimulation | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user || !canUse) return;

    let cancelled = false;

    Promise.all([api.myCampaigns(), api.merchants()])
      .then(([mine, merchantPage]) => {
        if (cancelled) return;
        setCampaigns(
          mine.data.filter((campaign) => DISBURSABLE.includes(campaign.status)),
        );
        setMerchants(merchantPage.data);
        setError(null);
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
  }, [ready, user, canUse]);

  const selectedCampaign = useMemo(
    () =>
      campaigns.find(
        (campaign) => String(campaign.id) === form.campaignId,
      ) ?? null,
    [campaigns, form.campaignId],
  );

  const merchantOptions = useMemo(() => {
    if (!selectedCampaign) return merchants;
    const allowed = new Set(selectedCampaign.allowed_mcc ?? []);

    return merchants.filter((merchant) => allowed.has(merchant.mcc));
  }, [merchants, selectedCampaign]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setChecking(true);
    setCheckError(null);
    setResult(null);

    try {
      const response = await api.simulateDisbursement({
        campaign_id: Number(form.campaignId),
        merchant_id: Number(form.merchantId),
        amount: form.amount,
      });
      setResult(response.data);
    } catch (caught) {
      setCheckError(errorMessage(caught));
    } finally {
      setChecking(false);
    }
  }

  if (!ready || (canUse && loading)) {
    return (
      <AppPage narrow>
        <Loading label="Memuat data kampanye…" />
      </AppPage>
    );
  }

  if (!user) return null;

  if (!canUse) {
    return (
      <AppPage narrow>
        <Alert tone="info">
          Simulasi pindai hanya untuk akun penggalang dana dan administrator.
        </Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </AppPage>
    );
  }

  return (
    <AppPage narrow>
      <ScreenHeader
        eyebrow="Dana"
        title="Simulasi pindai"
        description="Coba pencairan tanpa memindahkan dana; aturan yang dipakai sama dengan pencairan sungguhan."
        className="!items-start"
      />

      <SectionTabs label="Menu dana" items={DANA_TABS} />

      {error ? (
        <ErrorState message={error} onRetry={() => router.refresh()} />
      ) : null}

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label htmlFor="simulation-campaign" className="field-label">
            Kampanye
          </label>
          <select
            id="simulation-campaign"
            required
            className="input"
            value={form.campaignId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                campaignId: event.target.value,
                merchantId: "",
              }))
            }
          >
            <option value="">Pilih kampanye</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
          {campaigns.length === 0 ? (
            <p className="mt-1 text-body-sm text-ink-secondary">
              Belum ada kampanye aktif yang dapat dicairkan.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="simulation-merchant" className="field-label">
            Merchant terverifikasi
          </label>
          <select
            id="simulation-merchant"
            required
            className="input"
            value={form.merchantId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                merchantId: event.target.value,
              }))
            }
          >
            <option value="">Pilih merchant</option>
            {merchantOptions.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name} · {merchant.mcc_title ?? merchant.mcc}
                {merchant.city ? ` · ${merchant.city}` : ""}
              </option>
            ))}
          </select>
          {selectedCampaign && merchantOptions.length === 0 ? (
            <p className="mt-1 text-body-sm text-ink-secondary">
              Belum ada merchant terverifikasi untuk kategori kampanye ini (
              {selectedCampaign.allowed_mcc.join(", ") || "tanpa kategori"}).
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="simulation-amount" className="field-label">
            Nominal (Rp)
          </label>
          <input
            id="simulation-amount"
            required
            inputMode="numeric"
            className="input"
            value={form.amount}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                amount: event.target.value.replace(/[^\d]/g, ""),
              }))
            }
          />
        </div>

        {checkError ? <Alert tone="error">{checkError}</Alert> : null}

        <div className="flex flex-wrap gap-3 border-t border-line pt-5">
          <button
            type="submit"
            className="btn-primary"
            disabled={checking || merchantOptions.length === 0}
            aria-busy={checking || undefined}
          >
            {checking ? "Memeriksa…" : "Periksa kelayakan"}
          </button>
          <Link href="/dashboard" className="btn-secondary">
            Batal
          </Link>
        </div>
      </form>

      {result ? (
        result.allowed ? (
          <Alert tone="success" title="Pencairan dapat diproses">
            Merchant berkategori {result.mcc}. Sisa limit hari ini{" "}
            {rupiah(result.remaining_today)} dan bulan ini{" "}
            {rupiah(result.remaining_month)}. Saldo ledger kampanye{" "}
            {rupiah(result.ledger_balance)}. Pencairan sesungguhnya tetap
            menyimpan Idempotency-Key dan menulis dua entri ledger.
          </Alert>
        ) : (
          <Alert tone="error" title="Pencairan akan ditolak">
            {result.message}
            {result.details
              ? ` Sisa limit ${
                  result.details.scope === "daily" ? "harian" : "bulanan"
                }: ${rupiah(result.details.remaining)}.`
              : ""}
          </Alert>
        )
      ) : null}
    </AppPage>
  );
}
