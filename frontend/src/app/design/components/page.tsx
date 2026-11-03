import type { Metadata } from "next";
import Link from "next/link";
import { Gallery } from "./gallery";

export const metadata: Metadata = {
  title: "Komponen — AmanahLink",
  robots: { index: false, follow: false },
};

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  /* `?mode=light|dark` pins the page so a screenshot cannot claim a mode the
     machine happened to prefer. */
  const requested = (await searchParams).mode;
  const pinnedMode =
    requested === "dark" || requested === "light" ? requested : undefined;

  return (
    <div data-theme={pinnedMode} className="min-h-full bg-canvas text-ink">
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 lg:px-10">
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-ink-secondary">
          <Link href="/design/type" className="underline underline-offset-4">
            Type specimen
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/design/tokens" className="underline underline-offset-4">
            Token &amp; status
          </Link>
          <span aria-hidden="true">·</span>
          <span className="text-ink">Komponen</span>
        </nav>

        <header className="mt-8">
          <p className="text-label font-medium uppercase text-ink-muted">
            P4 · Components
          </p>
          <h1 className="mt-3 text-display font-semibold md:text-display-lg">
            Setiap keadaan terlihat.
          </h1>
          <p className="mt-4 max-w-xl text-body text-ink-secondary">
            Komponen inti dengan tujuh keadaan dari §9.2. Sel hover, fokus, dan
            aktif berisi komponen asli — hasilkan sendiri dengan kursor dan Tab
            alih-alih memercayai gambar. Sel yang bertanda “tidak berlaku”
            memang tidak punya keadaan itu, bukan belum dikerjakan.
          </p>
          <dl className="mt-8 grid gap-x-6 gap-y-3 border-t border-line pt-5 text-body-sm sm:grid-cols-3">
            <div>
              <dt className="text-label font-medium uppercase text-ink-muted">
                Tinggi kontrol
              </dt>
              <dd className="mt-1 numeric">44 · 48 · 52</dd>
            </div>
            <div>
              <dt className="text-label font-medium uppercase text-ink-muted">
                Radius
              </dt>
              <dd className="mt-1 numeric">6 · 10 · 14</dd>
            </div>
            <div>
              <dt className="text-label font-medium uppercase text-ink-muted">
                Bayangan
              </dt>
              <dd className="mt-1">Hanya sheet dan dialog</dd>
            </div>
          </dl>
        </header>

        <div className="mt-12">
          <Gallery />
        </div>
      </div>
    </div>
  );
}
