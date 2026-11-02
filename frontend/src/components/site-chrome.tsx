"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Nav } from "@/components/nav";

/**
 * Product chrome (navigation + footer) is legacy styling until P5. Design
 * reference routes render without it so the specimen is judged on its own
 * typography, not on the old palette.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDesignRoute = pathname?.startsWith("/design") ?? false;

  if (isDesignRoute) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Nav />
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-stone-200/70 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            AmanahLink membatasi pencairan ke merchant terverifikasi dengan
            kategori transaksi (MCC) yang diizinkan kampanye.
          </p>
          <p>IDR · Asia/Jakarta · MVP</p>
        </div>
      </footer>
    </>
  );
}
