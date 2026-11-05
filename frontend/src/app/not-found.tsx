import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 py-20 text-center sm:px-6"
      aria-labelledby="not-found-title"
    >
      <p className="text-label font-medium uppercase tracking-[0.2em] text-ink-secondary">
        Halaman tidak ditemukan
      </p>

      <h1
        id="not-found-title"
        className="text-3xl font-semibold leading-tight text-ink sm:text-4xl"
      >
        404
      </h1>

      <p className="max-w-md text-body text-ink-secondary">
        Halaman yang kamu cari tidak ada atau sudah dipindah. Cek kembali
        tulisannya, atau kembali ke halaman sebelumnya.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/" className="btn-primary">
          Kembali ke kampanye
        </Link>
        <Link href="/dashboard" className="btn-secondary">
          Kembali ke dasbor
        </Link>
      </div>

      <p className="text-xs text-ink-muted">
        Jika ini terjadi saat kamu lagi baca, screenshot dan kabari tim agar
        kami bisa perbaiki.
      </p>
    </div>
  );
}
