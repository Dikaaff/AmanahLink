"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, House, Info, LayoutDashboard, LogIn, LogOut, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

function isActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/" || pathname.startsWith("/campaigns/")
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  if (!ready) return null;

  const items = user
    ? [
        { href: "/", label: "Kampanye", Icon: House },
        { href: "/dashboard", label: "Dasbor", Icon: LayoutDashboard },
        { href: "/notifications", label: "Notifikasi", Icon: Bell },
      ]
    : [
        { href: "/", label: "Kampanye", Icon: House },
        { href: "/login", label: "Masuk", Icon: LogIn },
        { href: "/register", label: "Daftar", Icon: UserPlus },
      ];

  return (
    <nav
      aria-label="Navigasi mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-4">
        {items.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative inline-flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${active ? "text-ink" : "text-ink-muted"}`}
            >
              {active ? <span className="absolute inset-x-5 top-0 h-0.5 bg-ink" /> : null}
              <Icon aria-hidden="true" size={22} strokeWidth={active ? 2 : 1.5} />
              <span>{label}</span>
            </Link>
          );
        })}

        {user ? (
          <button
            type="button"
            className="inline-flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-ink-muted hover:text-ink"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
          >
            <LogOut aria-hidden="true" size={22} strokeWidth={1.5} />
            <span>Keluar</span>
          </button>
        ) : (
          <Link
            href="/#cara-kerja"
            className="inline-flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-ink-muted hover:text-ink"
          >
            <Info aria-hidden="true" size={22} strokeWidth={1.5} />
            <span>Cara kerja</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
