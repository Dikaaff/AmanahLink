import type { ReactNode } from "react";
import { Check, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertTone = "error" | "success" | "info" | "warning";

const TONE = {
  error: { Icon: CircleAlert, weight: "font-medium", tone: "border-danger bg-danger-soft text-danger" },
  success: { Icon: Check, weight: "font-normal", tone: "border-success bg-success-soft text-success" },
  info: { Icon: Info, weight: "font-normal", tone: "border-accent bg-accent-soft text-accent-strong" },
  warning: { Icon: TriangleAlert, weight: "font-medium", tone: "border-warning bg-warning-soft text-warning" },
} as const;

/**
 * Inline alert (§9.1). Tone is carried by the icon shape and the text weight;
 * the color never is. Copy follows §14.2: what happened, why, what to do next.
 */
export function Alert({
  tone = "error",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const { Icon, weight, tone: toneClass } = TONE[tone];

  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-sm border px-4 py-3 text-body-sm",
        toneClass,
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        size={20}
        strokeWidth={1.5}
        className="mt-0.5 shrink-0"
      />
      <div className={cn("min-w-0 flex-1", weight)}>
        {title ? <p className="font-medium">{title}</p> : null}
        <div className={title ? "mt-1 text-ink-secondary" : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}
