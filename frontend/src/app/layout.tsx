import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "AmanahLink — Donasi terverifikasi, dana terkunci untuk tujuan",
  description:
    "Platform penggalangan dana dengan pencairan terbatas ke merchant terverifikasi dan kategori transaksi (MCC) yang diizinkan kampanye.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full">
      <body className="flex min-h-full flex-col">
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  );
}
