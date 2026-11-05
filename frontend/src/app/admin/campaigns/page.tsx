"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert, EmptyState, ErrorState, Loading, Progress, StatusBadge } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormOverlay } from "@/components/ui/form-overlay";
import { api, errorMessage, type Campaign, type Paginated } from "@/lib/api";
import { dateOnly, rupiah } from "@/lib/format";
import { mccTitle } from "@/lib/mcc";

type ReasonAction = "reject" | "freeze";

interface ActionForm {
  campaignId: number;
  action: ReasonAction;
  reason: string;
}

const STATUS_OPTIONS = [
  ["Menunggu review", "pending_review"],
  ["Aktif", "active"],
  ["Target tercapai", "funded"],
  ["Dibekukan", "frozen"],
  ["Kedaluwarsa", "expired"],
  ["Ditutup", "closed"],
  ["Dana dikembalikan", "refunded"],
  ["Draf", "draft"],
] as const;

export default function CampaignOperationsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState("pending_review");
  const [applied, setApplied] = useState({ status: "pending_review" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<Campaign> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionForm, setActionForm] = useState<ActionForm | null>(null);
  const reasonCampaign =
    (actionForm &&
      result?.data.find((campaign) => campaign.id === actionForm.campaignId)) ||
    null;

  const isStaff = user?.role === "verifier" || user?.role === "admin";

  const load = useCallback(
    (requestedPage: number) => api.reviewQueue(applied.status, requestedPage),
    [applied],
  );

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isStaff) return;

    let cancelled = false;

    load(page)
      .then((response) => {
        if (!cancelled) setResult(response);
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
  }, [ready, user, isStaff, load, page, router]);

  function handleFilter(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    setPage(1);
    setApplied({ status });
  }

  function handleReload(): void {
    setLoading(true);
    setError(null);
    load(page)
      .then((response) => {
        setResult(response);
      })
      .catch((caught) => {
        setError(errorMessage(caught));
      })
      .finally(() => setLoading(false));
  }

  async function refreshAfterAction(message: string): Promise<void> {
    setNotice(message);
    setActionForm(null);
    setResult(await load(page));
  }

  async function handleApprove(campaign: Campaign): Promise<void> {
    setBusyId(campaign.id);
    setError(null);
    setNotice(null);

    try {
      const response = await api.reviewCampaign(campaign.id, "approve");
      await refreshAfterAction(
        `“${campaign.title}” disetujui dan berstatus ${response.data.status_label.toLowerCase()}.`,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReasonAction(campaign: Campaign): Promise<void> {
    if (!actionForm || actionForm.campaignId !== campaign.id) return;

    const reason = actionForm.reason.trim();
    if (reason === "") {
      setError(
        actionForm.action === "reject"
          ? "Alasan penolakan wajib diisi."
          : "Alasan pembekuan wajib diisi.",
      );
      return;
    }

    setBusyId(campaign.id);
    setError(null);
    setNotice(null);

    try {
      const response =
        actionForm.action === "reject"
          ? await api.reviewCampaign(campaign.id, "reject", reason)
          : await api.freezeCampaign(campaign.id, reason);
      const actionLabel = actionForm.action === "reject" ? "ditolak" : "dibekukan";
      await refreshAfterAction(
        `“${campaign.title}” ${actionLabel} dengan status ${response.data.status_label.toLowerCase()}.`,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnfreeze(campaign: Campaign): Promise<void> {
    setBusyId(campaign.id);
    setError(null);
    setNotice(null);

    try {
      const response = await api.unfreezeCampaign(campaign.id);
      await refreshAfterAction(
        `“${campaign.title}” dibuka kembali dengan status ${response.data.status_label.toLowerCase()}.`,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function handleClose(campaign: Campaign): Promise<void> {
    setBusyId(campaign.id);
    setError(null);
    setNotice(null);

    try {
      const response = await api.closeCampaign(campaign.id);
      await refreshAfterAction(
        `“${campaign.title}” ditutup. Refund ${rupiah(response.refund.total)} untuk ${response.refund.donor_count} donatur.`,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  function startReasonAction(campaign: Campaign, action: ReasonAction): void {
    setError(null);
    setActionForm({ campaignId: campaign.id, action, reason: "" });
  }

  if (!ready || (isStaff && loading)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Loading label="Memuat antrean kampanye…" />
      </div>
    );
  }

  if (!user) return null;

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert tone="info">Operasi kampanye hanya dapat diakses verifikator dan admin.</Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </div>
    );
  }

  const currentPage = result?.meta?.current_page ?? page;
  const lastPage = result?.meta?.last_page ?? 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
            Kepatuhan
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">
            Operasi kampanye
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Setiap keputusan mengikuti state machine kampanye dan dicatat ke audit
            log. Kampanye frozen harus di-unfreeze sebelum ditutup.
          </p>
        </div>
        <Link
          href={user.role === "admin" ? "/admin" : "/dashboard"}
          className="btn-secondary"
        >
          Dasbor
        </Link>
      </header>

      <form onSubmit={handleFilter} className="card grid gap-4 p-5 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="campaign-status" className="field-label">
            Status kampanye
          </label>
          <select
            id="campaign-status"
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Semua status</option>
            {STATUS_OPTIONS.map(([label, value]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Terapkan
          </button>
        </div>
      </form>

      {error ? (
        <ErrorState message={error} onRetry={handleReload} />
      ) : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {!result || result.data.length === 0 ? (
        error ? null : (
          <EmptyState
            title="Tidak ada kampanye"
            description="Tidak ada kampanye yang cocok dengan status pilihan saat ini."
          />
        )
      ) : (
        <>
          <div className="space-y-4">
            {result.data.map((campaign) => {
              const canClose = ["active", "funded", "expired"].includes(campaign.status);

              return (
                <article key={campaign.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/campaigns/${campaign.slug}`}
                          className="text-lg font-semibold text-ink hover:underline"
                        >
                          {campaign.title}
                        </Link>
                        <StatusBadge status={campaign.status} label={campaign.status_label} />
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        Penggalang: {campaign.campaigner?.name ?? "—"} · Tenggat: {dateOnly(campaign.deadline_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink">
                        {rupiah(campaign.current_amount)}
                      </p>
                      <p className="text-xs text-ink-muted">
                        dari {rupiah(campaign.target_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 max-w-xl">
                    <Progress value={campaign.progress_percent} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {campaign.allowed_mcc.map((code) => (
                      <span
                        key={code}
                        className="rounded-full bg-sunken px-2.5 py-1 text-xs text-ink"
                      >
                        {mccTitle(code)} · {code}
                      </span>
                    ))}
                  </div>

                  {campaign.freeze_reason ? (
                    <div className="mt-4">
                      <Alert tone="warning">Alasan pembekuan: {campaign.freeze_reason}</Alert>
                    </div>
                  ) : null}
                  {campaign.rejection_reason ? (
                    <div className="mt-4">
                      <Alert tone="warning">Alasan penolakan: {campaign.rejection_reason}</Alert>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                    {campaign.status === "pending_review" ? (
                      <>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={busyId !== null}
                          onClick={() => handleApprove(campaign)}
                        >
                          {busyId === campaign.id ? "Memproses…" : "Setujui"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busyId !== null}
                          onClick={() => startReasonAction(campaign, "reject")}
                        >
                          Tolak
                        </button>
                      </>
                    ) : null}

                    {["active", "funded"].includes(campaign.status) ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={busyId !== null}
                        onClick={() => startReasonAction(campaign, "freeze")}
                      >
                        Bekukan
                      </button>
                    ) : null}

                    {campaign.status === "frozen" ? (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={busyId !== null}
                        onClick={() => handleUnfreeze(campaign)}
                      >
                        {busyId === campaign.id ? "Memproses…" : "Buka kembali"}
                      </button>
                    ) : null}

                    {canClose ? (
                      <ConfirmDialog
                        trigger={
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={busyId !== null}
                          >
                            Tutup & refund
                          </button>
                        }
                        title="Tutup kampanye dan refund?"
                        description={`Sisa dana kampanye "${campaign.title}" akan dikembalikan secara proporsional ke donatur. Tindakan ini tidak dapat dibatalkan.`}
                        confirmLabel="Tutup & refund"
                        onConfirm={() => handleClose(campaign)}
                      />
                    ) : null}
                  </div>


                </article>
              );
            })}
          </div>

          <FormOverlay
            open={Boolean(actionForm && reasonCampaign)}
            onOpenChange={(open) => {
              if (!open) setActionForm(null);
            }}
            title={
              actionForm?.action === "freeze"
                ? "Bekukan kampanye"
                : "Tolak kampanye"
            }
            description={
              reasonCampaign
                ? `Tindakan untuk "${reasonCampaign.title}" akan tercatat di audit log.`
                : "Tindakan ini akan tercatat di audit log."
            }
            dirty={Boolean(actionForm?.reason.trim())}
            onDiscard={() => setActionForm(null)}
            closeLabel="Batal"
            footer={
              <>

                <button
                  type="submit"
                  form="campaign-reason-form"
                  className="btn-primary"
                  disabled={busyId !== null}
                  aria-busy={busyId !== null || undefined}
                >
                  {busyId !== null ? "Memproses..." : "Konfirmasi"}
                </button>
              </>
            }
          >
            <form
              id="campaign-reason-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (reasonCampaign) void handleReasonAction(reasonCampaign);
              }}
              className="grid gap-4"
            >
              <div>
                <label htmlFor="campaign-reason" className="field-label">
                  {actionForm?.action === "freeze"
                    ? "Alasan pembekuan"
                    : "Alasan penolakan"}
                </label>
                <textarea
                  id="campaign-reason"
                  required
                  autoFocus
                  maxLength={500}
                  rows={4}
                  className="input"
                  value={actionForm?.reason ?? ""}
                  onChange={(event) =>
                    setActionForm((current) =>
                      current
                        ? { ...current, reason: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Tulis alasan yang dapat diaudit..."
                />
              </div>
              {error ? <Alert>{error}</Alert> : null}
            </form>
          </FormOverlay>

          {lastPage > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current - 1);
                }}
              >
                Sebelumnya
              </button>
              <span className="text-sm text-ink-muted">
                Halaman {currentPage} dari {lastPage}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage >= lastPage}
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current + 1);
                }}
              >
                Berikutnya
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
