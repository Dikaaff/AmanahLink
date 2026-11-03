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

export function StatusBadge({ status }: { status: string; label?: string }) {
  return (
    <span className="rounded-sm border border-line bg-sunken px-2.5 py-0.5 text-label text-ink">
      {status}
    </span>
  );
}
