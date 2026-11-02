"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

function BrandMark() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
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
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
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
    <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-sand-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-lg font-semibold tracking-tight text-stone-900">
            AmanahLink
          </span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-1">
          <NavLink href="/">Kampanye</NavLink>
          {user ? <NavLink href="/dashboard">Dasbor</NavLink> : null}
          {user ? (
            <NavLink href="/notifications">
              <span className="inline-flex items-center gap-1.5">
                Notifikasi
                {unreadNotifications > 0 ? (
                  <span className="rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] leading-none text-white">
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
              <NavLink href="/admin/receipts">Review nota</NavLink>
              <NavLink href="/admin/audit-logs">Audit</NavLink>
            </>
          ) : null}
          {user?.role === "admin" ? <NavLink href="/admin">Admin</NavLink> : null}
        </nav>

        <div className="flex items-center gap-2">
          {!ready ? (
            <span className="h-8 w-24 animate-pulse rounded-full bg-stone-200" />
          ) : user ? (
            <>
              <span className="hidden text-right text-xs leading-tight text-stone-500 sm:block">
                <span className="block font-semibold text-stone-800">
                  {user.name}
                </span>
                {user.role_label}
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
              <Link href="/register" className="btn-primary !px-4 !py-2">
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
