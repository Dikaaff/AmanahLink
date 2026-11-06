"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ClearFilterAction, EmptyState, ErrorState, Loading, StatusBadge } from "@/components/ui";
import {
  api,
  errorMessage,
  type AppNotification,
  type Paginated,
} from "@/lib/api";
import { dateTime } from "@/lib/format";
import { notifyFailure, notifySuccess, useFlash } from "@/lib/feedback";

function withReadAt(
  notification: AppNotification,
  readAt: string,
): AppNotification {
  return { ...notification, read_at: readAt };
}

function textValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function notificationMessage(notification: AppNotification): string {
  return (
    textValue(notification.data.message) ??
    "Ada perubahan baru pada kampanye Anda."
  );
}

export default function NotificationsPage() {
  const { user, ready, refreshUnreadNotifications } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const router = useRouter();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [result, setResult] = useState<Paginated<AppNotification> | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashKey, flash] = useFlash();

  const load = useCallback(
    async (cursor?: string) => {
      const response = await api.notifications({
        unread: unreadOnly,
        cursor,
      });
      return response;
    },
    [unreadOnly],
  );

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    load()
      .then((response) => {
        if (!cancelled) {
          setResult(response);
          setUnreadNotifications(response.meta?.unread_count ?? 0);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, load, router]);

  function handleReload(): void {
    setLoading(true);
    setError(null);
    load()
      .then((response) => setResult(response))
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  async function handleRead(notification: AppNotification) {
    if (notification.read_at) return;

    setWorkingId(notification.id);
    setError(null);

    // Satu-satunya mutasi optimistis di aplikasi: tandai dibaca tidak
    // memindahkan uang dan mudah di-rollback bila server menolak.
    const previous = result;
    const previousUnreadCount = unreadNotifications;
    const rollback = () => {
      setResult(previous);
      setUnreadNotifications(previousUnreadCount);
    };
    const readAt = new Date().toISOString();
    setResult((current) => {
      if (!current) return current;
      const nextData = current.data
        .map((item) =>
          item.id === notification.id ? withReadAt(item, readAt) : item,
        )
        .filter((item) => !unreadOnly || !item.read_at);
      return { ...current, data: nextData };
    });
    setUnreadNotifications((current) => Math.max(0, current - 1));
    flash(`notification-${notification.id}`);

    try {
      await api.markNotificationRead(notification.id);
      await refreshUnreadNotifications();
    } catch (caught) {
      rollback();
      notifyFailure(errorMessage(caught), () => void handleRead(notification));
    } finally {
      setWorkingId(null);
    }
  }

  async function handleMarkAllRead() {
    setWorkingId("all");
    setError(null);

    const previous = result;
    const previousUnreadCount = unreadNotifications;
    setResult((current) =>
      current
        ? {
            ...current,
            data: current.data.map((item) =>
              item.read_at ? item : withReadAt(item, new Date().toISOString()),
            ),
          }
        : current,
    );
    setUnreadNotifications(0);

    try {
      const response = await api.markAllNotificationsRead();
      setUnreadNotifications(response.data.unread_count);
      notifySuccess(`${response.data.marked} notifikasi ditandai sudah dibaca.`);
    } catch (caught) {
      setResult(previous);
      setUnreadNotifications(previousUnreadCount);
      notifyFailure(errorMessage(caught), handleMarkAllRead);
    } finally {
      setWorkingId(null);
    }
  }

  if (!ready || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Loading label="Memuat notifikasi…" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
            Inbox
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">
            Notifikasi Anda
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {unreadNotifications > 0
              ? `${unreadNotifications} notifikasi belum dibaca.`
              : "Semua notifikasi sudah dibaca."}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          disabled={unreadNotifications === 0 || workingId !== null}
          aria-busy={workingId === "all" || undefined}
          onClick={handleMarkAllRead}
        >
          {workingId === "all" ? "Memproses…" : "Tandai semua dibaca"}
        </button>
      </header>

      <label className="card flex cursor-pointer items-center gap-3 px-5 py-4 text-sm text-ink-secondary">
        <input
          type="checkbox"
          className="h-4 w-4 accent-ink"
          checked={unreadOnly}
          onChange={(event) => {
            setLoading(true);
            setUnreadOnly(event.target.checked);
          }}
        />
        Tampilkan yang belum dibaca saja
      </label>

      {error ? (
        <ErrorState message={error} onRetry={handleReload} />
      ) : null}

      {!result || result.data.length === 0 ? (
        error ? null : (
          <EmptyState
            title={unreadOnly ? "Tidak ada yang belum dibaca" : "Belum ada notifikasi"}
            description={
              unreadOnly
                ? "Notifikasi baru akan muncul di sini saat ada perubahan kampanye."
                : "Perubahan status kampanye akan muncul di inbox ini."
            }
            action={
              unreadOnly ? (
                <ClearFilterAction
                  onClear={() => {
                    setLoading(true);
                    setUnreadOnly(false);
                  }}
                />
              ) : (
                <Link href="/dashboard" className="btn-secondary">
                  Kembali ke dasbor
                </Link>
              )
            }
          />
        )
      ) : (
        <>
          <div className="space-y-3">
            {result.data.map((notification) => {
              const campaignSlug = textValue(notification.data.campaign_slug);
              const campaignTitle =
                textValue(notification.data.campaign_title) ?? "Kampanye";
              const status = textValue(notification.data.status);

              return (
                <article
                  key={notification.id}
                  className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between ${
                    flashKey === `notification-${notification.id}` ? "feedback-flash" : ""
                  } ${
                    notification.read_at ? "opacity-75" : "ring-2 ring-line"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink">
                        {textValue(notification.data.type) === "donation_settled"
                          ? "Donasi"
                          : "Perubahan kampanye"}
                      </span>
                      {!notification.read_at ? (
                        <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">
                          Baru
                        </span>
                      ) : null}
                      {status ? <StatusBadge status={status} /> : null}
                    </div>
                    <p className="mt-2 font-semibold text-ink">
                      {notificationMessage(notification)}
                    </p>
                    {campaignSlug ? (
                      <Link
                        href={`/campaigns/${campaignSlug}`}
                        className="mt-1 inline-block text-sm text-ink hover:underline"
                      >
                        {campaignTitle} →
                      </Link>
                    ) : null}
                    <time
                      dateTime={notification.created_at ?? undefined}
                      className="mt-2 block text-xs text-ink-muted"
                    >
                      {dateTime(notification.created_at)}
                    </time>
                  </div>
                  {!notification.read_at ? (
                    <button
                      type="button"
                      className="btn-ghost shrink-0 self-start"
                      disabled={workingId !== null}
                      aria-busy={workingId === notification.id || undefined}
                      onClick={() => handleRead(notification)}
                    >
                      {workingId === notification.id
                        ? "Memproses…"
                        : "Tandai dibaca"}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={!result.meta?.next_cursor || workingId !== null}
              onClick={() => {
                setLoading(true);
                load(result.meta?.next_cursor ?? undefined)
                  .then((response) => setResult(response))
                  .catch((caught) => setError(errorMessage(caught)))
                  .finally(() => setLoading(false));
              }}
            >
              Notifikasi lebih lama →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
