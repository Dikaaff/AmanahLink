"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  Alert,
  EmptyState,
  Loading,
  Progress,
  Stat,
  StatusBadge,
} from "@/components/ui";
import {
  api,
  errorMessage,
  type Campaign,
  type Disbursement,
  type Donation,
  type Paginated,
} from "@/lib/api";
import { dateOnly, dateTime, rupiah } from "@/lib/format";

function defaultLimitExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function DashboardPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<Paginated<Donation> | null>(null);
  const [donationPage, setDonationPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [limitForm, setLimitForm] = useState({
    campaignId: "",
    dailyLimit: "100000",
    monthlyLimit: "1000000",
    expiresAt: defaultLimitExpiry(),
  });
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const [disbursement, setDisbursement] = useState({
    campaignId: "",
    merchantId: "",
    amount: "",
  });
  const [disbursing, setDisbursing] = useState(false);
  const [disbursementError, setDisbursementError] = useState<string | null>(null);
  const [disbursementResult, setDisbursementResult] = useState<string | null>(null);
  const [lastDisbursement, setLastDisbursement] = useState<Disbursement | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);
  const [receiptUploadNotice, setReceiptUploadNotice] = useState<string | null>(null);

  const isFundraiser = user?.role === "campaigner" || user?.role === "admin";

  const loadCampaigns = useCallback(async () => {
    if (!isFundraiser) return;
    const response = await api.myCampaigns();
    setCampaigns(response.data);
  }, [isFundraiser]);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    Promise.all([
      isFundraiser ? api.myCampaigns() : Promise.resolve(null),
      api.donations(donationPage),
    ])
      .then(([mine, myDonations]) => {
        if (cancelled) return;
        if (mine) setCampaigns(mine.data);
        setDonations(myDonations);
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
  }, [ready, user, isFundraiser, donationPage, router]);

  const stats = useMemo(() => {
    const total = campaigns.reduce(
      (sum, campaign) => sum + Number(campaign.current_amount),
      0,
    );
    return {
      count: campaigns.length,
      active: campaigns.filter((campaign) =>
        ["active", "funded"].includes(campaign.status),
      ).length,
      total,
    };
  }, [campaigns]);

  const disbursable = campaigns.filter((campaign) =>
    ["active", "funded"].includes(campaign.status),
  );

  async function handleSubmitCampaign(campaign: Campaign) {
    setSubmittingId(campaign.id);
    setError(null);
    setNotice(null);

    try {
      await api.submitCampaign(campaign.id);
      await loadCampaigns();
      setNotice(`“${campaign.title}” diajukan untuk review.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleLimitSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSavingLimit(true);
    setLimitError(null);
    setLimitNotice(null);

    try {
      const response = await api.upsertDisbursementLimit(Number(limitForm.campaignId), {
        daily_limit: limitForm.dailyLimit,
        monthly_limit: limitForm.monthlyLimit,
        expires_at: new Date(limitForm.expiresAt).toISOString(),
      });
      setLimitNotice(
        `Limit tersimpan: ${rupiah(response.data.daily_limit)} per hari dan ${rupiah(response.data.monthly_limit)} per bulan hingga ${dateTime(response.data.expires_at)}.`,
      );
    } catch (caught) {
      setLimitError(errorMessage(caught));
    } finally {
      setSavingLimit(false);
    }
  }

  async function handleDisburse(event: React.FormEvent) {
    event.preventDefault();
    setDisbursementError(null);
    setDisbursementResult(null);
    setDisbursing(true);

    try {
      const response = await api.disburse({
        campaign_id: Number(disbursement.campaignId),
        merchant_id: Number(disbursement.merchantId),
        amount: disbursement.amount,
      });

      setDisbursementResult(
        `Pencairan ${rupiah(response.data.amount)} ke ${
          response.data.merchant?.name ?? "merchant"
        } tercatat sebagai ${response.data.status} (ref ${response.data.reference_id}).`,
      );
      setLastDisbursement(response.data);
      setReceiptFile(null);
      setReceiptUploaded(false);
      setReceiptUploadError(null);
      setReceiptUploadNotice(null);
      setDisbursement({ campaignId: "", merchantId: "", amount: "" });
      await loadCampaigns();
    } catch (caught) {
      setDisbursementError(errorMessage(caught));
    } finally {
      setDisbursing(false);
    }
  }

  async function handleReceiptUpload(event: React.FormEvent) {
    event.preventDefault();

    if (!lastDisbursement || !receiptFile) {
      setReceiptUploadError("Pilih berkas nota terlebih dahulu.");
      return;
    }

    setUploadingReceipt(true);
    setReceiptUploadError(null);
    setReceiptUploadNotice(null);

    try {
      const response = await api.uploadReceipt(lastDisbursement.id, receiptFile);
      setReceiptUploaded(true);
      setReceiptUploadNotice(
        `Nota berhasil diunggah dengan status ${response.data.status_label.toLowerCase()}. OCR akan diproses oleh antrean.`,
      );
    } catch (caught) {
      setReceiptUploadError(errorMessage(caught));
    } finally {
      setUploadingReceipt(false);
    }
  }

  if (!ready || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Loading label="Memuat dasbor…" />
      </div>
    );
  }

  if (!user) return null;

  const lastDonationPage = donations?.meta?.last_page ?? 1;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Dasbor
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">
            Halo, {user.name}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {user.role_label} · {user.email}
          </p>
        </div>
        {isFundraiser ? (
          <Link href="/dashboard/new" className="btn-primary">
            Buat kampanye
          </Link>
        ) : null}
      </header>

      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {isFundraiser ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Stat label="Kampanye" value={stats.count} hint="Termasuk draf" />
            <Stat label="Berjalan" value={stats.active} hint="Aktif / target tercapai" />
            <Stat
              label="Dana terkumpul"
              value={rupiah(stats.total)}
              hint="Saldo cache, diverifikasi terhadap ledger saat pencairan"
            />
          </section>

          <section>
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-xl font-semibold text-stone-900">Kampanye saya</h2>
            </div>

            {campaigns.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Belum ada kampanye"
                  description="Buat draf kampanye, lengkapi batas kategori transaksi, lalu ajukan untuk review."
                  action={
                    <Link href="/dashboard/new" className="btn-primary">
                      Buat kampanye pertama
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="card mt-4 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="table-head">
                      <tr>
                        <th className="px-4 py-3">Kampanye</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Terkumpul</th>
                        <th className="px-4 py-3">Tenggat</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="align-middle">
                          <td className="px-4 py-3">
                            <Link
                              href={`/campaigns/${campaign.slug}`}
                              className="font-semibold text-stone-900 hover:underline"
                            >
                              {campaign.title}
                            </Link>
                            <div className="mt-1 max-w-[240px]">
                              <Progress percent={campaign.progress_percent} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              status={campaign.status}
                              label={campaign.status_label}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">
                              {rupiah(campaign.current_amount)}
                            </span>
                            <span className="block text-xs text-stone-500">
                              dari {rupiah(campaign.target_amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-stone-600">
                            {dateOnly(campaign.deadline_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {campaign.status === "draft" ? (
                                <button
                                  type="button"
                                  className="btn-secondary !px-3 !py-1.5"
                                  disabled={submittingId === campaign.id}
                                  onClick={() => handleSubmitCampaign(campaign)}
                                >
                                  {submittingId === campaign.id
                                    ? "Mengajukan…"
                                    : "Ajukan review"}
                                </button>
                              ) : null}
                              {campaign.status === "draft" ? (
                                <Link
                                  href={`/dashboard/campaigns/${campaign.slug}/edit`}
                                  className="btn-ghost"
                                >
                                  Edit
                                </Link>
                              ) : (
                                <Link
                                  href={`/campaigns/${campaign.slug}`}
                                  className="btn-ghost"
                                >
                                  Lihat
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-stone-900">
              Atur limit pencairan
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-stone-600">
              Limit membatasi pencairan baru per kampanye. Saldo tetap diverifikasi
              dari ledger dan limit yang kedaluwarsa akan ditolak oleh backend.
            </p>

            {disbursable.length === 0 ? (
              <div className="mt-4">
                <Alert tone="info">Belum ada kampanye aktif atau funded.</Alert>
              </div>
            ) : (
              <form onSubmit={handleLimitSubmit} className="mt-5 grid gap-4 md:grid-cols-4">
                <div>
                  <label htmlFor="limit-campaign" className="field-label">
                    Kampanye
                  </label>
                  <select
                    id="limit-campaign"
                    required
                    className="input"
                    value={limitForm.campaignId}
                    onChange={(event) =>
                      setLimitForm((current) => ({
                        ...current,
                        campaignId: event.target.value,
                      }))
                    }
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
                  <label htmlFor="daily-limit" className="field-label">
                    Limit harian (Rp)
                  </label>
                  <input
                    id="daily-limit"
                    required
                    inputMode="numeric"
                    className="input"
                    value={limitForm.dailyLimit}
                    onChange={(event) =>
                      setLimitForm((current) => ({
                        ...current,
                        dailyLimit: event.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                  />
                </div>

                <div>
                  <label htmlFor="monthly-limit" className="field-label">
                    Limit bulanan (Rp)
                  </label>
                  <input
                    id="monthly-limit"
                    required
                    inputMode="numeric"
                    className="input"
                    value={limitForm.monthlyLimit}
                    onChange={(event) =>
                      setLimitForm((current) => ({
                        ...current,
                        monthlyLimit: event.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                  />
                </div>

                <div>
                  <label htmlFor="limit-expiry" className="field-label">
                    Berlaku sampai
                  </label>
                  <input
                    id="limit-expiry"
                    type="datetime-local"
                    required
                    className="input"
                    value={limitForm.expiresAt}
                    onChange={(event) =>
                      setLimitForm((current) => ({
                        ...current,
                        expiresAt: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="md:col-span-4">
                  {limitError ? <Alert>{limitError}</Alert> : null}
                  {limitNotice ? <Alert tone="success">{limitNotice}</Alert> : null}
                  <button type="submit" className="btn-primary mt-3" disabled={savingLimit}>
                    {savingLimit ? "Menyimpan…" : "Simpan limit"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-stone-900">
              Cairkan dana ke merchant
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-stone-600">
              Pencairan hanya berhasil ke merchant terverifikasi dengan kategori
              transaksi yang diizinkan kampanye, selama limit harian/bulanan dan
              saldo ledger mencukupi.
            </p>

            {disbursable.length === 0 ? (
              <div className="mt-4">
                <Alert tone="info">
                  Belum ada kampanye aktif yang dapat dicairkan. Ajukan kampanye
                  untuk review terlebih dahulu.
                </Alert>
              </div>
            ) : (
              <form onSubmit={handleDisburse} className="mt-5 grid gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="campaign" className="field-label">
                    Kampanye
                  </label>
                  <select
                    id="campaign"
                    required
                    className="input"
                    value={disbursement.campaignId}
                    onChange={(event) =>
                      setDisbursement((current) => ({
                        ...current,
                        campaignId: event.target.value,
                      }))
                    }
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
                    ID merchant terverifikasi
                  </label>
                  <input
                    id="merchant"
                    required
                    inputMode="numeric"
                    className="input"
                    placeholder="mis. 1"
                    value={disbursement.merchantId}
                    onChange={(event) =>
                      setDisbursement((current) => ({
                        ...current,
                        merchantId: event.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                  />
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
                    value={disbursement.amount}
                    onChange={(event) =>
                      setDisbursement((current) => ({
                        ...current,
                        amount: event.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                  />
                </div>

                <div className="md:col-span-3">
                  {disbursementError ? (
                    <div className="mb-3">
                      <Alert>{disbursementError}</Alert>
                    </div>
                  ) : null}
                  {disbursementResult ? (
                    <div className="mb-3">
                      <Alert tone="success">{disbursementResult}</Alert>
                    </div>
                  ) : null}

                  <button type="submit" className="btn-primary" disabled={disbursing}>
                    {disbursing ? "Memproses…" : "Cairkan dana"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {lastDisbursement ? (
            <section className="card p-6">
              <h2 className="text-xl font-semibold text-stone-900">Upload nota</h2>
              <p className="mt-1 max-w-2xl text-sm text-stone-600">
                Nota disimpan privat dan diproses OCR. Bila hasilnya tidak cukup
                meyakinkan, verifikator akan meninjaunya secara manual.
              </p>
              <p className="mt-3 text-xs text-stone-500">
                Referensi transaksi: <span className="font-mono">{lastDisbursement.reference_id}</span>
              </p>

              {receiptUploadError ? (
                <div className="mt-4">
                  <Alert>{receiptUploadError}</Alert>
                </div>
              ) : null}
              {receiptUploadNotice ? (
                <div className="mt-4">
                  <Alert tone="success">{receiptUploadNotice}</Alert>
                </div>
              ) : null}

              {!receiptUploaded ? (
                <form onSubmit={handleReceiptUpload} className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="min-w-[240px] flex-1">
                    <label htmlFor="receipt-file" className="field-label">
                      Berkas nota
                    </label>
                    <input
                      id="receipt-file"
                      type="file"
                      required
                      accept="image/jpeg,image/png"
                      className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700"
                      onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                    />
                    <p className="mt-1 text-xs text-stone-500">JPEG atau PNG.</p>
                  </div>
                  <button type="submit" className="btn-primary" disabled={uploadingReceipt}>
                    {uploadingReceipt ? "Mengunggah…" : "Upload nota"}
                  </button>
                </form>
              ) : null}
            </section>
          ) : null}
        </>
      ) : (
        <Alert tone="info">
          Akun donatur belum dapat membuat kampanye pada MVP ini. Hubungi
          pengelola platform bila Anda ingin menjadi penggalang dana.
        </Alert>
      )}

      <section>
        <h2 className="text-xl font-semibold text-stone-900">Riwayat donasi</h2>

        {!donations || donations.data.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Belum ada donasi"
              description="Donasi yang Anda buat akan tercatat di sini beserta status penyelesaiannya."
              action={
                <Link href="/" className="btn-primary">
                  Lihat kampanye
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="card mt-4 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">Kampanye</th>
                      <th className="px-4 py-3">Nominal</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Dibuat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {donations.data.map((donation) => (
                      <tr key={donation.id}>
                        <td className="px-4 py-3">
                          {donation.campaign ? (
                            <Link
                              href={`/campaigns/${donation.campaign.slug}`}
                              className="font-medium text-stone-900 hover:underline"
                            >
                              {donation.campaign.title}
                            </Link>
                          ) : (
                            "—"
                          )}
                          {donation.payment_ref ? (
                            <span className="block font-mono text-xs text-stone-500">
                              {donation.payment_ref}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {rupiah(donation.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={donation.status}
                            label={donation.status_label}
                          />
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {dateTime(donation.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {lastDonationPage > 1 ? (
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={donationPage <= 1}
                  onClick={() => setDonationPage((current) => current - 1)}
                >
                  Sebelumnya
                </button>
                <span className="text-sm text-stone-500">
                  Halaman {donationPage} dari {lastDonationPage}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={donationPage >= lastDonationPage}
                  onClick={() => setDonationPage((current) => current + 1)}
                >
                  Berikutnya
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
