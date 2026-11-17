"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppPage } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ScreenHeader } from "@/components/screen-header";
import { DanaTabs } from "@/components/dana-tabs";
import { Alert, EmptyState, Loading, StatusBadge } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  errorMessage,
  type Disbursement,
  type Paginated,
  type Receipt,
} from "@/lib/api";
import { dateTime, rupiah } from "@/lib/format";
import { notifySuccess, useFlash } from "@/lib/feedback";

function withRows<T>(page: Paginated<T> | null): Paginated<T> | null {
  if (!page) return null;
  return { ...page, data: Array.isArray(page.data) ? page.data : [] };
}

export default function ReceiptsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const canUse = user?.role === "campaigner" || user?.role === "admin";

  const [transactions, setTransactions] = useState<Disbursement[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  );

  const [transactionId, setTransactionId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [receipts, setReceipts] = useState<Paginated<Receipt> | null>(null);
  const [page, setPage] = useState(1);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  const [flashKey, flash] = useFlash();

  // A rejected receipt still leaves the payment without accepted proof, so
  // the campaigner must be able to upload a replacement from here.
  const pending = useMemo(
    () =>
      transactions.filter(
        (item) =>
          !item.receipt ||
          (item.status === "disputed" && item.receipt.status === "rejected"),
      ),
    [transactions],
  );

  const selectedTransaction =
    transactions.find((item) => String(item.id) === transactionId) ?? null;
  const isReplacement =
    selectedTransaction?.status === "disputed" &&
    selectedTransaction.receipt?.status === "rejected";

  const loadTransactions = useCallback(async () => {
    const response = await api.disbursements(1);
    return Array.isArray(response.data) ? response.data : [];
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

    loadTransactions()
      .then((rows) => {
        if (!cancelled) {
          setTransactions(rows);
          setTransactionsError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setTransactionsError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setTransactionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, canUse, loadTransactions, router]);

  useEffect(() => {
    if (!ready || !user || !canUse) return;

    let cancelled = false;

    api
      .myReceipts(page)
      .then((response) => {
        if (!cancelled) {
          setReceipts(withRows(response));
          setReceiptsError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setReceiptsError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setReceiptsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, canUse, page]);

  function handleReloadTransactions() {
    setTransactionsLoading(true);
    setTransactionsError(null);
    loadTransactions()
      .then(setTransactions)
      .catch((caught) => setTransactionsError(errorMessage(caught)))
      .finally(() => setTransactionsLoading(false));
  }

  function handleReloadReceipts() {
    setReceiptsLoading(true);
    setReceiptsError(null);
    api
      .myReceipts(page)
      .then((response) => setReceipts(withRows(response)))
      .catch((caught) => setReceiptsError(errorMessage(caught)))
      .finally(() => setReceiptsLoading(false));
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();

    if (!transactionId || !file) {
      setUploadError("Pilih transaksi dan berkas nota terlebih dahulu.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const response = await api.uploadReceipt(Number(transactionId), file);
      notifySuccess(
        `Nota terunggah dengan status ${response.data.status_label.toLowerCase()}. OCR diproses antrean.`,
      );
      setFile(null);
      setTransactionId("");
      setTransactions((current) =>
        current.map((item) =>
          item.id === response.data.transaction_id
            ? {
                ...item,
                receipt: {
                  id: response.data.id,
                  status: response.data.status,
                  status_label: response.data.status_label,
                  confidence:
                    response.data.confidence === null
                      ? null
                      : String(response.data.confidence),
                  rejection_reason: response.data.rejection_reason,
                  reviewed_at: response.data.reviewed_at,
                  created_at: response.data.created_at,
                },
              }
            : item,
        ),
      );
      setReceipts((current) =>
        current && (current.meta?.current_page ?? 1) === 1
          ? { ...current, data: [response.data, ...current.data] }
          : current,
      );
      flash(`receipt-${response.data.id}`);
    } catch (caught) {
      setUploadError(errorMessage(caught));
    } finally {
      setUploading(false);
    }
  }

  if (!ready || (canUse && (transactionsLoading || receiptsLoading))) {
    return (
      <AppPage>
        <div role="status" aria-label="Memuat nota" className="space-y-6">
          <span className="sr-only">Memuat nota.</span>
          <Skeleton className="h-9 w-48" />
          <div className="space-y-3 border-t border-line pt-6">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-5 w-full" />
            ))}
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
          Nota hanya dapat diunggah oleh akun penggalang dana dan administrator.
        </Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </AppPage>
    );
  }

  const lastPage = receipts?.meta?.last_page ?? 1;

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="Dana"
        title="Nota"
        description="Unggah bukti transaksi setelah pembayaran ke merchant dan pantau statusnya. Nota adalah kewajiban bukti, bukan cara menarik uang."
        className="!items-start"
      />

      <DanaTabs />

      <p className="rounded-md border border-line bg-sunken p-3 text-body-sm text-ink-secondary">
        Penggantian dana tunai (reimbursement) belum tersedia di demo ini.
        Dana hanya bergerak lewat pembayaran ke merchant.
      </p>

      <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <section aria-labelledby="upload-heading">
        <h2 id="upload-heading" className="text-h2 font-semibold text-ink">
          Unggah nota
        </h2>

        {transactionsError ? (
          <div className="mt-4">
            <Alert>Gagal memuat transaksi: {transactionsError}</Alert>
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={handleReloadTransactions}
            >
              Coba lagi
            </button>
          </div>
        ) : pending.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Tidak ada transaksi tanpa nota"
              description="Semua pembayaran terbaru sudah punya nota. Pembayaran baru akan muncul di sini."
              action={
                <Link href="/dashboard/pencairan" className="btn-secondary">
                  Lihat pembayaran
                </Link>
              }
            />
          </div>
        ) : (
          <form onSubmit={handleUpload} className="mt-4 grid gap-5">
            <div>
              <label htmlFor="receipt-transaction" className="field-label">
                Transaksi
              </label>
              <select
                id="receipt-transaction"
                required
                className="input"
                value={transactionId}
                onChange={(event) => {
                  setTransactionId(event.target.value);
                  setUploadError(null);
                }}
              >
                <option value="">Pilih transaksi</option>
                {pending.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.campaign?.title ?? "Pembayaran ke merchant"} · {rupiah(item.amount)}{" "}
                    · {item.merchant?.name ?? "merchant"}
                    {item.receipt?.status === "rejected"
                      ? " · nota pengganti"
                      : ""}
                  </option>
                ))}
              </select>
              {isReplacement ? (
                <p className="mt-2 rounded-md border border-line bg-sunken p-3 text-xs text-ink-secondary">
                  Nota sebelumnya ditolak
                  {selectedTransaction.receipt?.rejection_reason
                    ? `: ${selectedTransaction.receipt.rejection_reason}`
                    : "."}{" "}
                  Nota pengganti harus disetujui staf lain sebelum belanja
                  kampanye dibuka lagi.
                </p>
              ) : null}
            </div>

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
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setUploadError(null);
                }}
              />
              <p className="mt-1 text-xs text-ink-muted">JPEG atau PNG.</p>
            </div>

            {uploadError ? <Alert>{uploadError}</Alert> : null}

            <div className="flex flex-wrap gap-3 border-t border-line pt-5">
              <button
                type="submit"
                className="btn-primary"
                disabled={uploading}
                aria-busy={uploading || undefined}
              >
                {uploading
                  ? "Mengunggah…"
                  : isReplacement
                    ? "Upload nota pengganti"
                    : "Upload nota"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section
        aria-labelledby="receipt-status-heading"
        className="border-t border-line pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="receipt-status-heading"
              className="text-h2 font-semibold text-ink"
            >
              Status nota
            </h2>
            <p className="mt-1 text-body-sm text-ink-secondary">
              {receipts?.meta?.total ?? 0} nota tercatat
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={receiptsLoading}
            aria-busy={receiptsLoading || undefined}
            onClick={handleReloadReceipts}
          >
            {receiptsLoading ? "Memuat…" : "Muat ulang"}
          </button>
        </div>

        {receiptsError ? (
          <div className="mt-4">
            <Alert>Gagal memuat status nota: {receiptsError}</Alert>
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={handleReloadReceipts}
            >
              Coba lagi
            </button>
          </div>
        ) : receiptsLoading && receipts === null ? (
          <div className="mt-4">
            <Loading label="Memuat status nota…" />
          </div>
        ) : !receipts || receipts.data.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Belum ada nota"
              description="Unggah nota setelah pembayaran ke merchant berhasil; status OCR dan keputusan verifikator akan muncul di sini."
            />
          </div>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {receipts.data.map((receipt) => (
                <li
                  key={receipt.id}
                  className={`py-4${flashKey === `receipt-${receipt.id}` ? " feedback-flash" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-body-sm font-semibold text-ink">
                        {receipt.transaction?.campaign?.title ??
                          "Nota transaksi"}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {receipt.transaction
                          ? rupiah(receipt.transaction.amount)
                          : "Nominal tidak tersedia"}
                        {receipt.confidence !== null
                          ? ` · OCR ${Math.round(Number(receipt.confidence) * 100)}%`
                          : ""}{" "}
                        · {dateTime(receipt.created_at)}
                      </p>
                    </div>
                    <StatusBadge
                      status={receipt.status}
                      label={receipt.status_label}
                    />
                  </div>
                  {receipt.rejection_reason ? (
                    <p className="mt-3 break-words text-body-sm text-ink">
                      {receipt.rejection_reason}
                    </p>
                  ) : null}
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
      </div>
    </AppPage>
  );
}
