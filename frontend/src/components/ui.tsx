import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge, badgeToneForStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";

/**
 * Legacy surface still imported by screens that will be rebuilt at P5. Every
 * component here now delegates to a P4 primitive so no screen carries a second
 * implementation of the same idea.
 */
export { Alert } from "@/components/ui/alert";
export { Progress } from "@/components/ui/progress";

export function StatusBadge({ status }: { status: string; label?: string }) {
  return <Badge tone={badgeToneForStatus(status)} />;
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = "Coba lagi",
}: {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}) {
  return (
    <Card className="p-5">
      <Alert>{message}</Alert>
      <Button variant="secondary" className="mt-4" onClick={onRetry}>
        {retryLabel}
      </Button>
    </Card>
  );
}

/** Inline pending label. Full-page spinners are forbidden (§16). */
export function Loading({ label = "Memuat…" }: { label?: string }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2 py-10 text-body-sm text-ink-secondary"
    >
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-line border-t-ink motion-reduce:animate-none"
      />
      {label}
    </p>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Empty
      icon={<Inbox size={24} strokeWidth={1.5} />}
      title={title}
      description={description}
      action={action}
    />
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="border-t border-line pt-3">
      <p className="text-label font-medium uppercase text-ink-secondary">
        {label}
      </p>
      <p className="numeric mt-1 text-num-md font-medium text-ink">{value}</p>
      {hint ? <p className="mt-1 text-body-sm text-ink-muted">{hint}</p> : null}
    </div>
  );
}
