import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Input (§9.1, §9.2). Label persisten, kontras teks ≥ 7:1, ring + garis ink
 * pada focus, pesan error inline di bawah field.
 */
export function Input({
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      id={id}
      className={cn(
        "min-h-11 w-full rounded-sm border border-line-strong bg-canvas px-3 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-ink focus:ring-2 focus:ring-ink/20 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
