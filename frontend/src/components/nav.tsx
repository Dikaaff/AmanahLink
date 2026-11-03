"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-sunken text-ink"
          : "text-ink-secondary hover:bg-sunken hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export function Nav() {
  const { user, ready, unreadNotifications, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <span className="text-h3 font-semibold tracking-tight">AmanahLink</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink href="/">Kampanye</NavLink>
          {user ? <NavLink href="/dashboard">Dasbor</NavLink> : null}
          {user ? (
            <NavLink href="/notifications">
              <span className="inline-flex items-center gap-1.5">
                Notifikasi
                {unreadNotifications > 0 ? (
                  <span className="inline-flex items-center justify-center rounded-full bg-ink text-inverse text-label">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                ) : null}
              </span>
            </NavLink>
          ) : null}
          {user && (user.role === "campaigner" || user.role === "admin") ? (
            <NavLink href="/dashboard/new">Kampanye Baru</NavLink>
          ) : null}
          {user && (user.role === "verifier" || user.role === "admin") ? (
            <>
              <NavLink href="/admin/campaigns">Kampanye</NavLink>
              <NavLink href="/admin/receipts">Review nota</NavLink>
              <NavLink href="/admin/audit-logs">Audit</NavLink>
            </>
          ) : null}
          {user?.role === "admin" ? <NavLink href="/admin">Admin</NavLink> : null}
        </nav>

        <div className="flex items-center gap-3">
          {!ready ? (
            <span className="h-9 w-24 animate-pulse rounded-sm bg-sunken" />
          ) : user ? (
            <>
              <span className="hidden text-right leading-snug sm:block">
                <p className="text-label">{user.name}</p>
                <p className="text-[11px] text-ink-secondary">{user.role_label}</p>
              </span>
              <button type="button" onClick={handleLogout} className="btn-ghost">
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Masuk
              </Link>
              <Link href="/register" className="btn-primary">
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
