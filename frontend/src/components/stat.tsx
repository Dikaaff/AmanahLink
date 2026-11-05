import type { ReactNode } from "react";

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
      <p className="text-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-ink-secondary">{hint}</p>
      ) : null}
    </div>
  );
}

type BadgeTone = "pending_review" | "needs_review" | "approved" | "rejected" | "canceled" | "closed";

const badgeSurfaceByTone: Record<BadgeTone, string> = {
  pending_review: "bg-sunken border-line",
  needs_review: "bg-amber-50 border-amber-200",
  approved: "bg-emerald-50 border-emerald-200",
  rejected: "bg-rose-50 border-rose-200",
  canceled: "bg-sunken border-line",
  closed: "bg-sunken border-line",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const tone = status as BadgeTone;
  const surface =
    tone in badgeSurfaceByTone
      ? badgeSurfaceByTone[tone]
      : "bg-sunken border-line";

  return (
    <span className={`rounded-sm border px-2.5 py-0.5 text-label text-ink ${surface}`}>
      {label ?? status}
    </span>
  );
}
