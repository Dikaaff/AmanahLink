"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert, EmptyState, ErrorState, Loading, StatusBadge } from "@/components/ui";
import { FormOverlay } from "@/components/ui/form-overlay";
import { api, errorMessage, type Paginated, type Receipt } from "@/lib/api";
import { dateTime } from "@/lib/format";

function textValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export default function ReceiptReviewPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState("needs_review");
  const [applied, setApplied] = useState({ status: "needs_review" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<Receipt> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const rejectingReceipt =
    (rejectingId !== null &&
      result?.data.find((receipt) => receipt.id === rejectingId)) ||
    null;

  const isStaff = user?.role === "verifier" || user?.role === "admin";

  const load = useCallback(
    (requestedPage: number) => api.receipts(applied.status, requestedPage),
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

  async function handleReview(receipt: Receipt, decision: "approve" | "reject") {
    if (decision === "reject" && rejectionReason.trim() === "") {
      setError("Alasan penolakan wajib diisi.");
      return;
    }

    setReviewingId(receipt.id);
    setError(null);
    setNotice(null);

    try {
      const response = await api.reviewReceipt(
        receipt.id,
        decision,
        decision === "reject" ? rejectionReason.trim() : undefined,
      );
      setNotice(
        `Nota #${receipt.id} ditandai sebagai ${response.data.status_label.toLowerCase()}.`,
      );
      setRejectingId(null);
      setRejectionReason("");
      setResult(await load(page));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setReviewingId(null);
    }
  }

  if (!ready || (isStaff && loading)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Loading label="Memuat antrean nota…" />
      </div>
    );
  }

  if (!user) return null;

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert tone="info">Antrean review nota hanya dapat diakses verifikator dan admin.</Alert>
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
            Verifikasi
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">
            Antrean nota
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Cocokkan hasil OCR dengan transaksi sebelum dana dianggap
            terekonsiliasi. Nota dengan confidence rendah masuk ke review manual.
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
          <label htmlFor="receipt-status" className="field-label">
            Status nota
          </label>
          <select
            id="receipt-status"
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Semua status</option>
            <option value="needs_review">Perlu review</option>
            <option value="uploaded">Diunggah</option>
            <option value="extracting">Membaca nota</option>
            <option value="auto_matched">Cocok otomatis</option>
            <option value="verified">Terverifikasi</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
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
            title="Antrean kosong"
            description="Tidak ada nota yang cocok dengan status pilihan saat ini."
          />
        )
      ) : (
        <>
          <div className="space-y-4">
            {result.data.map((receipt) => {
              const merchantName = textValue(receipt.ocr?.merchant_name);
              const extractedAmount = textValue(receipt.ocr?.amount);
              const extractedDate = textValue(receipt.ocr?.date);
              const confidence =
                typeof receipt.confidence === "number"
                  ? `${Math.round(receipt.confidence * 100)}%`
                  : "—";

              return (
                <article key={receipt.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">
                          Nota #{receipt.id}
                        </span>
                        <StatusBadge status={receipt.status} label={receipt.status_label} />
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        Transaksi #{receipt.transaction_id} · {dateTime(receipt.created_at)}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <span className="block text-xs text-ink-muted">Confidence OCR</span>
                      <span className="font-semibold text-ink">{confidence}</span>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-3 rounded-md bg-canvas p-4 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-ink-muted">Merchant terdeteksi</dt>
                      <dd className="mt-1 font-medium text-ink">{merchantName ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">Nominal terdeteksi</dt>
                      <dd className="mt-1 font-medium text-ink">{extractedAmount ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">Tanggal terdeteksi</dt>
                      <dd className="mt-1 font-medium text-ink">{extractedDate ?? "—"}</dd>
                    </div>
                  </dl>

                  {receipt.rejection_reason ? (
                    <Alert tone="warning">Alasan penolakan: {receipt.rejection_reason}</Alert>
                  ) : null}

                  {receipt.status === "needs_review" ? (
                    <div className="mt-5 border-t border-line pt-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={reviewingId !== null}
                          onClick={() => handleReview(receipt, "approve")}
                        >
                          {reviewingId === receipt.id ? "Memproses..." : "Setujui nota"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={reviewingId !== null}
                          onClick={() => {
                            setRejectingId(receipt.id);
                            setRejectionReason("");
                            setError(null);
                          }}
                        >
                          Tolak
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <FormOverlay
            open={Boolean(rejectingReceipt)}
            onOpenChange={(open) => {
              if (!open) {
                setRejectingId(null);
                setRejectionReason("");
              }
            }}
            title="Tolak nota"
            description={
              rejectingReceipt
                ? `Nota #${rejectingReceipt.id} akan ditandai ditolak dan alasannya terlihat oleh penggalang dana.`
                : "Tindakan ini akan tercatat di audit log."
            }
            dirty={rejectionReason.trim() !== ""}
            onDiscard={() => {
              setRejectingId(null);
              setRejectionReason("");
              setError(null);
            }}
            closeLabel="Batal"
            footer={
              <>

                <button
                  type="submit"
                  form="reject-receipt-form"
                  className="btn-primary"
                  disabled={reviewingId !== null}
                  aria-busy={reviewingId !== null || undefined}
                >
                  {reviewingId !== null ? "Memproses..." : "Konfirmasi tolak"}
                </button>
              </>
            }
          >
            <form
              id="reject-receipt-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (rejectingReceipt) {
                  void handleReview(rejectingReceipt, "reject");
                }
              }}
              className="grid gap-4"
            >
              <div>
                <label htmlFor="receipt-rejection-reason" className="field-label">
                  Alasan penolakan
                </label>
                <textarea
                  id="receipt-rejection-reason"
                  required
                  autoFocus
                  maxLength={500}
                  rows={4}
                  className="input"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Jelaskan ketidaksesuaian nota..."
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
