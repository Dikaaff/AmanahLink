import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Skeletons mirror the final block's box model so the swap does not move the
 * page (CLS target < 0.02). Decorative only; the parent owns `role="status"`.
 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton-shimmer rounded-sm", className)}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 2,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", index === lines - 1 ? "w-1/2" : "w-3/4")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-md border border-line bg-surface p-5",
        className,
      )}
      {...props}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

/** Campaign card: 16:9 media, two title lines, progress, one button. */
export function SkeletonCampaignCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-line bg-surface",
        className,
      )}
      {...props}
    >
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-3 p-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-3/5" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>
    </div>
  );
}

/** Table: five rows with fixed column widths, numbers right-aligned. */
export function SkeletonTable({
  rows = 5,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { rows?: number }) {
  return (
    <div
      className={cn("divide-y divide-line border-y border-line", className)}
      {...props}
    >
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[7rem_1fr_7rem] items-center gap-4 px-4 py-3"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Stat card: 11px label, 32px number, 14px caption. */
export function SkeletonStat({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("space-y-2 rounded-md border border-line p-5", className)}
      {...props}
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3.5 w-24" />
    </div>
  );
}

/** Detail page: 56px header, title, three paragraphs, side panel. */
export function SkeletonDetail({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      <Skeleton className="h-14 w-full" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Skeleton className="h-9 w-3/4" />
          <SkeletonText lines={3} />
          <SkeletonText lines={3} />
          <SkeletonText lines={3} />
        </div>
        <SkeletonCard />
      </div>
    </div>
  );
}

export function SkeletonRow({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between gap-4 py-3", className)}
      {...props}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}
