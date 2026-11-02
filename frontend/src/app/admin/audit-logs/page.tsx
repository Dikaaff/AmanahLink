"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert, EmptyState, ErrorState, Loading } from "@/components/ui";
import { api, errorMessage, type AuditLog, type Paginated } from "@/lib/api";
import { dateTime } from "@/lib/format";

export default function AuditLogsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [filters, setFilters] = useState({
    actor_id: "",
    action: "",
    from: "",
    to: "",
  });
  const [applied, setApplied] = useState(filters);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<Paginated<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isStaff = user?.role === "verifier" || user?.role === "admin";

  const load = useCallback(
    async (pageCursor?: string) => {
      const response = await api.auditLogs({
        actor_id: applied.actor_id || undefined,
        action: applied.action || undefined,
        from: applied.from || undefined,
        to: applied.to || undefined,
        cursor: pageCursor,
      });
      return response;
    },
    [applied],
  );

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isStaff) {
      return;
    }

    let cancelled = false;

    load()
      .then((response) => {
        if (!cancelled) {
          setResult(response);
          setCursor(undefined);
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
  }, [ready, user, isStaff, load, router]);

  function handleFilter(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setApplied(filters);
    setCursor(undefined);
  }

  function handleReload() {
    setLoading(true);
    setError(null);
    load()
      .then((response) => {
        setResult(response);
        setCursor(undefined);
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  if (!ready || (isStaff && loading)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Loading label="Memuat audit log…" />
      </div>
    );
  }

  if (!user) return null;

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert tone="info">Audit log hanya dapat dibaca verifikator dan admin.</Alert>
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Audit
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">
            Jejak perubahan
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Append-only. Setiap mutasi state menulis satu baris; baris tidak dapat
            diubah atau dihapus.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary">
          Dasbor admin
        </Link>
      </header>

      <form onSubmit={handleFilter} className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="actor" className="field-label">
            Actor ID
          </label>
          <input
            id="actor"
            inputMode="numeric"
            className="input"
            placeholder="mis. 2"
            value={filters.actor_id}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                actor_id: event.target.value.replace(/[^\d]/g, ""),
              }))
            }
          />
        </div>
        <div>
          <label htmlFor="action" className="field-label">
            Action
          </label>
          <input
            id="action"
            className="input"
            placeholder="mis. campaign.approved"
            value={filters.action}
            onChange={(event) =>
              setFilters((current) => ({ ...current, action: event.target.value }))
            }
          />
        </div>
        <div>
          <label htmlFor="from" className="field-label">
            Dari tanggal
          </label>
          <input
            id="from"
            type="date"
            className="input"
            value={filters.from}
            onChange={(event) =>
              setFilters((current) => ({ ...current, from: event.target.value }))
            }
          />
        </div>
        <div>
          <label htmlFor="to" className="field-label">
            Sampai tanggal
          </label>
          <input
            id="to"
            type="date"
            className="input"
            value={filters.to}
            onChange={(event) =>
              setFilters((current) => ({ ...current, to: event.target.value }))
            }
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">
            Terapkan
          </button>
        </div>
      </form>

      {error ? <ErrorState message={error} onRetry={handleReload} /> : null}

      {!result || result.data.length === 0 ? (
        error ? null : (
          <EmptyState
            title="Tidak ada log"
            description="Tidak ada baris audit yang cocok dengan filter saat ini."
          />
        )
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {result.data.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                        {dateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3">{log.actor_id ?? "sistem"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-stone-100 px-2 py-1 font-mono text-xs">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {log.subject_type
                          ? `${log.subject_type.split("\\").pop()} #${log.subject_id}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-stone-500">
                        {log.ip_address ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="btn-secondary"
              disabled={!cursor}
              onClick={() => {
                setLoading(true);
                load(undefined)
                  .then((response) => {
                    setResult(response);
                    setCursor(undefined);
                  })
                  .catch((caught) => setError(errorMessage(caught)))
                  .finally(() => setLoading(false));
              }}
            >
              ← Halaman pertama
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!result.meta?.next_cursor}
              onClick={() => {
                setLoading(true);
                const nextCursor = result.meta?.next_cursor ?? undefined;
                load(nextCursor)
                  .then((response) => {
                    setResult(response);
                    setCursor(nextCursor);
                  })
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
