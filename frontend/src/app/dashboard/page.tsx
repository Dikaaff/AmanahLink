"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppPage } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ScreenHeader } from "@/components/screen-header";
import { Alert, EmptyState, ErrorState, Progress, StatusBadge } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  errorMessage,
  type Campaign,
  type Disbursement,
  type Donation,
  type Paginated,
} from "@/lib/api";
import { dateOnly, dateTime, rupiah } from "@/lib/format";
import { notifySuccess } from "@/lib/feedback";

function withRows<T>(page: Paginated<T> | null): Paginated<T> | null {
  if (!page) return null;
  return { ...page, data: Array.isArray(page.data) ? page.data : [] };
}

function isRunning(status: string): boolean {
  return status === "active" || status === "funded";
}

type Activity = {
  key: string;
  kind: "Donasi" | "Pembayaran";
  title: string;
  amount: string;
  status: string;
  statusLabel: string;
  at: string | null;
  href: string;
};

function activityFrom(
  donations: Donation[],
  disbursements: Disbursement[],
): Activity[] {
  const rows: Activity[] = [
    ...donations.map((donation) => ({
      key: `donation-${donation.id}`,
      kind: "Donasi" as const,
      title: donation.campaign?.title ?? "Donasi",
      amount: donation.amount,
      status: donation.status,
      statusLabel: donation.status_label,
      at: donation.created_at,
      href: "/dashboard/donasi",
    })),
    ...disbursements.map((item) => ({
      key: `disbursement-${item.id}`,
      kind: "Pembayaran" as const,
      title: item.campaign?.title ?? "Pembayaran ke merchant",
      amount: item.amount,
      status: item.status,
      statusLabel: item.status_label,
      at: item.created_at,
      href: "/dashboard/pencairan",
    })),
  ];

  return rows
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
    .slice(0, 4);
}

function OverviewSkeleton() {
  return (
    <AppPage>
      <div role="status" aria-label="Memuat dasbor" className="space-y-8">
        <span className="sr-only">Memuat dasbor.</span>
        <div className="space-y-3">
          <Skeleton className="h-9 w-60" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-4 border-y border-line py-7">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-11 w-64" />
          <Skeleton className="h-2 w-full max-w-md rounded-full" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="border-t border-line py-4">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="mt-3 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="border-t border-line py-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppPage>
  );
}

