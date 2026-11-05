import Link from "next/link";

export const metadata = {
  title: "Pemeliharaan — AmanahLink",
  description:
    "AmanahLink sedang dalam pemeliharaan singkat. Coba lagi beberapa saat kemudian.",
};

export default function MaintenancePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 py-20 text-center sm:px-6">
      <p className="text-label font-medium uppercase tracking-[0.2em] text-ink-secondary">
        Sistem sedang dipelihara
      </p>

      <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">
        Sedang dipelihara
      </h1>

      <p className="max-w-md text-body text-ink-secondary">
        Kami memperbarui sistem dan menutup sementara akses. Fitur bisa kembali
        dalam beberapa menit atau beberapa jam. Cek lagi nanti.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/" className="btn-primary">
          Lihat kampanye
        </Link>
        <Link href="/login" className="btn-secondary">
          Tunggu dan masuk nanti
        </Link>
      </div>

      <p className="text-xs text-ink-muted">
        Jika ini berlangsung lebih dari satu jam, kabari tim — sertakan waktu dan
        halaman yang kamu buka.
      </p>
    </div>
  );
}
