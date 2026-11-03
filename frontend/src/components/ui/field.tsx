import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Stable id for the note under a field, so inputs can point at it. */
export function fieldNoteId(id: string): string {
  return `${id}-note`;
}

/**
 * Field (§9.1, §14.1). The label is always visible — never a placeholder that
 * disappears. The message sits under the field, not in a toast, and carries an
 * icon plus text so the error is not encoded by color alone.
 */
export function Field({
  htmlFor,
  label,
  hint,
  error,
  counter,
  className,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string | null;
  counter?: string;
  className?: string;
  children: ReactNode;
}) {
  const message = error ?? hint;
  const invalid = Boolean(error);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-label font-medium uppercase text-ink-secondary"
        >
          {label}
        </label>
        {counter ? (
          <span className="numeric shrink-0 font-mono text-body-sm text-ink-muted">
            {counter}
          </span>
        ) : null}
      </div>
      <div className="mt-1">{children}</div>
      {message ? (
        <p
          id={fieldNoteId(htmlFor)}
          className="mt-1 flex items-start gap-1.5 text-body-sm text-ink"
          role={invalid ? "alert" : undefined}
        >
          {invalid ? (
            <CircleAlert
              aria-hidden="true"
              size={16}
              strokeWidth={1.5}
              className="mt-0.5 shrink-0"
            />
          ) : null}
          <span className={invalid ? "font-medium" : "text-ink-muted"}>
            {message}
          </span>
        </p>
      ) : null}
    </div>
  );
}
