import type { HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PageFooterProps extends HTMLAttributes<HTMLDivElement> {
  backLabel?: string;
  backHref?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  secondaryChildren?: ReactNode;
}

export function PageFooter({
  backLabel = "Kembali ke dasbor",
  backHref = "/dashboard",
  secondaryHref,
  secondaryLabel,
  secondaryChildren,
  className,
  ...props
}: PageFooterProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4",
        className,
      )}
      {...props}
    >
      <Link href={backHref} className="btn-secondary">
        {backLabel}
      </Link>
      {secondaryHref ? (
        <Link href={secondaryHref} className="btn-secondary">
          {secondaryChildren ?? secondaryLabel}
        </Link>
      ) : null}
    </div>
  );
}
