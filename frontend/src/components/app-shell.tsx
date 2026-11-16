"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  Activity,
  Bell,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  LogOut,
  Megaphone,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useOnlineStatus } from "@/lib/feedback";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  badge?: number;
  /** Extra routes that light up the same entry (section-level nav). */
  match?: string[];
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

/** Every "spend money" screen lives under one sidebar entry. */
const DANA_PATHS = [
  "/dashboard/pencairan",
  "/dashboard/pindai",
  "/dashboard/nota",
  "/dashboard/simulasi",
];

const REVIEW_PATHS = [
  "/admin/campaigns",
  "/admin/receipts",
  "/admin/audit-logs",
];

const OPS_PATHS = ["/admin", "/admin/webhooks"];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match?.length) {
    return item.match.some(
      (href) => pathname === href || pathname.startsWith(`${href}/`),
    );
  }

  if (item.href === "/dashboard" || item.href === "/admin") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function BrandMark() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-ink text-inverse">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2.6 4.5 5.8v6.1c0 4.4 3.1 8.3 7.5 9.5 4.4-1.2 7.5-5.1 7.5-9.5V5.8L12 2.6Zm3.4 7.2-4.2 4.4a1 1 0 0 1-1.4 0l-2-2.1 1.4-1.3 1.3 1.4 3.5-3.7 1.4 1.3Z"
        />
      </svg>
    </span>
  );
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item);
  const { Icon } = item;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-10 items-center gap-3 rounded-sm px-3 text-body-sm font-medium transition-colors",
        active
          ? "bg-ink text-inverse"
          : "text-ink-secondary hover:bg-canvas hover:text-ink",
      )}
    >
      <Icon
        aria-hidden="true"
        size={18}
        strokeWidth={active ? 2 : 1.6}
        className="shrink-0"
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span
          className={cn(
            "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            active ? "bg-inverse text-ink" : "bg-ink text-inverse",
          )}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Product chrome for signed-in routes. Desktop gets a persistent sidebar so
 * navigation never competes with page content; mobile keeps a compact top bar
 * plus four thumb-reachable destinations. Sections with sibling screens (dana,
 * verifikasi, operasional) use in-page tabs instead of more sidebar entries.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { user, ready, unreadNotifications, logout } = useAuth();
  const online = useOnlineStatus();

  const isFundraiser = user?.role === "campaigner" || user?.role === "admin";
  const isReviewer = user?.role === "verifier" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/dashboard", label: "Dasbor", Icon: LayoutDashboard },
        { href: "/dashboard/donasi", label: "Donasi saya", Icon: ReceiptText },
        {
          href: "/notifications",
          label: "Notifikasi",
          Icon: Bell,
          badge: unreadNotifications,
        },
      ],
    },
  ];

  if (isFundraiser) {
    groups.push({
      label: "Kelola",
      items: [
        { href: "/dashboard/campaigns", label: "Kampanye saya", Icon: Megaphone },
        {
          href: "/dashboard/pencairan",
          label: "Dana",
          Icon: Wallet,
          match: DANA_PATHS,
        },
      ],
    });
  }

  if (isReviewer) {
    groups.push({
      label: "Verifikasi",
      items: [
        {
          href: "/admin/campaigns",
          label: "Review",
          Icon: ClipboardCheck,
          match: REVIEW_PATHS,
        },
      ],
    });
  }

  if (isAdmin) {
    groups.push({
      label: "Admin",
      items: [
        {
          href: "/admin",
          label: "Operasional",
          Icon: Activity,
          match: OPS_PATHS,
        },
      ],
    });
  }

  groups.push({
    label: "Publik",
    items: [{ href: "/", label: "Jelajahi kampanye", Icon: Compass }],
  });

  const mobileItems: NavItem[] = isAdmin
    ? [
        { href: "/dashboard", label: "Dasbor", Icon: LayoutDashboard },
        {
          href: "/admin/campaigns",
          label: "Review",
          Icon: ClipboardCheck,
          match: REVIEW_PATHS,
        },
        { href: "/dashboard/pencairan", label: "Dana", Icon: Wallet, match: DANA_PATHS },
        { href: "/admin", label: "Operasional", Icon: Activity, match: OPS_PATHS },
      ]
    : isReviewer
      ? [
          { href: "/dashboard", label: "Dasbor", Icon: LayoutDashboard },
          {
            href: "/admin/campaigns",
            label: "Review",
            Icon: ClipboardCheck,
            match: REVIEW_PATHS,
          },
          {
            href: "/notifications",
            label: "Notifikasi",
            Icon: Bell,
            badge: unreadNotifications,
          },
        ]
      : isFundraiser
        ? [
            { href: "/dashboard", label: "Dasbor", Icon: LayoutDashboard },
            { href: "/dashboard/campaigns", label: "Kampanye", Icon: Megaphone },
            {
              href: "/dashboard/pencairan",
              label: "Dana",
              Icon: Wallet,
              match: DANA_PATHS,
            },
            {
              href: "/notifications",
              label: "Notifikasi",
              Icon: Bell,
              badge: unreadNotifications,
            },
          ]
        : [
            { href: "/", label: "Jelajahi", Icon: Compass },
            { href: "/dashboard", label: "Dasbor", Icon: LayoutDashboard },
            { href: "/dashboard/donasi", label: "Donasi", Icon: ReceiptText },
            {
              href: "/notifications",
              label: "Notifikasi",
              Icon: Bell,
              badge: unreadNotifications,
            },
          ];

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-sunken lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <BrandMark />
          <span className="text-h3 font-semibold tracking-tight text-ink">
            AmanahLink
          </span>
        </div>

        <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 py-5">
          {groups.map((group, index) => (
            <div
              key={group.label ?? `group-${index}`}
              className={index > 0 ? "mt-6" : ""}
            >
              {group.label ? (
                <p className="px-3 pb-2 text-label font-medium uppercase text-ink-muted">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <SidebarLink item={item} pathname={pathname} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          {!ready ? (
            <div className="h-14 animate-pulse rounded-sm bg-canvas" />
          ) : user ? (
            <div className="flex items-center gap-3 rounded-sm px-2 py-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-body-sm font-semibold text-inverse">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-medium text-ink">
                  {user.name}
                </span>
                <span className="block truncate text-xs text-ink-muted">
                  {user.role_label}
                </span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-sm p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                aria-label="Keluar"
                title="Keluar"
              >
                <LogOut aria-hidden="true" size={16} strokeWidth={1.7} />
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-canvas px-4 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-h3 font-semibold tracking-tight text-ink">
              AmanahLink
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/notifications"
              aria-label={
                unreadNotifications > 0
                  ? `Notifikasi, ${unreadNotifications} belum dibaca`
                  : "Notifikasi"
              }
              className="relative rounded-sm p-2.5 text-ink-secondary hover:bg-sunken hover:text-ink"
            >
              <Bell aria-hidden="true" size={20} strokeWidth={1.7} />
              {unreadNotifications > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ink" />
              ) : null}
            </Link>
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Keluar"
                className="rounded-sm p-2.5 text-ink-secondary hover:bg-sunken hover:text-ink"
              >
                <LogOut aria-hidden="true" size={20} strokeWidth={1.7} />
              </button>
            ) : null}
          </div>
        </header>

        {!online ? (
          <div
            role="status"
            className="bg-ink px-4 py-2 text-center text-body-sm font-medium text-white"
          >
            Anda sedang offline. Perubahan tidak dapat disimpan sampai koneksi
            kembali.
          </div>
        ) : null}

        <main className="min-h-[calc(100dvh-3.5rem)] pb-24 lg:min-h-dvh lg:pb-0">
          {children}
        </main>
      </div>

      <nav
        aria-label="Navigasi mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div
          className="mx-auto grid h-16 max-w-lg"
          style={{
            gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))`,
          }}
        >
          {mobileItems.map((item) => {
            const active = isActive(pathname, item);
            const { Icon } = item;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium",
                  active ? "text-ink" : "text-ink-muted",
                )}
              >
                {active ? (
                  <span className="absolute inset-x-6 top-0 h-0.5 bg-ink" />
                ) : null}
                <span className="relative">
                  <Icon aria-hidden="true" size={21} strokeWidth={active ? 2 : 1.6} />
                  {item.badge ? (
                    <span className="absolute -right-2 -top-1.5 h-2 w-2 rounded-full bg-ink" />
                  ) : null}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/**
 * Shared page frame for signed-in screens: one measure, one rhythm. Focused
 * tasks use `narrow`; lists and tables use the default width.
 */
export function AppPage({
  children,
  narrow = false,
  className,
}: {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-7 px-4 py-7 sm:px-6 lg:space-y-8 lg:px-10 lg:py-10",
        narrow ? "max-w-3xl" : "max-w-6xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