export default function DashboardPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<Paginated<Donation> | null>(null);
  const [disbursements, setDisbursements] = useState<Paginated<Disbursement> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const isFundraiser = user?.role === "campaigner" || user?.role === "admin";

  const fetchOverview = useCallback(async () => {
    const [mine, myDonations, myDisbursements] = await Promise.all([
      isFundraiser ? api.myCampaigns() : Promise.resolve(null),
      api.donations(1),
      isFundraiser ? api.disbursements(1) : Promise.resolve(null),
    ]);

    return { mine, myDonations, myDisbursements };
  }, [isFundraiser]);

  const applyOverview = useCallback(
    (data: {
      mine: Awaited<ReturnType<typeof api.myCampaigns>> | null;
      myDonations: Awaited<ReturnType<typeof api.donations>>;
      myDisbursements: Awaited<ReturnType<typeof api.disbursements>> | null;
    }) => {
      if (data.mine) {
        setCampaigns(Array.isArray(data.mine.data) ? data.mine.data : []);
      }

      setDonations(withRows(data.myDonations));
      if (data.myDisbursements) {
        setDisbursements(withRows(data.myDisbursements));
      }
    },
    [],
  );

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    fetchOverview()
      .then((data) => {
        if (!cancelled) {
          applyOverview(data);
          setError(null);
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
  }, [ready, user, router, fetchOverview, applyOverview]);

  function handleReload() {
    setLoading(true);
    setError(null);
    fetchOverview()
      .then(applyOverview)
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  const running = useMemo(
    () => campaigns.filter((campaign) => isRunning(campaign.status)),
    [campaigns],
  );
  const drafts = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "draft"),
    [campaigns],
  );

  const totals = useMemo(() => {
    const collected = running.reduce(
      (sum, campaign) => sum + Number(campaign.current_amount),
      0,
    );
    const target = running.reduce(
      (sum, campaign) => sum + Number(campaign.target_amount),
      0,
    );

    return {
      collected,
      target,
      percent: target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0,
    };
  }, [running]);

  const settledDonations = useMemo(() => {
    const rows = donations?.data ?? [];
    return {
      count: donations?.meta?.total ?? rows.length,
      value: rows
        .filter((donation) => donation.status === "settled")
        .reduce((sum, donation) => sum + Number(donation.amount), 0),
    };
  }, [donations]);

  const activity = useMemo(
    () => activityFrom(donations?.data ?? [], disbursements?.data ?? []),
    [donations, disbursements],
  );

  async function handleResendVerification() {
    setResendingVerification(true);
    setVerificationError(null);

    try {
      const response = await api.resendVerification();
      notifySuccess(
        response.message ?? "Tautan verifikasi email sudah dikirim ulang.",
      );
    } catch (caught) {
      setVerificationError(errorMessage(caught));
    } finally {
      setResendingVerification(false);
    }
  }

  if (!ready || (user && loading)) {
    return <OverviewSkeleton />;
  }

  if (!user) return null;

  return (
    <AppPage>
      <ScreenHeader
        title={`Halo, ${user.name}`}
        description={`${user.role_label} · ${user.email}`}
        actions={
          isFundraiser ? (
            <>
              <Link href="/dashboard/pencairan" className="btn-primary">
                Belanja kampanye
              </Link>
              <Link href="/dashboard/new" className="btn-secondary">
                Buat kampanye
              </Link>
            </>
          ) : (
            <Link href="/" className="btn-primary">
              Jelajahi kampanye
            </Link>
          )
        }
        className="!items-start"
      />

      {error ? <ErrorState message={error} onRetry={handleReload} /> : null}

      {!user.email_verified_at ? (
        <Alert tone="warning" title="Email belum diverifikasi">
          <p>
            Verifikasi email sebelum membuat kampanye, berdonasi, atau memindahkan
            dana.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-secondary"
              disabled={resendingVerification}
              aria-busy={resendingVerification || undefined}
              onClick={handleResendVerification}
            >
              {resendingVerification ? "Mengirim…" : "Kirim ulang tautan"}
            </button>
            {verificationError ? (
              <span className="text-body-sm">{verificationError}</span>
            ) : null}
          </div>
        </Alert>
      ) : null}

      {/* One action queue, only when it is not empty. */}
      {isFundraiser && drafts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-accent bg-accent-soft px-4 py-3">
          <p className="text-body-sm text-ink">
            <span className="font-semibold">{drafts.length} draf</span> belum
            diajukan untuk review.
          </p>
          <Link
            href="/dashboard/campaigns"
            className="text-body-sm font-medium text-accent-strong underline underline-offset-4"
          >
            Ajukan draf
          </Link>
        </div>
      ) : null}

      {isFundraiser ? (
        <>
          <section className="border-y border-line py-7">
            <p className="text-label font-medium uppercase text-ink-secondary">
              Dana terkumpul
            </p>
            <p className="numeric mt-2 text-display font-semibold text-ink md:text-display-lg">
              {rupiah(totals.collected)}
            </p>
            <p className="mt-2 text-body-sm text-ink-secondary">
              {running.length} kampanye berjalan
              {totals.target > 0
                ? ` · target gabungan ${rupiah(totals.target)}`
                : ""}
            </p>
            {totals.target > 0 ? (
              <div className="mt-5 max-w-lg">
                <Progress value={totals.percent} label="Progres target gabungan" />
                <p className="mt-2 text-xs text-ink-muted">
                  {totals.percent}% dari target gabungan
                </p>
              </div>
            ) : null}
          </section>

          <div className="grid gap-9 lg:grid-cols-[1.6fr_1fr]">
            <section aria-labelledby="running-campaigns" className="min-w-0">
              <div className="flex items-end justify-between gap-3">
                <h2 id="running-campaigns" className="text-h2 font-semibold text-ink">
                  Kampanye berjalan
                </h2>
                <Link
                  href="/dashboard/campaigns"
                  className="shrink-0 text-body-sm font-medium text-ink-secondary underline underline-offset-4 hover:text-ink"
                >
                  Semua
                </Link>
              </div>

              {running.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="Belum ada kampanye berjalan"
                    description="Buat draf, lengkapi kategori transaksi yang diizinkan, lalu ajukan untuk review."
                    action={
                      <Link href="/dashboard/new" className="btn-primary">
                        Buat kampanye
                      </Link>
                    }
                  />
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {running.slice(0, 3).map((campaign) => (
                    <li key={campaign.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/campaigns/${campaign.slug}`}
                          className="min-w-0 break-words text-body-sm font-semibold text-ink hover:underline"
                        >
                          {campaign.title}
                        </Link>
                        <StatusBadge
                          status={campaign.status}
                          label={campaign.status_label}
                        />
                      </div>
                      <p className="numeric mt-1.5 text-body-sm text-ink">
                        {rupiah(campaign.current_amount)}
                        <span className="font-normal text-ink-muted">
                          {" "}
                          dari {rupiah(campaign.target_amount)}
                        </span>
                      </p>
                      <div className="mt-2">
                        <Progress
                          value={campaign.progress_percent}
                          label={`Progres ${campaign.title}`}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-ink-muted">
                        {Math.round(campaign.progress_percent)}% · Tenggat{" "}
                        {dateOnly(campaign.deadline_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="recent-activity" className="min-w-0">
              <h2 id="recent-activity" className="text-h2 font-semibold text-ink">
                Aktivitas terakhir
              </h2>

              {activity.length === 0 ? (
                <p className="mt-3 text-body-sm text-ink-secondary">
                  Belum ada donasi atau pembayaran yang tercatat.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {activity.map((item) => (
                    <li key={item.key}>
                      <Link href={item.href} className="group block py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 break-words text-body-sm font-medium text-ink group-hover:underline">
                            {item.title}
                          </p>
                          <StatusBadge
                            status={item.status}
                            label={item.statusLabel}
                          />
                        </div>
                        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                          <span className="numeric text-body-sm text-ink">
                            {rupiah(item.amount)}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {item.kind} · {dateTime(item.at)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-body-sm">
                <Link
                  href="/dashboard/pencairan"
                  className="font-medium text-ink-secondary underline underline-offset-4 hover:text-ink"
                >
                  Riwayat pembayaran
                </Link>
                <Link
                  href="/dashboard/donasi"
                  className="font-medium text-ink-secondary underline underline-offset-4 hover:text-ink"
                >
                  Riwayat donasi
                </Link>
              </div>
            </section>
          </div>

          <p className="border-t border-line pt-5 text-body-sm text-ink-secondary">
            Ingin mencoba tanpa memindahkan dana?{" "}
            <Link
              href="/dashboard/simulasi"
              className="font-medium text-ink underline underline-offset-4"
            >
              Simulasi pindai
            </Link>
          </p>
        </>
      ) : (
        <>
          <section className="border-y border-line py-7">
            <p className="text-label font-medium uppercase text-ink-secondary">
              Donasi tercatat
            </p>
            <p className="numeric mt-2 text-display font-semibold text-ink md:text-display-lg">
              {settledDonations.count}
            </p>
            <p className="mt-2 text-body-sm text-ink-secondary">
              {settledDonations.value > 0
                ? `Nilai selesai di halaman ini ${rupiah(settledDonations.value)}`
                : "Donasi yang sudah settle akan muncul di sini"}
            </p>
          </section>

          <section aria-labelledby="donor-donations">
            <div className="flex items-end justify-between gap-3">
              <h2 id="donor-donations" className="text-h2 font-semibold text-ink">
                Donasi saya
              </h2>
              <Link
                href="/dashboard/donasi"
                className="shrink-0 text-body-sm font-medium text-ink-secondary underline underline-offset-4 hover:text-ink"
              >
                Semua
              </Link>
            </div>

            {!donations || donations.data.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Belum ada donasi"
                  description="Donasi yang Anda buat akan muncul di sini beserta status penyelesaiannya."
                  action={
                    <Link href="/" className="btn-primary">
                      Lihat kampanye
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {donations.data.slice(0, 6).map((donation) => (
                  <li key={donation.id} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      {donation.campaign ? (
                        <Link
                          href={`/campaigns/${donation.campaign.slug}`}
                          className="min-w-0 break-words text-body-sm font-semibold text-ink hover:underline"
                        >
                          {donation.campaign.title}
                        </Link>
                      ) : (
                        <span className="min-w-0 break-words text-body-sm font-semibold text-ink">
                          Donasi
                        </span>
                      )}
                      <StatusBadge
                        status={donation.status}
                        label={donation.status_label}
                      />
                    </div>
                    <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span className="numeric text-body-sm text-ink">
                        {rupiah(donation.amount)}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {dateTime(donation.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AppPage>
  );
}
