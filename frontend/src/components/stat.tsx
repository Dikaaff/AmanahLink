import type { ReactNode } from "react";
import { Badge, badgeToneForStatus } from "@/components/ui/badge";

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

/**
 * Status rendering is delegated to the six-tone system (DD-07/DD-17): the
 * backend status maps to one semantic tone with its own word, and the API
 * `status_label` is intentionally not rendered in the badge.
 */
export function StatusBadge({
  status,
  label,
}: {
  status: string;
  /** One-word override; multi-word backend labels are ignored (DD-17). */
  label?: string;
}) {
  const tone = badgeToneForStatus(status);
  return <Badge tone={tone} label={label && !label.includes(" ") ? label : undefined} />;
}
