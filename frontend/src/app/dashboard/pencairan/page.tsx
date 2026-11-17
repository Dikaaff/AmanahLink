"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppPage } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ScreenHeader } from "@/components/screen-header";
import { SectionTabs } from "@/components/section-tabs";
import { Disclosure } from "@/components/ui/disclosure";
import {
  Alert,
  EmptyState,
  ErrorState,
  Loading,
  StatusBadge,
} from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  errorMessage,
  type Campaign,
  type Disbursement,
  type DisbursementSimulation,
  type Merchant,
  type Paginated,
} from "@/lib/api";
import { dateTime, rupiah } from "@/lib/format";
import { mccTitle } from "@/lib/mcc";
import { DANA_TABS } from "@/lib/sections";
import { notifySuccess, useFlash } from "@/lib/feedback";

function withRows<T>(page: Paginated<T> | null): Paginated<T> | null {
  if (!page) return null;
  return { ...page, data: Array.isArray(page.data) ? page.data : [] };
}

function isDisbursable(campaign: Campaign): boolean {
  return campaign.status === "active" || campaign.status === "funded";
}

export default function DisbursementPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const canUse = user?.role === "campaigner" || user?.role === "admin";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantsError, setMerchantsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    campaignId: "",
    merchantId: "",
    amount: "",
  });
  const [simulation, setSimulation] = useState<DisbursementSimulation | null>(
    null,
  );
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [disbursing, setDisbursing] = useState(false);
  const [disbursementError, setDisbursementError] = useState<string | null>(
    null,
  );
  const [last, setLast] = useState<Disbursement | null>(null);

  const [history, setHistory] = useState<Paginated<Disbursement> | null>(null);
  const [page, setPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [flashKey] = useFlash();

  const disbursable = useMemo(() => campaigns.filter(isDisbursable), [campaigns]);

  const selectedCampaign = useMemo(
    () => campaigns.find((item) => String(item.id) === form.campaignId) ?? null,
    [campaigns, form.campaignId],
  );

  const merchantOptions = useMemo(() => {
    if (!selectedCampaign) return merchants;
    const allowed = new Set(selectedCampaign.allowed_mcc ?? []);
    return merchants.filter((merchant) => allowed.has(merchant.mcc));
  }, [merchants, selectedCampaign]);

  const fetchWorkspace = useCallback(async () => {
    const [mine, registry] = await Promise.all([
      api.myCampaigns(),
      api.merchants(),
    ]);
    return {
      campaigns: Array.isArray(mine.data) ? mine.data : [],
      merchants: Array.isArray(registry.data) ? registry.data : [],
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!canUse) {
      return;
    }

    let cancelled = false;

    fetchWorkspace()
      .then((data) => {
        if (cancelled) return;
        setCampaigns(data.campaigns);
        setMerchants(data.merchants);
        setMerchantsError(null);
        setLoadError(null);
      })
      .catch((caught) => {
        if (!cancelled) setLoadError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, canUse, fetchWorkspace, router]);

  useEffect(() => {
    if (!ready || !user || !canUse) return;

    let cancelled = false;

    api
      .disbursements(page)
      .then((response) => {
        if (!cancelled) {
          setHistory(withRows(response));
          setHistoryError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setHistoryError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, canUse, page]);

  function handleReloadWorkspace() {
    setLoading(true);
    setLoadError(null);
    fetchWorkspace()
      .then((data) => {
        setCampaigns(data.campaigns);
        setMerchants(data.merchants);
        setMerchantsError(null);
      })
      .catch((caught) => setLoadError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  function handleReloadHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    api
      .disbursements(page)
      .then((response) => setHistory(withRows(response)))
      .catch((caught) => setHistoryError(errorMessage(caught)))
      .finally(() => setHistoryLoading(false));
  }

  function resetCheck() {
    setSimulation(null);
    setCheckError(null);
    setDisbursementError(null);
  }

  async function handleCheck() {
    if (!form.campaignId || !form.merchantId || !form.amount) return;

    setChecking(true);
    setCheckError(null);
    setDisbursementError(null);

    try {
      const response = await api.simulateDisbursement({
        campaign_id: Number(form.campaignId),
        merchant_id: Number(form.merchantId),
        amount: form.amount,
      });
      setSimulation(response.data);
    } catch (caught) {
      setSimulation(null);
      setCheckError(errorMessage(caught));
    } finally {
      setChecking(false);
    }
  }

  async function handleDisburse(event: React.FormEvent) {
    event.preventDefault();
    setDisbursementError(null);
    setDisbursing(true);

    try {
      const response = await api.disburse({
        campaign_id: Number(form.campaignId),
        merchant_id: Number(form.merchantId),
        amount: form.amount,
      });

      notifySuccess(
        `Pembayaran ${rupiah(response.data.amount)} ke ${
          response.data.merchant?.name ?? "merchant"
        } tercatat sebagai ${response.data.status_label.toLowerCase()}.`,
      );
      setLast(response.data);
      setSimulation(null);
      setForm({ campaignId: "", merchantId: "", amount: "" });
      setHistory((current) =>
        current && (current.meta?.current_page ?? 1) === 1
          ? {
              ...current,
              data: [response.data, ...current.data],
              meta: current.meta
                ? { ...current.meta, total: (current.meta.total ?? 0) + 1 }
                : undefined,
            }
          : current,
      );
      handleReloadWorkspace();
    } catch (caught) {
      setDisbursementError(errorMessage(caught));
    } finally {
      setDisbursing(false);
    }
  }

  if (!ready || (canUse && loading)) {
    return (
      <AppPage>
        <div role="status" aria-label="Memuat belanja kampanye" className="space-y-6">
          <span className="sr-only">Memuat data belanja kampanye.</span>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80" />
          <div className="space-y-4 border-y border-line py-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </AppPage>
    );
  }

  if (!user) return null;

  if (!canUse) {
    return (
      <AppPage narrow>
        <Alert tone="info">
          Belanja kampanye hanya untuk akun penggalang dana dan administrator.
        </Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </AppPage>
    );
  }

  const lastPage = history?.meta?.last_page ?? 1;
  const formReady =
    form.campaignId !== "" && form.merchantId !== "" && form.amount !== "";

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="Dana"
        title="Belanja kampanye"
        description="Pilih kampanye dan merchant, periksa kelayakan, lalu otorisasi pembayaran."
        className="!items-start"
      />

      <SectionTabs label="Menu dana" items={DANA_TABS} />

      {loadError ? (
        <ErrorState message={loadError} onRetry={() => handleReloadWorkspace()} />
      ) : null}

      {last ? (
        <Alert tone="success" title="Pembayaran ke merchant tercatat">
          {rupiah(last.amount)} ke {last.merchant?.name ?? "merchant"} · status{" "}
          {last.status_label.toLowerCase()} · referensi{" "}
          <span className="font-mono">{last.reference_id}</span>.{" "}
          <Link
            href="/dashboard/nota"
            className="font-medium underline underline-offset-4"
          >
            Unggah nota
          </Link>
        </Alert>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <section aria-labelledby="disburse-heading">
        <h2 id="disburse-heading" className="text-h2 font-semibold text-ink">
          Pembayaran baru
        </h2>

        {disbursable.length === 0 ? (
          <div className="mt-4">
            <Alert tone="info">
              Belum ada kampanye aktif yang bisa dipakai untuk belanja. Ajukan
              kampanye untuk review terlebih dahulu.
            </Alert>
            <Link href="/dashboard/campaigns" className="btn-secondary mt-4">
              Lihat kampanye
            </Link>
          </div>
        ) : (
          <form onSubmit={handleDisburse} className="mt-4 grid gap-5">
            <div>
              <label htmlFor="campaign" className="field-label">
                Kampanye
              </label>
              <select
                id="campaign"
                required
                className="input"
                value={form.campaignId}
                onChange={(event) => {
                  const campaignId = event.target.value;
                  setForm((current) => ({
                    ...current,
                    campaignId,
                    merchantId: "",
                  }));
                  resetCheck();
                }}
              >
                <option value="">Pilih kampanye</option>
                {disbursable.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="merchant" className="field-label">
                Merchant terverifikasi
              </label>
              <select
                id="merchant"
                required
                className="input"
                value={form.merchantId}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    merchantId: event.target.value,
                  }));
                  resetCheck();
                }}
              >
                <option value="">Pilih merchant</option>
                {merchantOptions.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name} — {merchant.mcc_title ?? mccTitle(merchant.mcc)}
                  </option>
                ))}
              </select>
              {selectedCampaign && merchantOptions.length === 0 ? (
                <p className="mt-2 text-xs text-ink-muted">
                  Belum ada merchant terverifikasi untuk kategori kampanye ini (
                  {selectedCampaign.allowed_mcc.join(", ") || "tanpa MCC"}).
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="disbursement-amount" className="field-label">
                Nominal (Rp)
              </label>
              <input
                id="disbursement-amount"
                required
                inputMode="numeric"
                className="input"
                placeholder="50000"
                value={form.amount}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value.replace(/[^\d]/g, ""),
                  }));
                  resetCheck();
                }}
              />
            </div>

            {merchantsError ? (
              <Alert>Gagal memuat daftar merchant: {merchantsError}</Alert>
            ) : null}
            {checkError ? <Alert>{checkError}</Alert> : null}
            {disbursementError ? <Alert>{disbursementError}</Alert> : null}

            {simulation ? (
              <div
                className={`rounded-md border p-4 ${
                  simulation.allowed
                    ? "border-line bg-sunken"
                    : "border-ink bg-canvas"
                }`}
              >
                <p className="text-body-sm font-semibold text-ink">
                  {simulation.allowed
                    ? "Pembayaran ini lolos pemeriksaan."
                    : "Pembayaran ini akan ditolak."}
                </p>
                <p className="mt-1 text-body-sm text-ink-secondary">
                  {simulation.message}
                </p>
                <dl className="mt-3 grid gap-2 text-xs text-ink-secondary sm:grid-cols-3">
                  {simulation.remaining_today ? (
                    <div>
                      <dt className="text-ink-muted">Sisa batas hari ini</dt>
                      <dd className="numeric text-ink">
                        {rupiah(simulation.remaining_today)}
                      </dd>
                    </div>
                  ) : null}
                  {simulation.remaining_month ? (
                    <div>
                      <dt className="text-ink-muted">Sisa batas bulan ini</dt>
                      <dd className="numeric text-ink">
                        {rupiah(simulation.remaining_month)}
                      </dd>
                    </div>
                  ) : null}
                  {simulation.ledger_balance ? (
                    <div>
                      <dt className="text-ink-muted">Dana tersedia (ledger)</dt>
                      <dd className="numeric text-ink">
                        {rupiah(simulation.ledger_balance)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <button
                type="submit"
                className="btn-primary"
                disabled={disbursing || !formReady}
                aria-busy={disbursing || undefined}
              >
                {disbursing ? "Memproses…" : "Otorisasi pembayaran"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={checking || !formReady}
                aria-busy={checking || undefined}
                onClick={() => void handleCheck()}
              >
                {checking ? "Memeriksa…" : "Periksa kelayakan"}
              </button>
            </div>
          </form>
        )}
      </section>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <div className="card p-5">
          <p className="text-label font-medium uppercase text-ink-secondary">
            Kampanye terpilih
          </p>
          {selectedCampaign ? (
            <>
              <p className="mt-2 break-words text-body-sm font-semibold text-ink">
                {selectedCampaign.title}
              </p>
              <dl className="mt-4 space-y-3 text-body-sm">
                <div>
                  <dt className="text-xs text-ink-muted">Dana tersedia</dt>
                  <dd className="numeric font-medium text-ink">
                    {rupiah(selectedCampaign.current_amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Kategori merchant</dt>
                  <dd className="text-ink">
                    {selectedCampaign.allowed_mcc.length > 0
                      ? selectedCampaign.allowed_mcc.map(mccTitle).join(", ")
                      : "Belum diatur"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs text-ink-muted">Status</dt>
                  <dd>
                    <StatusBadge
                      status={selectedCampaign.status}
                      label={selectedCampaign.status_label}
                    />
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="mt-2 text-body-sm text-ink-secondary">
              Pilih kampanye untuk melihat dana tersedia dan kategori merchant yang
              diizinkan.
            </p>
          )}
        </div>

        <Disclosure
          summary="Cara dana ini diperiksa"
          className="border-t border-line"
        >
          <ul className="space-y-2 text-body-sm text-ink-secondary">
            <li>Merchant harus terverifikasi dan kategorinya ada di allowlist kampanye.</li>
            <li>Nominal tidak boleh melewati batas harian/bulanan dan dana kampanye yang tersedia.</li>
            <li>Setiap pembayaran menulis dua entri ledger dan tidak dapat dibatalkan setelah dikirim.</li>
          </ul>
        </Disclosure>
      </aside>
      </div>

      <section aria-labelledby="history-heading" className="border-t border-line pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="history-heading" className="text-h2 font-semibold text-ink">
              Riwayat pembayaran
            </h2>
            <p className="mt-1 text-body-sm text-ink-secondary">
              Status transaksi dan nota, tanpa kehilangan jejak audit.
            </p>
          </div>
          <span className="rounded-full bg-sunken px-3 py-1.5 text-xs font-medium text-ink-secondary">
            {history?.meta?.total ?? 0} transaksi
          </span>
        </div>

        {historyError ? (
          <div className="mt-4">
            <Alert>Gagal memuat riwayat: {historyError}</Alert>
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={() => handleReloadHistory()}
            >
              Coba lagi
            </button>
          </div>
        ) : historyLoading && history === null ? (
          <div className="mt-4">
            <Loading label="Memuat riwayat pembayaran…" />
          </div>
        ) : !history || history.data.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Belum ada pembayaran"
              description="Pembayaran yang berhasil tercatat di sini bersama status nota dan merchant penerima."
            />
          </div>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {history.data.map((item) => (
                <li
                  key={item.id}
                  className={`py-4${flashKey === `disbursement-${item.id}` ? " feedback-flash" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {item.campaign ? (
                        <Link
                          href={`/campaigns/${item.campaign.slug}`}
                          className="break-words text-body-sm font-semibold text-ink hover:underline"
                        >
                          {item.campaign.title}
                        </Link>
                      ) : (
                        <span className="text-body-sm font-semibold text-ink">
                          Pembayaran ke merchant
                        </span>
                      )}
                      <p className="mt-1 text-xs text-ink-muted">
                        {item.merchant?.name ?? "Merchant tidak tersedia"}
                        {item.mcc_used ? ` · ${mccTitle(item.mcc_used)}` : ""} ·{" "}
                        {dateTime(item.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={item.status} label={item.status_label} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="numeric text-body-sm font-semibold text-ink">
                      {rupiah(item.amount)}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {item.receipt ? (
                        <StatusBadge
                          status={item.receipt.status}
                          label={`Nota: ${item.receipt.status_label}`}
                        />
                      ) : (
                        <Link
                          href="/dashboard/nota"
                          className="font-medium underline underline-offset-4"
                        >
                          Nota belum diunggah
                        </Link>
                      )}
                    </span>
                  </div>

                  <Disclosure
                    summary="Detail transaksi"
                    className="mt-2 border-t border-line"
                  >
                    <dl className="space-y-1 text-xs text-ink-secondary">
                      <div className="flex justify-between gap-3">
                        <dt>Referensi</dt>
                        <dd className="break-all font-mono text-ink">
                          {item.reference_id}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>Kode MCC</dt>
                        <dd className="font-mono text-ink">
                          {item.mcc_used ?? "—"}
                        </dd>
                      </div>
                    </dl>
                  </Disclosure>
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
          </>
        )}
      </section>
    </AppPage>
  );
}
