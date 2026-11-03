import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton (§9.1): shaped like the content it replaces, never a full-screen
 * spinner. The pulse stops under `prefers-reduced-motion`.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-sm bg-line motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

/** Three lines of body text, at 100% / 92% / 64% width. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ["w-full", "w-11/12", "w-2/3"];

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn("h-4", widths[index % 3])} />
      ))}
    </div>
  );
}

/** A list row at the product row height (56px for one line). */
export function SkeletonRow() {
  return (
    <div className="flex h-14 items-center justify-between gap-4 border-b border-line">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-md border border-line p-5">
      <Skeleton className="h-6 w-24" />
      <div className="mt-4">
        <SkeletonText lines={2} />
      </div>
      <Skeleton className="mt-5 h-2 w-full" />
    </div>
  );
}
