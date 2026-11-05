import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScreenHeaderProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function ScreenHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}: ScreenHeaderProps) {
  return (
    <header
      className={cn("flex flex-wrap items-end justify-between gap-4", className)}
      {...props}
    >
      <div>
        {eyebrow ? (
          <p className="text-label font-medium text-ink-secondary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-h1 font-semibold text-ink md:text-h1-lg">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
