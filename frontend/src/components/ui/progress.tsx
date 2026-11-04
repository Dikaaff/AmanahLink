import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Progress is a single ink fill on a line track. No color threshold: length is
 * the only signal, which keeps the component unambiguous without color.
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

  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-line", className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={normalized}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full rounded-full bg-ink transition-[width] duration-150 motion-reduce:transition-none"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}
