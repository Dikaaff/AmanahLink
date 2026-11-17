import { cn } from "@/lib/utils";

/** Amanah Loop: a bold A-shaped path joined to its transaction trail. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ink text-accent", className)} aria-hidden="true">
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <path d="M6.2 23.3 13.8 7.9c.7-1.5 3-1.5 3.8 0l8.2 15.4M10.1 18.5h11.2" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.2 25.2c2.5 1.8 5.1 1.7 7.3-.2 2.1-1.8 4.9-1.8 7 0 1.1 1 2.2 1.3 3.3 1.1" stroke="#EEF9FC" strokeWidth="2.25" strokeLinecap="round" />
      </svg>
    </span>
  );
}
