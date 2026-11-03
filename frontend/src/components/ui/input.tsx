import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Input (§9.2). The border is the only boundary, so it uses `line-strong`
 * (measured 3.25:1 light / 3.48:1 dark). Error state switches the border to
 * ink and adds a message — never a color-only cue.
 */
export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-sm border border-line-strong bg-canvas px-3 text-body text-ink",
        "placeholder:text-ink-muted",
        "transition-colors duration-100",
        "focus:border-ink",
        "disabled:cursor-not-allowed disabled:border-line disabled:bg-sunken disabled:text-ink-muted",
        "aria-[invalid=true]:border-2 aria-[invalid=true]:border-ink",
        className,
      )}
      {...props}
    />
  );
}
