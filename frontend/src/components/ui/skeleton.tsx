import { cn } from "@/lib/utils";

/**
 * Skeleton berbentuk konten (§9.2). Merupakan dukungan visual, bukan spinner
 * penuh layar.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-sunken", className)}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 2,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { lines?: number }) {
  return (
    <p
      className={cn("space-y-2", className)}
      {...props}
    >
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", index === lines - 1 ? "w-1/2" : "w-3/4")}
        />
      ))}
    </p>
  );
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3 rounded-sm border border-line p-5", className)} {...props}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

export function SkeletonRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-3", className)} {...props}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}
