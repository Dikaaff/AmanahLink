"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Nav } from "@/components/nav";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useOnlineStatus } from "@/lib/feedback";

/**
 * Product chrome (navigation + footer) is legacy styling until P5. Design
 * reference routes render without it so the specimen is judged on its own
 * typography, not on the old palette.
 */
const APP_ROUTES = ["/dashboard", "/admin", "/notifications"];

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDesignRoute = pathname?.startsWith("/design") ?? false;
  const isAppRoute = APP_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );
  const online = useOnlineStatus();

  // Signed-in screens own their chrome: a desktop sidebar and a mobile bottom
  // bar. The public marketing shell would only compete with them.
  if (isDesignRoute || isAppRoute) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      {!online ? (
        <div
          role="status"
          className="bg-accent-strong px-4 py-2 text-center text-body-sm font-medium text-white"
        >
          Anda sedang offline. Perubahan tidak dapat disimpan sampai koneksi kembali.
        </div>
      ) : null}
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <footer className="mt-16 border-t border-line bg-sunken">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            AmanahLink membatasi pembayaran ke merchant terverifikasi dengan
            kategori transaksi (MCC) yang diizinkan kampanye.
          </p>
          <p>IDR · Asia/Jakarta · MVP</p>
        </div>
      </footer>
      <MobileBottomNav />
    </>
  );
}
