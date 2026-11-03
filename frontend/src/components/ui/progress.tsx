import { cn } from "@/lib/utils";

/**
 * Progress (§5.3): a single series, filled with ink. No gradient, no color
 * change at thresholds — the number next to it carries the meaning.
 */
export function Progress({
  percent,
  label = "Progres",
  className,
}: {
  percent: number;
  /** Accessible name, e.g. "Progres kampanye". */
  label?: string;
  className?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-sm bg-line", className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-ink transition-[width] duration-[220ms] motion-reduce:transition-none"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
