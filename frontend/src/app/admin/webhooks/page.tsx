"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert, EmptyState, ErrorState, Loading, StatusBadge } from "@/components/ui";
import {
  api,
  errorMessage,
  type Paginated,
  type WebhookEvent,
} from "@/lib/api";
import { dateTime } from "@/lib/format";

export default function WebhookEventsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState("dead_letter");
  const [provider, setProvider] = useState("");
  const [applied, setApplied] = useState({ status: "dead_letter", provider: "" });
  const [result, setResult] = useState<Paginated<WebhookEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [replaying, setReplaying] = useState<number | null>(null);

  const load = useCallback(async (cursor?: string) => {
    const response = await api.webhookEvents({
      status: applied.status || undefined,
      provider: applied.provider || undefined,
      cursor,
    });
    return response;
  }, [applied]);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "admin") {
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

  async function handleReplay(event: WebhookEvent) {
    setReplaying(event.id);
    setError(null);
    setNotice(null);

    try {
      const response = await api.replayWebhook(event.id);
      setNotice(
        `Event ${event.external_id} di-replay dengan status ${response.data.status}. Settlement idempoten: ledger tidak digandakan.`,
      );
      setResult(await load());
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setReplaying(null);
    }
  }

  if (!ready || (user?.role === "admin" && loading)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Loading label="Memuat webhook…" />
      </div>
    );
  }

  if (!user) return null;

  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert tone="info">Halaman ini hanya untuk administrator.</Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
            Reliabilitas
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">
            Webhook & dead-letter queue
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Event gagal dicoba ulang otomatis dengan backoff 1m/5m/30m. Setelah
            itu event masuk DLQ dan hanya diproses ulang lewat replay admin.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary">
          Dasbor admin
        </Link>
      </header>

      <form
        className="card grid gap-4 p-5 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          setLoading(true);
          setError(null);
          setApplied({ status, provider });
        }}
      >
        <div>
          <label htmlFor="status" className="field-label">
            Status
          </label>
          <select
            id="status"
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Semua</option>
            <option value="failed">failed</option>
            <option value="dead_letter">dead_letter</option>
            <option value="processed">processed</option>
            <option value="received">received</option>
          </select>
        </div>
        <div>
          <label htmlFor="provider" className="field-label">
            Provider
          </label>
          <input
            id="provider"
            className="input"
            placeholder="mis. fake"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">
            Terapkan
          </button>
        </div>
      </form>

      {error ? (
        <ErrorState message={error} onRetry={handleReload} />
      ) : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {!result || result.data.length === 0 ? (
        error ? null : (
          <EmptyState
            title="Tidak ada event"
            description="Tidak ada webhook yang cocok dengan filter saat ini."
          />
        )
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Percobaan</th>
                    <th className="px-4 py-3">Jadwal / error</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.data.map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs">{event.external_id}</span>
                        <span className="block text-xs text-ink-muted">
                          {event.provider} · {dateTime(event.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={event.status} />
                      </td>
                      <td className="px-4 py-3">{event.attempts}</td>
                      <td className="max-w-[280px] px-4 py-3 text-xs text-ink-secondary">
                        {event.last_error ? (
                          <span className="line-clamp-2">{event.last_error}</span>
                        ) : (
                          "—"
                        )}
                        {event.next_attempt_at ? (
                          <span className="mt-1 block text-ink-muted">
                            Berikutnya: {dateTime(event.next_attempt_at)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {["failed", "dead_letter"].includes(event.status) ? (
                          <button
                            type="button"
                            className="btn-secondary !px-3 !py-1.5"
                            disabled={replaying === event.id}
                            aria-busy={replaying === event.id || undefined}
                            onClick={() => handleReplay(event)}
                          >
                            {replaying === event.id ? "Memproses…" : "Replay"}
                          </button>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={!result.meta?.next_cursor}
              onClick={() => {
                setLoading(true);
                load(result.meta?.next_cursor ?? undefined)
                  .then((response) => setResult(response))
                  .catch((caught) => setError(errorMessage(caught)))
                  .finally(() => setLoading(false));
              }}
            >
              Halaman berikutnya →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
