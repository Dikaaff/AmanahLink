"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppPage } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ScreenHeader } from "@/components/screen-header";
import { Alert, EmptyState, ErrorState, Loading } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormOverlay } from "@/components/ui/form-overlay";
import { api, errorMessage, type Paginated, type User, type UserRole } from "@/lib/api";
import { dateOnly } from "@/lib/format";
import { notifyFailure, notifySuccess } from "@/lib/feedback";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "donor", label: "Donatur" },
  { value: "campaigner", label: "Penggalang" },
  { value: "verifier", label: "Verifikator" },
  { value: "admin", label: "Administrator" },
];

type AssignableRole = "donor" | "campaigner" | "verifier";

function roleActions(
  target: User,
): { role: AssignableRole; label: string }[] {
  if (target.role === "donor") {
    return [
      { role: "verifier", label: "Jadikan verifikator" },
      { role: "campaigner", label: "Jadikan penggalang" },
    ];
  }

  if (target.role === "campaigner") {
    return [
      { role: "verifier", label: "Jadikan verifikator" },
      { role: "donor", label: "Jadikan donatur" },
    ];
  }

  if (target.role === "verifier") {
    return [{ role: "campaigner", label: "Jadikan penggalang" }];
  }

  return [];
}

export default function AdminUsersPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({ q: "", role: "", status: "" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendError, setSuspendError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const load = useCallback(
    (requestedPage: number) =>
      api.adminUsers(
        {
          q: applied.q,
          role: applied.role,
          status: applied.status,
        },
        requestedPage,
      ),
    [applied],
  );

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) return;

    let cancelled = false;

    load(page)
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
  }, [ready, user, isAdmin, load, page, router]);

  function handleFilter(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPage(1);
    setApplied({ q: q.trim(), role, status });
  }

  function handleReload() {
    setLoading(true);
    setError(null);
    load(page)
      .then((response) => setResult(response))
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  function applyUser(next: User, message: string) {
    setResult((current) => {
      if (!current) return current;
      return {
        ...current,
        data: current.data.map((item) => (item.id === next.id ? next : item)),
      };
    });
    notifySuccess(message);
  }

  async function handleRole(target: User, nextRole: AssignableRole) {
    setBusyId(target.id);
    setError(null);

    try {
      const response = await api.updateUserRole(target.id, nextRole);
      applyUser(
        response.data,
        `${target.name} sekarang berperan ${response.data.role_label.toLowerCase()}.`,
      );
    } catch (caught) {
      notifyFailure(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function handleSuspend(event: React.FormEvent) {
    event.preventDefault();

    if (!suspendTarget) return;

    const reason = suspendReason.trim();

    if (reason.length < 5) {
      setSuspendError("Alasan penangguhan minimal 5 karakter.");
      return;
    }

    setBusyId(suspendTarget.id);
    setSuspendError(null);

    try {
      const response = await api.suspendUser(suspendTarget.id, reason);
      applyUser(response.data, `${suspendTarget.name} ditangguhkan.`);
      setSuspendTarget(null);
      setSuspendReason("");
    } catch (caught) {
      setSuspendError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReactivate(target: User) {
    setBusyId(target.id);
    setError(null);

    try {
      const response = await api.reactivateUser(target.id);
      applyUser(response.data, `${target.name} dapat masuk kembali.`);
    } catch (caught) {
      notifyFailure(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  if (!ready || (isAdmin && loading)) {
    return (
      <AppPage>
        <Loading label="Memuat pengguna…" />
      </AppPage>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert tone="info">Pengelolaan pengguna hanya untuk administrator.</Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </div>
    );
  }

  const currentPage = result?.meta?.current_page ?? page;
  const lastPage = result?.meta?.last_page ?? 1;

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="Admin"
        title="Pengguna"
        description="Kelola akses dan peran. Penangguhan langsung memblokir login dan token yang masih aktif."
        className="!items-start"
      />

      <div className="rounded-sm border border-line bg-sunken p-4 text-body-sm text-ink-secondary">
        Admin tidak dapat mengubah data keuangan pengguna dari halaman ini, dan
        tidak dapat menangguhkan akunnya sendiri atau akun administrator lain.
      </div>

      <form
        onSubmit={handleFilter}
        className="card grid gap-4 p-5 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
      >
        <div>
          <label htmlFor="user-query" className="field-label">
            Cari nama atau email
          </label>
          <input
            id="user-query"
            type="search"
            className="input"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="mis. Budi atau budi@"
          />
        </div>
        <div>
          <label htmlFor="user-role" className="field-label">
            Peran
          </label>
          <select
            id="user-role"
            className="input"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="">Semua peran</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="user-status" className="field-label">
            Status akun
          </label>
          <select
            id="user-status"
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="suspended">Ditangguhkan</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Terapkan
          </button>
        </div>
      </form>

      {error ? <ErrorState message={error} onRetry={handleReload} /> : null}

      {!result || result.data.length === 0 ? (
        error ? null : (
          <EmptyState
            variant="search"
            title="Tidak ada pengguna"
            description="Tidak ada akun yang cocok dengan pencarian dan filter saat ini."
          />
        )
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-body-sm">
              <thead className="border-b border-line text-label uppercase text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Pengguna
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Peran
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Bergabung
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.data.map((target) => {
                  const isSelf = target.id === user.id;
                  const actions = roleActions(target);
                  const busy = busyId === target.id;

                  return (
                    <tr key={target.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-medium text-ink">
                          {target.name}
                          {isSelf ? (
                            <span className="ml-2 text-xs font-normal text-ink-muted">
                              (Anda)
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 break-all text-xs text-ink-muted">
                          {target.email}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-ink-secondary">
                        {target.role_label}
                      </td>
                      <td className="px-4 py-4">
                        {target.is_suspended ? (
                          <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-inverse">
                            Ditangguhkan
                          </span>
                        ) : target.email_verified_at ? (
                          <span className="rounded-full bg-sunken px-2.5 py-1 text-xs font-medium text-ink">
                            Aktif
                          </span>
                        ) : (
                          <span className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-muted">
                            Email belum diverifikasi
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-ink-muted">
                        {dateOnly(target.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {target.role === "admin" ? (
                            <span className="text-xs text-ink-muted">
                              Dikelola di luar console
                            </span>
                          ) : (
                            <>
                              {actions.map((action) => (
                                <button
                                  key={action.role}
                                  type="button"
                                  className="btn-secondary"
                                  disabled={busy}
                                  onClick={() => void handleRole(target, action.role)}
                                >
                                  {action.label}
                                </button>
                              ))}

                              {target.is_suspended ? (
                                <ConfirmDialog
                                  trigger={
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      disabled={busy}
                                    >
                                      Aktifkan
                                    </button>
                                  }
                                  title="Aktifkan kembali akun?"
                                  description={`${target.name} akan dapat login dan memakai kembali token baru. Tindakan ini tercatat di audit log.`}
                                  confirmLabel="Aktifkan akun"
                                  onConfirm={() => void handleReactivate(target)}
                                />
                              ) : (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  disabled={busy || isSelf}
                                  onClick={() => {
                                    setSuspendError(null);
                                    setSuspendReason("");
                                    setSuspendTarget(target);
                                  }}
                                >
                                  Tangguhkan
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {lastPage > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current - 1);
                }}
              >
                Sebelumnya
              </button>
              <span className="text-sm text-ink-muted">
                Halaman {currentPage} dari {lastPage}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage >= lastPage}
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current + 1);
                }}
              >
                Berikutnya
              </button>
            </div>
          ) : null}
        </>
      )}

      <FormOverlay
        open={Boolean(suspendTarget)}
        onOpenChange={(open) => {
          if (!open) setSuspendTarget(null);
        }}
        title="Tangguhkan akun"
        description={
          suspendTarget
            ? `${suspendTarget.name} tidak akan bisa login dan token aktifnya dicabut.`
            : undefined
        }
        dirty={suspendReason.trim() !== ""}
        onDiscard={() => {
          setSuspendReason("");
          setSuspendTarget(null);
        }}
        closeLabel="Batal"
        footer={
          <button
            type="submit"
            form="suspend-user-form"
            className="btn-primary"
            disabled={busyId !== null}
          >
            {busyId !== null ? "Memproses…" : "Tangguhkan akun"}
          </button>
        }
      >
        <form id="suspend-user-form" onSubmit={handleSuspend} className="grid gap-4">
          <div>
            <label htmlFor="suspend-reason" className="field-label">
              Alasan penangguhan
            </label>
            <textarea
              id="suspend-reason"
              required
              autoFocus
              maxLength={500}
              rows={4}
              className="input"
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.target.value)}
              placeholder="Tulis alasan yang dapat diaudit..."
            />
          </div>
          {suspendError ? <Alert tone="error">{suspendError}</Alert> : null}
        </form>
      </FormOverlay>
    </AppPage>
  );
}
