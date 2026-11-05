import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Tidak Terhubung — AmanahLink",
  description:
    "AmanahLink tidak dapat terhubung ke server. Cek koneksi dan coba lagi.",
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 py-20 text-center sm:px-6">
      <p className="text-label font-medium uppercase tracking-[0.2em] text-ink-secondary">
        Tidak terhubung
      </p>

      <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">
        Koneksi tersputir
      </h1>

      <p className="max-w-md text-body text-ink-secondary">
        AmanahLink tidak bisa mencapai server saat ini. Bisa jadi jaringan kamu,
        atau bisa jadi server sedang di sisi lain.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button className="btn-primary" onClick={() => window.location.reload()}>
          Coba lagi sekarang
        </Button>
        <Link href="/" className="btn-secondary">
          Lihat kampanye
        </Link>
      </div>

      <p className="text-xs text-ink-muted">
        Jika ini berulang, cek koneksi internet atau coba jaringan lain. Kalau
        tetep gagal, screenshot dan kabari tim.
      </p>
    </div>
  );
}
