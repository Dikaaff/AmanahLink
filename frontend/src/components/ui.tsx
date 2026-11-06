import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
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
export { Stat, StatusBadge } from "./stat";

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
      <h3 className="text-h3 font-semibold text-ink">Data gagal dimuat</h3>
      <p className="mt-2 text-body-sm text-ink-secondary">{message}</p>
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
  variant = "default",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  variant?: "default" | "search" | "action";
}) {
  return (
    <Empty
      icon={<Inbox size={24} strokeWidth={1.5} />}
      title={title}
      description={description}
      action={action}
      variant={variant}
    />
  );
}

/**
 * Aksi siap pakai untuk empty yang muncul karena filter aktif: hapus filter
 * lalu muat ulang daftar tanpa filter.
 */
export function ClearFilterAction({ onClear }: { onClear: () => void }) {
  return (
    <Button variant="secondary" onClick={onClear}>
      Hapus filter
    </Button>
  );
}
