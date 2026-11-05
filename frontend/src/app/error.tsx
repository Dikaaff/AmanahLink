"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export const metadata = {
  title: "Error — AmanahLink",
  description:
    "Halaman ini gagal dimuat. Coba muat ulang, atau kembali ke halaman sebelumnya.",
};

export default function Error({
  error,
  reset,
}: {
  error: { message: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("App route error boundary:", error);
    }
  }, [error]);

  return (
    <div
      className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 py-20 text-center sm:px-6"
      aria-labelledby="error-title"
    >
      <p className="text-label font-medium uppercase tracking-[0.2em] text-ink-secondary">
        Terjadi masalah
      </p>

      <h1
        id="error-title"
        className="text-3xl font-semibold leading-tight text-ink sm:text-4xl"
      >
        Ada yang tidak beres
      </h1>

      <p className="max-w-md text-body text-ink-secondary">
        Halaman ini gagal dimuat. Bisa jadi sementara — coba sekali lagi, atau
        keluar dan masuk ulang.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={() => reset()} className="btn-primary">
          Muat ulang halaman
        </Button>
        <Link href="/" className="btn-secondary">
          Kembali ke kampanye
        </Link>
        <Link href="/dashboard" className="btn-secondary">
          Kembali ke dasbor
        </Link>
      </div>

      <p className="text-xs text-ink-muted">
        Jika problemnya berulang, screenshot halaman ini dan kabari tim —
        jangan kirim pesan errornya.
      </p>
    </div>
  );
}
