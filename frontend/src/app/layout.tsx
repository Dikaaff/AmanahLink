import type { Metadata } from "next";
import { connection } from "next/server";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AuthProvider } from "@/components/auth-provider";
import { SiteChrome } from "@/components/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "AmanahLink — Donasi terverifikasi, dana terkunci untuk tujuan",
  description:
    "Platform penggalangan dana dengan pencairan terbatas ke merchant terverifikasi dan kategori transaksi (MCC) yang diizinkan kampanye.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();

  return (
    <html
      lang="id"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <SiteChrome>{children}</SiteChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
