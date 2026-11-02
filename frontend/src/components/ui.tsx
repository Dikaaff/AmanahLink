import type { ReactNode } from "react";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-brand-50 text-brand-700 ring-brand-200",
  funded: "bg-brand-50 text-brand-700 ring-brand-200",
  draft: "bg-stone-100 text-stone-600 ring-stone-200",
  pending_review: "bg-amber-50 text-amber-700 ring-amber-200",
  frozen: "bg-sky-50 text-sky-700 ring-sky-200",
  expired: "bg-stone-100 text-stone-500 ring-stone-200",
  closed: "bg-stone-100 text-stone-600 ring-stone-200",
  refunded: "bg-rose-50 text-rose-700 ring-rose-200",
  settled: "bg-brand-50 text-brand-700 ring-brand-200",
  initiated: "bg-amber-50 text-amber-700 ring-amber-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  failed: "bg-rose-50 text-rose-700 ring-rose-200",
  uploaded: "bg-amber-50 text-amber-700 ring-amber-200",
  extracting: "bg-amber-50 text-amber-700 ring-amber-200",
  auto_matched: "bg-brand-50 text-brand-700 ring-brand-200",
  needs_review: "bg-amber-50 text-amber-700 ring-amber-200",
  verified: "bg-brand-50 text-brand-700 ring-brand-200",
  approved: "bg-brand-50 text-brand-700 ring-brand-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  receipt_pending: "bg-amber-50 text-amber-700 ring-amber-200",
  reconciled: "bg-brand-50 text-brand-700 ring-brand-200",
  disputed: "bg-rose-50 text-rose-700 ring-rose-200",
  requested: "bg-amber-50 text-amber-700 ring-amber-200",
  mcc_validated: "bg-sky-50 text-sky-700 ring-sky-200",
  authorized: "bg-sky-50 text-sky-700 ring-sky-200",
  captured: "bg-amber-50 text-amber-700 ring-amber-200",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        STATUS_STYLES[status] ?? "bg-stone-100 text-stone-600 ring-stone-200"
      }`}
    >
      {label ?? status}
    </span>
  );
}

export function Progress({ percent }: { percent: number }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-stone-200"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-brand-600 transition-[width]"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info" | "warning";
  children: ReactNode;
}) {
  const styles = {
    error: "border-rose-200 bg-rose-50 text-rose-800",
    success: "border-brand-200 bg-brand-50 text-brand-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`} role="alert">
      {children}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = "Coba lagi",
}: {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="card p-6">
      <Alert>{message}</Alert>
      <button type="button" className="btn-secondary mt-4" onClick={onRetry}>
        {retryLabel}
      </button>
    </div>
  );
}

export function Loading({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-12 text-sm text-stone-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-brand-600" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-stone-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-stone-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}
