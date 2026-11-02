import type { ReactNode } from "react";
import { Check, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { Badge, badgeToneForStatus } from "@/components/ui/badge";

/**
 * Legacy status badge, now backed by the six-tone Paper & Ink system (§5.2).
 * The API `status_label` is no longer rendered here: badges carry one of six
 * semantic words, and the precise label becomes row-level detail at P5.
 */
export function StatusBadge({ status }: { status: string; label?: string }) {
  return <Badge tone={badgeToneForStatus(status)} />;
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
  /* Tone is carried by the icon shape and the weight, never by color (R07). */
  const { Icon, weight } = {
    error: { Icon: CircleAlert, weight: "font-medium" },
    success: { Icon: Check, weight: "font-normal" },
    info: { Icon: Info, weight: "font-normal" },
    warning: { Icon: TriangleAlert, weight: "font-medium" },
  }[tone];

  return (
    <div
      className="flex gap-3 rounded-sm border border-line bg-sunken px-4 py-3 text-body-sm text-ink"
      role="alert"
    >
      <Icon aria-hidden="true" size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" />
      <div className={`min-w-0 flex-1 ${weight}`}>{children}</div>
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
