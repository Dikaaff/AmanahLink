import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Empty (§9.1): one 24px icon, one sentence, one action. Text is centered only
 * here and on success/dialog screens (§7.3 rule 6).
 */
export function Empty({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-md border border-line px-6 py-10 text-center",
        className,
      )}
    >
      <span className="text-ink-muted" aria-hidden="true">
        {icon}
      </span>
      <h3 className="mt-3 text-h3 font-medium text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-body-sm text-ink-secondary">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
