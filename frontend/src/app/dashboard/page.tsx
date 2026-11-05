"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  Alert,
  EmptyState,
  ErrorState,
  Loading,
  Progress,
  Stat,
  StatusBadge,
} from "@/components/ui";
import { DashboardSkeleton } from "@/components/loading-skeletons";
import { FormOverlay } from "@/components/ui/form-overlay";
import {
  api,
  errorMessage,
  type Campaign,
  type Disbursement,
  type DisbursementLimit,
  type Donation,
  type Merchant,
  type Paginated,
  type Receipt,
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
  const [disbursements, setDisbursements] = useState<Paginated<Disbursement> | null>(null);
  const [disbursementPage, setDisbursementPage] = useState(1);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantsError, setMerchantsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [limitForm, setLimitForm] = useState({
    campaignId: "",
    dailyLimit: "100000",
    monthlyLimit: "1000000",
    expiresAt: defaultLimitExpiry(),
  });
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const [limitViewCampaignId, setLimitViewCampaignId] = useState("");
  const [limitInfoState, setLimitInfoState] = useState<{
    campaignId: string;
    data: DisbursementLimit | null;
    error: string | null;
    loading: boolean;
  } | null>(null);

  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const [disbursement, setDisbursement] = useState({
    campaignId: "",
    merchantId: "",
    amount: "",
  });
  const [disbursing, setDisbursing] = useState(false);
  const [disbursementError, setDisbursementError] = useState<string | null>(null);
  const [disbursementResult, setDisbursementResult] = useState<string | null>(null);
  const [disburseOpen, setDisburseOpen] = useState(false);
  const [lastDisbursement, setLastDisbursement] = useState<Disbursement | null>(null);
  const [receipts, setReceipts] = useState<Paginated<Receipt> | null>(null);
  const [receiptPage, setReceiptPage] = useState(1);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);
  const [receiptUploadNotice, setReceiptUploadNotice] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const isFundraiser = user?.role === "campaigner" || user?.role === "admin";

  const selectedCampaign = useMemo(
    () =>
      campaigns.find(
        (campaign) => String(campaign.id) === disbursement.campaignId,
      ) ?? null,
    [campaigns, disbursement.campaignId],
  );

  const merchantOptions = useMemo(() => {
    if (!selectedCampaign) return merchants;

    const allowed = new Set(selectedCampaign.allowed_mcc ?? []);

    return merchants.filter((merchant) => allowed.has(merchant.mcc));
  }, [merchants, selectedCampaign]);

  const viewedLimit =
    !isAdmin &&
    limitViewCampaignId !== "" &&
    limitInfoState?.campaignId === limitViewCampaignId
      ? limitInfoState
      : null;

  const limitInfo = viewedLimit?.data ?? null;
  const limitInfoError = viewedLimit?.error ?? null;
  const loadingLimitInfo = viewedLimit?.loading ?? false;

  const loadCampaigns = useCallback(async () => {
    if (!isFundraiser) return;
    const response = await api.myCampaigns();
    setCampaigns(response.data);
  }, [isFundraiser]);

  const loadDisbursements = useCallback(async () => {
    if (!isFundraiser) return;
    const response = await api.disbursements(disbursementPage);
    setDisbursements(response);
  }, [disbursementPage, isFundraiser]);

  const loadReceipts = useCallback(async () => {
    if (!isFundraiser) return;
    setReceiptsLoading(true);

    try {
      const response = await api.myReceipts(receiptPage);
      setReceipts(response);
      setReceiptsError(null);
    } catch (caught) {
      setReceiptsError(errorMessage(caught));
    } finally {
      setReceiptsLoading(false);
    }
  }, [isFundraiser, receiptPage]);

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
      isFundraiser ? api.disbursements(disbursementPage) : Promise.resolve(null),
      isFundraiser ? api.myReceipts(receiptPage) : Promise.resolve(null),
    ])
      .then(([mine, myDonations, myDisbursements, myReceipts]) => {
        if (cancelled) return;
        if (mine) setCampaigns(mine.data);
        setDonations(myDonations);
        if (myDisbursements) setDisbursements(myDisbursements);
        if (myReceipts) setReceipts(myReceipts);
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    if (isFundraiser) {
      api
        .merchants()
        .then((response) => {
          if (!cancelled) {
            setMerchants(response.data);
            setMerchantsError(null);
          }
        })
        .catch((caught) => {
          if (!cancelled) setMerchantsError(errorMessage(caught));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [ready, user, isFundraiser, donationPage, disbursementPage, receiptPage, router]);

  useEffect(() => {
    if (isAdmin || !limitViewCampaignId) return;

    let cancelled = false;

    api
      .disbursementLimit(Number(limitViewCampaignId))
      .then((response) => {
        if (!cancelled) {
          setLimitInfoState({
            campaignId: limitViewCampaignId,
            data: response.data,
            error: null,
            loading: false,
          });
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setLimitInfoState({
            campaignId: limitViewCampaignId,
            data: null,
            error: errorMessage(caught),
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, limitViewCampaignId]);

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
      await Promise.all([loadCampaigns(), loadDisbursements()]);
      setNotice(`“${campaign.title}” diajukan untuk review.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleResendVerification() {
    setResendingVerification(true);
    setVerificationError(null);
    setVerificationNotice(null);

    try {
      const response = await api.resendVerification();
      setVerificationNotice(response.message ?? "Tautan verifikasi email sudah dikirim ulang.");
    } catch (caught) {
      setVerificationError(errorMessage(caught));
    } finally {
      setResendingVerification(false);
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
      setLimitForm((current) => ({ ...current, campaignId: "" }));
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
      await Promise.all([loadCampaigns(), loadDisbursements()]);
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
      setReceiptFile(null);
      setReceiptOpen(false);
      await Promise.all([loadDisbursements(), loadReceipts()]);
    } catch (caught) {
      setReceiptUploadError(errorMessage(caught));
    } finally {
      setUploadingReceipt(false);
    }
  }

  function handleReload(): void {
    setLoading(true);
    setError(null);

    Promise.all([
      isFundraiser ? api.myCampaigns() : Promise.resolve(null),
      api.donations(donationPage),
      isFundraiser ? api.disbursements(disbursementPage) : Promise.resolve(null),
      isFundraiser ? api.myReceipts(receiptPage) : Promise.resolve(null),
    ])
      .then(([mine, myDonations, myDisbursements, myReceipts]) => {
        if (mine) setCampaigns(mine.data);
        setDonations(myDonations);
        if (myDisbursements) setDisbursements(myDisbursements);
        if (myReceipts) setReceipts(myReceipts);
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  if (!ready || loading) {
    return <DashboardSkeleton user={user} fundraiser={isFundraiser} />;
  }

  if (!user) return null;

  const lastDonationPage = donations?.meta?.last_page ?? 1;
  const lastDisbursementPage = disbursements?.meta?.last_page ?? 1;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
            Dasbor
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">
            Halo, {user.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {user.role_label} · {user.email}
          </p>
        </div>
        {isFundraiser ? (
          <Link href="/dashboard/new" className="btn-primary">
            Buat kampanye
          </Link>
        ) : null}
      </header>

      {error ? <ErrorState message={error} onRetry={handleReload} /> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {!user.email_verified_at ? (
        <Alert
          tone="warning"
          title="Email belum diverifikasi"
        >
          Verifikasi email sebelum membuat kampanye, berdonasi, atau memindahkan dana.
          Tautan verifikasi berlaku 60 menit.
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-secondary"
              disabled={resendingVerification}
              aria-busy={resendingVerification || undefined}
              onClick={handleResendVerification}
            >
              {resendingVerification ? "Mengirim…" : "Kirim ulang tautan"}
            </button>
            {verificationNotice ? <span className="text-body-sm">{verificationNotice}</span> : null}
            {verificationError ? <span className="text-body-sm">{verificationError}</span> : null}
          </div>
        </Alert>
      ) : null}

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
              <h2 className="text-xl font-semibold text-ink">Kampanye saya</h2>
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
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="table-head">
                      <tr>
                        <th className="px-4 py-3">Kampanye</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Terkumpul</th>
                        <th className="px-4 py-3">Tenggat</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="align-middle">
                          <td className="px-4 py-3">
                        <Link
                          href={`/campaigns/${campaign.slug}`}
                          className="break-words font-semibold text-ink hover:underline"
                        >
                              {campaign.title}
                            </Link>
                            <div className="mt-1 max-w-[240px]">
                              <Progress value={Math.round(campaign.progress_percent)} />
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
                            <span className="block text-xs text-ink-muted">
                              dari {rupiah(campaign.target_amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-ink-secondary">
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
                <div className="space-y-3 p-4 md:hidden">
                  {campaigns.map((campaign) => (
                    <article key={campaign.id} className="rounded-md border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/campaigns/${campaign.slug}`}                              className="min-w-0 break-words font-semibold text-ink hover:underline"
                        >
                          {campaign.title}
                        </Link>
                        <StatusBadge status={campaign.status} label={campaign.status_label} />
                      </div>
                      <div className="mt-3 flex items-baseline justify-between text-body-sm">
                        <span className="font-semibold text-ink">
                          {rupiah(campaign.current_amount)}
                        </span>
                        <span className="text-ink-secondary">
                          {dateOnly(campaign.deadline_at)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {campaign.status === "draft" ? (
                          <Link
                            href={`/dashboard/campaigns/${campaign.slug}/edit`}
                            className="btn-secondary"
                          >
                            Edit draf
                          </Link>
                        ) : null}
                        {campaign.status === "draft" ? (
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={submittingId === campaign.id}
                            aria-busy={submittingId === campaign.id || undefined}
                            onClick={() => handleSubmitCampaign(campaign)}
                          >
                            {submittingId === campaign.id ? "Mengajukan…" : "Ajukan review"}
                          </button>
                        ) : (
                          <Link href={`/campaigns/${campaign.slug}`} className="btn-secondary">
                            Lihat kampanye
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-ink">
              {isAdmin ? "Atur limit pencairan" : "Limit pencairan"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
              Limit membatasi pencairan baru per kampanye. Saldo tetap diverifikasi
              dari ledger dan limit yang kedaluwarsa akan ditolak oleh backend.
              {isAdmin
                ? ""
                : " Limit ditetapkan oleh admin; Anda hanya dapat melihat pemakaian terbaru."}
            </p>

            {disbursable.length === 0 ? (
              <div className="mt-4">
                <Alert tone="info">Belum ada kampanye aktif atau funded.</Alert>
              </div>
            ) : isAdmin ? (
              <>
                <button
                  type="button"
                  className="btn-primary mt-4"
                  onClick={() => setLimitOpen(true)}
                >
                  Atur limit
                </button>
                <FormOverlay
                  open={limitOpen}
                  onOpenChange={setLimitOpen}
                  title="Atur limit pencairan"
                  description="Limit membatasi pencairan baru per kampanye. Saldo tetap diverifikasi dari ledger dan limit yang kedaluwarsa akan ditolak oleh backend."
                  dirty={Boolean(limitForm.campaignId)}
                  onDiscard={() => {
                    setLimitForm({
                      campaignId: "",
                      dailyLimit: "100000",
                      monthlyLimit: "1000000",
                      expiresAt: defaultLimitExpiry(),
                    });
                    setLimitError(null);
                    setLimitNotice(null);
                  }}
                  footer={
                    <>

                      <button
                        type="submit"
                        form="limit-form"
                        className="btn-primary"
                        disabled={savingLimit}
                        aria-busy={savingLimit || undefined}
                      >
                        {savingLimit ? "Menyimpan..." : "Simpan limit"}
                      </button>
                    </>
                  }
                >
                  <form id="limit-form" onSubmit={handleLimitSubmit} className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="limit-campaign" className="field-label">
                        Kampanye
                      </label>
                      <select
                        id="limit-campaign"
                        required
                        autoFocus
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

                    <div className="sm:col-span-2">
                      {limitError ? <Alert>{limitError}</Alert> : null}
                      {limitNotice ? <Alert tone="success">{limitNotice}</Alert> : null}
                    </div>
                  </form>
                </FormOverlay>
              </>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="max-w-sm">
                    <label htmlFor="limit-view-campaign" className="field-label">
                      Kampanye
                    </label>
                    <select
                      id="limit-view-campaign"
                      className="input"
                      value={limitViewCampaignId}
                      onChange={(event) => {
                        const campaignId = event.target.value;
                        setLimitViewCampaignId(campaignId);
                        setLimitInfoState(
                          campaignId === ""
                            ? null
                            : {
                                campaignId,
                                data: null,
                                error: null,
                                loading: true,
                              },
                        );
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

                  {limitInfoError ? <Alert>{limitInfoError}</Alert> : null}
                  {loadingLimitInfo ? (
                    <p className="text-sm text-ink-muted">Memuat limit…</p>
                  ) : null}

                  {!loadingLimitInfo &&
                  !limitInfoError &&
                  limitViewCampaignId &&
                  !limitInfo ? (
                    <Alert tone="info">
                      Admin belum menetapkan limit untuk kampanye ini, sehingga
                      pencairan belum bisa dilakukan.
                    </Alert>
                  ) : null}

                  {limitInfo ? (
                    <dl className="grid gap-4 text-sm md:grid-cols-3">
                      <div>
                        <dt className="field-label">Limit harian</dt>
                        <dd className="text-ink">
                          {rupiah(limitInfo.daily_limit)}
                        </dd>
                        <dd className="text-xs text-ink-muted">
                          Terpakai hari ini: {rupiah(limitInfo.used_today)}
                        </dd>
                      </div>
                      <div>
                        <dt className="field-label">Limit bulanan</dt>
                        <dd className="text-ink">
                          {rupiah(limitInfo.monthly_limit)}
                        </dd>
                        <dd className="text-xs text-ink-muted">
                          Terpakai bulan ini: {rupiah(limitInfo.used_this_month)}
                        </dd>
                      </div>
                      <div>
                        <dt className="field-label">Berlaku sampai</dt>
                        <dd className="text-ink">
                          {limitInfo.expires_at
                            ? dateTime(limitInfo.expires_at)
                            : "Tanpa batas waktu"}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </div>
            )}
          </section>

          <section className="card p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-semibold text-ink">
                Cairkan dana ke merchant
              </h2>
              <Link href="/dashboard/simulasi" className="btn-secondary">
                Simulasi pindai
              </Link>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
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
              <>
                <button
                  type="button"
                  className="btn-primary mt-4"
                  onClick={() => setDisburseOpen(true)}
                >
                  Cairkan dana
                </button>
                <FormOverlay
                  open={disburseOpen}
                  onOpenChange={setDisburseOpen}
                  title="Cairkan dana ke merchant"
                  description="Pencairan hanya berhasil ke merchant terverifikasi dengan kategori transaksi yang diizinkan kampanye, selama limit dan saldo ledger mencukupi."
                  dirty={Boolean(
                    disbursement.campaignId ||
                      disbursement.merchantId ||
                      disbursement.amount,
                  )}
                  onDiscard={() => {
                    setDisbursement({ campaignId: "", merchantId: "", amount: "" });
                    setDisbursementError(null);
                    setDisbursementResult(null);
                  }}
                  footer={
                    <>

                      <button
                        type="submit"
                        form="disburse-form"
                        className="btn-primary"
                        disabled={disbursing}
                        aria-busy={disbursing || undefined}
                      >
                        {disbursing ? "Memproses..." : "Cairkan dana"}
                      </button>
                    </>
                  }
                >
                  <form id="disburse-form" onSubmit={handleDisburse} className="grid gap-4">
                    <div>
                      <label htmlFor="campaign" className="field-label">
                        Kampanye
                      </label>
                      <select
                        id="campaign"
                        required
                        autoFocus
                        className="input"
                        value={disbursement.campaignId}
                        onChange={(event) =>
                          setDisbursement((current) => ({
                            ...current,
                            campaignId: event.target.value,
                            merchantId: "",
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
                        Merchant terverifikasi
                      </label>
                      <select
                        id="merchant"
                        required
                        className="input"
                        value={disbursement.merchantId}
                        onChange={(event) =>
                          setDisbursement((current) => ({
                            ...current,
                            merchantId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Pilih merchant</option>
                        {merchantOptions.map((merchant) => (
                          <option key={merchant.id} value={merchant.id}>
                            {merchant.name} - {merchant.mcc_title ?? merchant.mcc}
                            {merchant.city ? ` - ${merchant.city}` : ""}
                          </option>
                        ))}
                      </select>
                      {selectedCampaign && merchantOptions.length === 0 ? (
                        <p className="mt-2 text-xs text-ink-muted">
                          Belum ada merchant terverifikasi untuk kategori kampanye
                          ini ({selectedCampaign.allowed_mcc.join(", ") || "tanpa MCC"}).
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
                        value={disbursement.amount}
                        onChange={(event) =>
                          setDisbursement((current) => ({
                            ...current,
                            amount: event.target.value.replace(/[^\d]/g, ""),
                          }))
                        }
                      />
                    </div>

                    {merchantsError ? (
                      <Alert>
                        Gagal memuat daftar merchant: {merchantsError}
                      </Alert>
                    ) : null}

                    {disbursementError ? <Alert>{disbursementError}</Alert> : null}
                    {disbursementResult ? (
                      <Alert tone="success">{disbursementResult}</Alert>
                    ) : null}
                  </form>
                </FormOverlay>
              </>
            )}
          </section>

          {lastDisbursement ? (
            <section className="card p-6">
              <h2 className="text-xl font-semibold text-ink">Upload nota</h2>
              <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
                Nota disimpan privat dan diproses OCR. Bila hasilnya tidak cukup
                meyakinkan, verifikator akan meninjaunya secara manual.
              </p>
              <p className="mt-3 text-xs text-ink-muted">
                Referensi transaksi: <span className="font-mono">{lastDisbursement.reference_id}</span>
              </p>

              {receiptUploadNotice ? (
                <div className="mt-4">
                  <Alert tone="success">{receiptUploadNotice}</Alert>
                </div>
              ) : null}

              {!receiptUploaded ? (
                <button
                  type="button"
                  className="btn-primary mt-4"
                  onClick={() => setReceiptOpen(true)}
                >
                  Upload nota
                </button>
              ) : null}

              <FormOverlay
                open={receiptOpen}
                onOpenChange={setReceiptOpen}
                title="Upload nota transaksi"
                description="Nota disimpan privat dan diproses OCR. Bila hasilnya tidak cukup meyakinkan, verifikator akan meninjaunya secara manual."
                dirty={receiptFile !== null}
                onDiscard={() => {
                  setReceiptFile(null);
                  setReceiptUploadError(null);
                }}
                footer={
                  <>

                    <button
                      type="submit"
                      form="receipt-form"
                      className="btn-primary"
                      disabled={uploadingReceipt}
                      aria-busy={uploadingReceipt || undefined}
                    >
                      {uploadingReceipt ? "Mengunggah..." : "Upload nota"}
                    </button>
                  </>
                }
              >
                <form id="receipt-form" onSubmit={handleReceiptUpload} className="grid gap-4">
                  <div>
                    <label htmlFor="receipt-file" className="field-label">
                      Berkas nota
                    </label>
                    <input
                      id="receipt-file"
                      type="file"
                      required
                      accept="image/jpeg,image/png"
                      className="input file:mr-3 file:rounded-lg file:border-0 file:bg-sunken file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
                      onChange={(event) =>
                        setReceiptFile(event.target.files?.[0] ?? null)
                      }
                    />
                    <p className="mt-1 text-xs text-ink-muted">JPEG atau PNG.</p>
                  </div>
                  {receiptUploadError ? <Alert>{receiptUploadError}</Alert> : null}
                </form>
              </FormOverlay>
            </section>
          ) : null}

          <section className="card overflow-hidden">
            <div className="border-b border-line px-6 py-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
                    Rekonsiliasi nota
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">
                    Status nota
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-ink-muted">
                    Nota yang masih menunggu review atau ditolak akan tampil di sini
                    beserta alasannya, sehingga Anda tahu kapan harus mengunggah ulang.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={receiptsLoading}
                  aria-busy={receiptsLoading || undefined}
                  onClick={() => void loadReceipts()}
                >
                  {receiptsLoading ? "Memuat…" : "Muat ulang"}
                </button>
              </div>
            </div>

            {receiptsError ? (
              <div className="p-6">
                <Alert>
                  Gagal memuat status nota: {receiptsError}
                </Alert>
                <button
                  type="button"
                  className="btn-secondary mt-4"
                  onClick={() => void loadReceipts()}
                >
                  Coba lagi
                </button>
              </div>
            ) : receiptsLoading && receipts === null ? (
              <div className="px-6 py-4">
                <Loading label="Memuat status nota…" />
              </div>
            ) : !receipts || receipts.data.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Belum ada nota"
                  description="Unggah nota setelah pencairan berhasil; status OCR dan keputusan verifikator akan muncul di sini."
                />
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="table-head">
                      <tr>
                        <th className="px-6 py-3">Kampanye</th>
                        <th className="px-4 py-3">Nominal</th>
                        <th className="px-4 py-3">Status nota</th>
                        <th className="px-4 py-3">Keyakinan OCR</th>
                        <th className="px-4 py-3">Catatan verifikator</th>
                        <th className="px-6 py-3">Diunggah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {receipts.data.map((receipt) => (
                        <tr key={receipt.id} className="align-top">
                          <td className="px-6 py-4">
                            <span className="break-words font-semibold text-ink">
                              {receipt.transaction?.campaign?.title ?? "—"}
                            </span>
                            <span className="mt-1 block text-xs text-ink-muted">
                              Transaksi #{receipt.transaction_id}
                              {receipt.transaction
                                ? ` · ${receipt.transaction.status_label}`
                                : ""}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-medium text-ink">
                            {receipt.transaction
                              ? rupiah(receipt.transaction.amount)
                              : "—"}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge
                              status={receipt.status}
                              label={receipt.status_label}
                            />
                          </td>
                          <td className="px-4 py-4 text-ink-secondary">
                            {receipt.confidence !== null
                              ? `${Math.round(Number(receipt.confidence) * 100)}%`
                              : "—"}
                          </td>
                          <td className="px-4 py-4">
                            {receipt.rejection_reason ? (
                              <span className="block max-w-[220px] break-words text-xs text-ink">
                                {receipt.rejection_reason}
                              </span>
                            ) : (
                              <span className="text-xs text-ink-muted">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-ink-muted">
                            {dateTime(receipt.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 p-4 md:hidden">
                  {receipts.data.map((receipt) => (
                    <article key={receipt.id} className="rounded-md border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-ink">
                            {receipt.transaction?.campaign?.title ?? "Nota transaksi"}
                          </p>
                          <p className="mt-1 text-xs text-ink-secondary">
                            {receipt.transaction ? rupiah(receipt.transaction.amount) : "—"}
                            {receipt.confidence !== null
                              ? ` · OCR ${Math.round(Number(receipt.confidence) * 100)}%`
                              : ""}
                          </p>
                        </div>
                        <StatusBadge status={receipt.status} label={receipt.status_label} />
                      </div>
                      {receipt.rejection_reason ? (
                        <p className="mt-3 break-words text-body-sm text-ink">{receipt.rejection_reason}</p>
                      ) : null}
                      <p className="mt-3 text-xs text-ink-muted">{dateTime(receipt.created_at)}</p>
                    </article>
                  ))}
                </div>

                {(receipts.meta?.last_page ?? 1) > 1 ? (
                  <div className="flex items-center justify-center gap-3 border-t border-line px-6 py-4">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={receiptPage <= 1}
                      onClick={() => setReceiptPage((current) => current - 1)}
                    >
                      Sebelumnya
                    </button>
                    <span className="text-sm text-ink-muted">
                      Halaman {receiptPage} dari {receipts.meta?.last_page ?? 1}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={receiptPage >= (receipts.meta?.last_page ?? 1)}
                      onClick={() => setReceiptPage((current) => current + 1)}
                    >
                      Berikutnya
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-line px-6 py-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
                    Jejak penggunaan dana
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">
                    Riwayat pencairan
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Pantau status transaksi dan proses nota tanpa kehilangan jejak audit.
                  </p>
                </div>
                <span className="rounded-full bg-sunken px-3 py-1.5 text-xs font-medium text-ink-secondary">
                  {disbursements?.meta?.total ?? 0} transaksi
                </span>
              </div>
            </div>

            {!disbursements || disbursements.data.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Belum ada pencairan"
                  description="Pencairan yang berhasil tercatat akan muncul di sini bersama status nota dan merchant penerima."
                />
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="table-head">
                      <tr>
                        <th className="px-6 py-3">Kampanye & merchant</th>
                        <th className="px-4 py-3">Nominal</th>
                        <th className="px-4 py-3">Transaksi</th>
                        <th className="px-4 py-3">Nota</th>
                        <th className="px-6 py-3">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {disbursements.data.map((item) => (
                        <tr key={item.id} className="align-top">
                          <td className="px-6 py-4">
                            {item.campaign ? (
                              <Link
                                href={`/campaigns/${item.campaign.slug}`}
                                className="font-semibold text-ink hover:underline"
                              >
                                {item.campaign.title}
                              </Link>
                            ) : (
                              "—"
                            )}
                            <span className="mt-1 block text-xs text-ink-muted">
                              {item.merchant?.name ?? "Merchant tidak tersedia"}
                              {item.mcc_used ? ` · MCC ${item.mcc_used}` : ""}
                            </span>
                            <span className="mt-1 block font-mono text-[11px] text-ink-muted">
                              {item.reference_id}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-ink">
                            {rupiah(item.amount)}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={item.status} label={item.status_label} />
                          </td>
                          <td className="px-4 py-4">
                            {item.receipt ? (
                              <div>
                                <StatusBadge
                                  status={item.receipt.status}
                                  label={item.receipt.status_label}
                                />
                                {item.receipt.confidence !== null ? (
                                  <span className="mt-1 block text-xs text-ink-muted">
                                    OCR {Math.round(Number(item.receipt.confidence) * 100)}%
                                  </span>
                                ) : null}
                                {item.receipt.rejection_reason ? (
                                  <span className="mt-1 block max-w-[180px] break-words text-xs text-ink">
                                    {item.receipt.rejection_reason}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-xs text-ink-muted">Belum diunggah</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-ink-muted">
                            {dateTime(item.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 p-4 md:hidden">
                  {disbursements.data.map((item) => (
                    <article key={item.id} className="rounded-md border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 break-words">
                          {item.campaign ? (
                            <Link href={`/campaigns/${item.campaign.slug}`} className="font-semibold text-ink hover:underline">
                              {item.campaign.title}
                            </Link>
                          ) : (
                            <p className="font-semibold text-ink">Pencairan dana</p>
                          )}
                          <p className="mt-1 text-xs text-ink-secondary">
                            {item.merchant?.name ?? "Merchant tidak tersedia"}
                            {item.mcc_used ? ` · MCC ${item.mcc_used}` : ""}
                          </p>
                        </div>
                        <StatusBadge status={item.status} label={item.status_label} />
                      </div>
                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="font-semibold text-ink">{rupiah(item.amount)}</span>
                        <span className="text-xs text-ink-muted">{dateTime(item.created_at)}</span>
                      </div>
                      <div className="mt-3">
                        {item.receipt ? (
                          <StatusBadge status={item.receipt.status} label={`Nota: ${item.receipt.status_label}`} />
                        ) : (
                          <span className="text-xs text-ink-secondary">Nota belum diunggah</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                {lastDisbursementPage > 1 ? (
                  <div className="flex items-center justify-center gap-3 border-t border-line px-6 py-4">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={disbursementPage <= 1}
                      onClick={() => setDisbursementPage((current) => current - 1)}
                    >
                      Sebelumnya
                    </button>
                    <span className="text-sm text-ink-muted">
                      Halaman {disbursementPage} dari {lastDisbursementPage}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={disbursementPage >= lastDisbursementPage}
                      onClick={() => setDisbursementPage((current) => current + 1)}
                    >
                      Berikutnya
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </>
      ) : (
        <Alert tone="info">
          Akun donatur belum dapat membuat kampanye pada MVP ini. Hubungi
          pengelola platform bila Anda ingin menjadi penggalang dana.
        </Alert>
      )}

      <section>
        <h2 className="text-xl font-semibold text-ink">Riwayat donasi</h2>

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
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">Kampanye</th>
                      <th className="px-4 py-3">Nominal</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Dibuat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {donations.data.map((donation) => (
                      <tr key={donation.id}>
                        <td className="px-4 py-3">
                          {donation.campaign ? (
                            <Link
                              href={`/campaigns/${donation.campaign.slug}`}
                              className="font-medium text-ink hover:underline"
                            >
                              {donation.campaign.title}
                            </Link>
                          ) : (
                            "—"
                          )}
                          {donation.payment_ref ? (
                            <span className="block font-mono text-xs text-ink-muted">
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
                        <td className="px-4 py-3 text-ink-secondary">
                          {dateTime(donation.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 p-4 md:hidden">
                {donations.data.map((donation) => (
                  <article key={donation.id} className="rounded-md border border-line p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 break-words">
                        {donation.campaign ? (
                          <Link href={`/campaigns/${donation.campaign.slug}`} className="font-semibold text-ink hover:underline">
                            {donation.campaign.title}
                          </Link>
                        ) : (
                          <p className="font-semibold text-ink">Donasi</p>
                        )}
                        <p className="mt-1 text-xs text-ink-muted">{dateTime(donation.created_at)}</p>
                      </div>
                      <StatusBadge status={donation.status} label={donation.status_label} />
                    </div>
                    <p className="mt-3 text-num-md font-semibold text-ink">{rupiah(donation.amount)}</p>
                  </article>
                ))}
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
                <span className="text-sm text-ink-muted">
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
