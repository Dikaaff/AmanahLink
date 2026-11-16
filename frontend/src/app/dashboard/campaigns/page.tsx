"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppPage } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ScreenHeader } from "@/components/screen-header";
import {
  Alert,
  EmptyState,
  ErrorState,
  Progress,
  StatusBadge,
} from "@/components/ui";
import { FormOverlay } from "@/components/ui/form-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  errorMessage,
  type Campaign,
  type DisbursementLimit,
} from "@/lib/api";
import { dateOnly, dateTime, rupiah } from "@/lib/format";
import { mccTitle } from "@/lib/mcc";
import { notifyFailure, notifySuccess, useFlash } from "@/lib/feedback";

function defaultLimitExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function isDisbursable(campaign: Campaign): boolean {
  return campaign.status === "active" || campaign.status === "funded";
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Memuat kampanye" className="space-y-3">
      <span className="sr-only">Memuat kampanye.</span>
      {[0, 1, 2].map((row) => (
        <div key={row} className="border-t border-line py-5">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-3 h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export default function CampaignsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const isFundraiser = user?.role === "campaigner" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [flashKey, flash] = useFlash();

  const [limitOpen, setLimitOpen] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [limitForm, setLimitForm] = useState({
    campaignId: "",
    dailyLimit: "100000",
    monthlyLimit: "1000000",
    expiresAt: defaultLimitExpiry(),
  });
  const [limitViewCampaignId, setLimitViewCampaignId] = useState("");
  const [limitInfoState, setLimitInfoState] = useState<{
    campaignId: string;
    data: DisbursementLimit | null;
    error: string | null;
    loading: boolean;
  } | null>(null);

  const fetchCampaigns = useCallback(async () => {
    const response = await api.myCampaigns();
    return Array.isArray(response.data) ? response.data : [];
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isFundraiser) {
      return;
    }

    let cancelled = false;

    fetchCampaigns()
      .then((rows) => {
        if (!cancelled) {
          setCampaigns(rows);
          setError(null);
        }
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
  }, [ready, user, isFundraiser, fetchCampaigns, router]);

  function handleReload() {
    setLoading(true);
    setError(null);
    fetchCampaigns()
      .then(setCampaigns)
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

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

  const disbursable = useMemo(() => campaigns.filter(isDisbursable), [campaigns]);

  const viewedLimit =
    !isAdmin &&
    limitViewCampaignId !== "" &&
    limitInfoState?.campaignId === limitViewCampaignId
      ? limitInfoState
      : null;

  const limitInfo = viewedLimit?.data ?? null;
  const limitInfoError = viewedLimit?.error ?? null;
  const loadingLimitInfo =
    !isAdmin && limitViewCampaignId !== "" && viewedLimit === null;

  async function handleSubmitCampaign(campaign: Campaign) {
    setSubmittingId(campaign.id);

    try {
      const response = await api.submitCampaign(campaign.id);
      setCampaigns((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      );
      notifySuccess(`"${campaign.title}" diajukan untuk review.`);
      flash(`campaign-${campaign.id}`);
    } catch (caught) {
      notifyFailure(errorMessage(caught));
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleLimitSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSavingLimit(true);
    setLimitError(null);

    try {
      const response = await api.upsertDisbursementLimit(
        Number(limitForm.campaignId),
        {
          daily_limit: limitForm.dailyLimit,
          monthly_limit: limitForm.monthlyLimit,
          expires_at: new Date(limitForm.expiresAt).toISOString(),
        },
      );
      notifySuccess(
        `Limit tersimpan: ${rupiah(response.data.daily_limit)} per hari dan ${rupiah(response.data.monthly_limit)} per bulan hingga ${dateTime(response.data.expires_at)}.`,
      );
      setLimitOpen(false);
      setLimitForm((current) => ({ ...current, campaignId: "" }));
      if (limitViewCampaignId === limitForm.campaignId) {
        setLimitInfoState({
          campaignId: limitForm.campaignId,
          data: response.data,
          error: null,
          loading: false,
        });
      }
    } catch (caught) {
      setLimitError(errorMessage(caught));
    } finally {
      setSavingLimit(false);
    }
  }

  if (!ready || (user && isFundraiser && loading)) {
    return (
      <AppPage>
        <ListSkeleton />
      </AppPage>
    );
  }

  if (!user) return null;

  if (!isFundraiser) {
    return (
      <AppPage narrow>
        <Alert tone="info">
          Akun donatur belum dapat membuat kampanye pada MVP ini. Hubungi
          pengelola platform bila Anda ingin menjadi penggalang dana.
        </Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <ScreenHeader
        title="Kampanye saya"
        description="Draf, review, dan kampanye berjalan dalam satu daftar."
        actions={
          <Link href="/dashboard/new" className="btn-primary">
            Buat kampanye
          </Link>
        }
        className="!items-start"
      />

      {error ? <ErrorState message={error} onRetry={handleReload} /> : null}

      {campaigns.length === 0 ? (
        <EmptyState
          title="Belum ada kampanye"
          description="Buat draf, lengkapi kategori transaksi yang diizinkan, lalu ajukan untuk review."
          action={
            <Link href="/dashboard/new" className="btn-primary">
              Buat kampanye pertama
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="campaign-list">
          <div className="flex items-end justify-between gap-3">
            <h2 id="campaign-list" className="text-h2 font-semibold text-ink">
              Daftar kampanye
            </h2>
            <span className="text-body-sm text-ink-muted">
              {campaigns.length} kampanye
            </span>
          </div>

          <ul className="mt-4 divide-y divide-line border-y border-line">
            {campaigns.map((campaign) => (
              <li
                key={campaign.id}
                className={`py-5${flashKey === `campaign-${campaign.id}` ? " feedback-flash" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/campaigns/${campaign.slug}`}
                      className="break-words text-body-sm font-semibold text-ink hover:underline"
                    >
                      {campaign.title}
                    </Link>
                    <p className="mt-1 text-xs text-ink-muted">
                      Tenggat {dateOnly(campaign.deadline_at)} ·{" "}
                      {campaign.allowed_mcc.length > 0
                        ? campaign.allowed_mcc.map(mccTitle).join(", ")
                        : "Kategori merchant belum diatur"}
                    </p>
                  </div>
                  <StatusBadge
                    status={campaign.status}
                    label={campaign.status_label}
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="max-w-md">
                    <p className="numeric text-body-sm text-ink">
                      {rupiah(campaign.current_amount)}
                      <span className="font-normal text-ink-muted">
                        {" "}
                        dari {rupiah(campaign.target_amount)}
                      </span>
                    </p>
                    <div className="mt-2">
                      <Progress value={Math.round(campaign.progress_percent)} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {campaign.status === "draft" ? (
                      <>
                        <Link
                          href={`/dashboard/campaigns/${campaign.slug}/edit`}
                          className="btn-secondary"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={submittingId === campaign.id}
                          aria-busy={submittingId === campaign.id || undefined}
                          onClick={() => void handleSubmitCampaign(campaign)}
                        >
                          {submittingId === campaign.id
                            ? "Mengajukan…"
                            : "Ajukan review"}
                        </button>
                      </>
                    ) : (
                      <Link
                        href={`/campaigns/${campaign.slug}`}
                        className="btn-secondary"
                      >
                        Lihat
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="limit-heading" className="border-t border-line pt-8">
        <h2 id="limit-heading" className="text-h2 font-semibold text-ink">
          {isAdmin ? "Atur limit pencairan" : "Limit pencairan"}
        </h2>
        <p className="mt-1 max-w-2xl text-body-sm text-ink-secondary">
          {isAdmin
            ? "Batasi pencairan baru per kampanye. Limit yang kedaluwarsa ditolak sistem."
            : "Limit ditetapkan admin. Anda dapat melihat pemakaian terbaru."}
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
              description="Limit membatasi pencairan baru per kampanye. Saldo tetap diverifikasi dari ledger dan limit yang kedaluwarsa akan ditolak backend."
              dirty={Boolean(limitForm.campaignId)}
              onDiscard={() => {
                setLimitForm({
                  campaignId: "",
                  dailyLimit: "100000",
                  monthlyLimit: "1000000",
                  expiresAt: defaultLimitExpiry(),
                });
                setLimitError(null);
              }}
              footer={
                <button
                  type="submit"
                  form="limit-form"
                  className="btn-primary"
                  disabled={savingLimit}
                  aria-busy={savingLimit || undefined}
                >
                  {savingLimit ? "Menyimpan…" : "Simpan limit"}
                </button>
              }
            >
              <form
                id="limit-form"
                onSubmit={handleLimitSubmit}
                className="grid gap-4 sm:grid-cols-2"
              >
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
                onChange={(event) => setLimitViewCampaignId(event.target.value)}
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
              <p className="text-body-sm text-ink-muted">Memuat limit…</p>
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
              <dl className="grid gap-4 text-body-sm md:grid-cols-3">
                <div>
                  <dt className="field-label">Limit harian</dt>
                  <dd className="numeric text-ink">
                    {rupiah(limitInfo.daily_limit)}
                  </dd>
                  <dd className="text-xs text-ink-muted">
                    Terpakai hari ini: {rupiah(limitInfo.used_today)}
                  </dd>
                </div>
                <div>
                  <dt className="field-label">Limit bulanan</dt>
                  <dd className="numeric text-ink">
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
    </AppPage>
  );
}
