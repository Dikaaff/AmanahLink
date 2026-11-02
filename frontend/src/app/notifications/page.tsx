"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert, EmptyState, ErrorState, Loading, StatusBadge } from "@/components/ui";
import {
  api,
  errorMessage,
  type AppNotification,
  type Paginated,
} from "@/lib/api";
import { dateTime } from "@/lib/format";

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
  const { user, ready, unreadNotifications, refreshUnreadNotifications } = useAuth();
  const router = useRouter();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [result, setResult] = useState<Paginated<AppNotification> | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
        if (!cancelled) setResult(response);
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
    setNotice(null);

    try {
      await api.markNotificationRead(notification.id);
      setResult(await load());
      await refreshUnreadNotifications();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setWorkingId(null);
    }
  }

  async function handleMarkAllRead() {
    setWorkingId("all");
    setError(null);
    setNotice(null);

    try {
      const response = await api.markAllNotificationsRead();
      setNotice(`${response.data.marked} notifikasi ditandai sudah dibaca.`);
      setResult(await load());
      await refreshUnreadNotifications();
    } catch (caught) {
      setError(errorMessage(caught));
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Inbox
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">
            Notifikasi Anda
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {unreadNotifications > 0
              ? `${unreadNotifications} notifikasi belum dibaca.`
              : "Semua notifikasi sudah dibaca."}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          disabled={unreadNotifications === 0 || workingId !== null}
          onClick={handleMarkAllRead}
        >
          {workingId === "all" ? "Memproses…" : "Tandai semua dibaca"}
        </button>
      </header>

      <label className="card flex cursor-pointer items-center gap-3 px-5 py-4 text-sm text-stone-700">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand-700"
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
      {notice ? <Alert tone="success">{notice}</Alert> : null}

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
              <Link href="/dashboard" className="btn-secondary">
                Kembali ke dasbor
              </Link>
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
                    notification.read_at ? "opacity-75" : "ring-2 ring-brand-100"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                        Perubahan kampanye
                      </span>
                      {!notification.read_at ? (
                        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Baru
                        </span>
                      ) : null}
                      {status ? <StatusBadge status={status} /> : null}
                    </div>
                    <p className="mt-2 font-semibold text-stone-900">
                      {notificationMessage(notification)}
                    </p>
                    {campaignSlug ? (
                      <Link
                        href={`/campaigns/${campaignSlug}`}
                        className="mt-1 inline-block text-sm text-brand-700 hover:underline"
                      >
                        {campaignTitle} →
                      </Link>
                    ) : null}
                    <time
                      dateTime={notification.created_at ?? undefined}
                      className="mt-2 block text-xs text-stone-500"
                    >
                      {dateTime(notification.created_at)}
                    </time>
                  </div>
                  {!notification.read_at ? (
                    <button
                      type="button"
                      className="btn-ghost shrink-0 self-start"
                      disabled={workingId !== null}
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
