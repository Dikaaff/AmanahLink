import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Progress (§9.1). Garis 1px; nilai ≤ 80% → warn, > 80% → waspada (§5.2).
 * Kontras ≥ 7:1 (ink, #0A0A0A).
 */
export function Progress({
  value = 0,
  percent,
  label,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  value?: number;
  percent?: number;
  label?: string;
}) {
  const normalized = Math.max(0, Math.min(100, Math.round(percent ?? value)));
  const isCritical = normalized > 80;

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-line",
        className,
      )}
      role="progressbar"
      aria-label={label}
      aria-valuenow={normalized}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-150",
          isCritical ? "bg-ink" : "bg-ink",
        )}
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}
