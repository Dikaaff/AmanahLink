import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Field (§9.1, §9.2). Label yang tetap ada, kontras, dan error inline.
 */
export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  htmlFor?: string;
  label: string;
  error?: string;
  hint?: string;
  counter?: string;
}

export function fieldNoteId(id: string): string {
  return `${id}-note`;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(
  ({ htmlFor, label, error, hint, counter, className, children, ...props }, ref) => {
    const message = error ?? hint;
    const noteId = htmlFor ? fieldNoteId(htmlFor) : undefined;

    return (
      <div ref={ref} className={cn("min-w-0", className)} {...props}>
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
            id={noteId}
            className="mt-1 flex items-start gap-1.5 text-body-sm text-ink"
            role={error ? "alert" : undefined}
          >
            {error ? (
              <CircleAlert
                aria-hidden="true"
                size={16}
                strokeWidth={1.5}
                className="mt-0.5 shrink-0"
              />
            ) : null}
            <span className={error ? "font-medium" : "text-ink-muted"}>
              {message}
            </span>
          </p>
        ) : null}
      </div>
    );
  },
);

Field.displayName = "Field";
