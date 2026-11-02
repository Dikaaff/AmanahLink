import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function ShimmerButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-white/20 opacity-0 transition-[left,opacity] duration-700 group-hover:left-[120%] group-hover:opacity-100" />
      <span className="relative">{children}</span>
    </button>
  );
}
