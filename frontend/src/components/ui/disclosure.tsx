import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Progressive disclosure without extra state: a native `<details>` block.
 * Use it for secondary detail (technical identifiers, ledger notes, demo
 * data) that does not belong in the default scan path.
 */
export function Disclosure({
  summary,
  children,
  className,
  open = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  open?: boolean;
}) {
  return (
    <details
      open={open}
      className={cn(
        "group border-line [&_summary::-webkit-details-marker]:hidden",
        className,
      )}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-body-sm font-medium text-ink-secondary transition-colors hover:text-ink">
        <span className="min-w-0">{summary}</span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          strokeWidth={1.7}
          className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="pb-4 pt-1">{children}</div>
    </details>
  );
}
