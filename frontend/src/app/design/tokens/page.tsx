import type { Metadata } from "next";
import Link from "next/link";
import { Badge, BADGE_TONES, badgeSpec, type BadgeTone } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Token & Status — AmanahLink",
  robots: { index: false, follow: false },
};

const SWATCH: Record<string, string> = {
  canvas: "bg-canvas",
  surface: "bg-surface",
  sunken: "bg-sunken",
  line: "bg-line",
  "line-strong": "bg-line-strong",
  "ink-muted": "bg-ink-muted",
  "ink-secondary": "bg-ink-secondary",
  ink: "bg-ink",
  inverse: "bg-inverse",
  overlay: "bg-overlay",
};

const PALETTE = [
  { token: "canvas", role: "Latar utama" },
  { token: "surface", role: "Kartu, dibedakan garis bukan warna" },
  { token: "sunken", role: "Header tabel, area daftar" },
  { token: "line", role: "Garis 1px dekoratif" },
  { token: "line-strong", role: "Garis input, batas interaktif" },
  { token: "ink-muted", role: "Caption, placeholder" },
  { token: "ink-secondary", role: "Teks pendukung" },
  { token: "ink", role: "Teks utama" },
  { token: "inverse", role: "Teks di atas isian hitam" },
  { token: "overlay", role: "Backdrop sheet dan dialog" },
] as const;

const CONTRAST = [
  { pair: "ink / canvas", role: "Body, judul", light: "19,80", dark: "18,97", target: "7:1" },
  { pair: "ink / surface", role: "Teks di kartu", light: "19,80", dark: "17,95", target: "7:1" },
  { pair: "ink / sunken", role: "Teks di header tabel", light: "18,97", dark: "17,34", target: "7:1" },
  { pair: "ink-secondary / canvas", role: "Teks pendukung", light: "7,73", dark: "7,72", target: "7:1" },
  { pair: "ink-secondary / sunken", role: "Metadata di daftar", light: "7,41", dark: "7,06", target: "7:1" },
  { pair: "inverse / ink", role: "Teks badge isian hitam", light: "19,80", dark: "18,97", target: "7:1" },
  { pair: "ink-muted / canvas", role: "Caption, placeholder", light: "4,83", dark: "5,86", target: "4,5:1" },
  { pair: "ink-muted / sunken", role: "Caption di daftar", light: "4,63", dark: "5,35", target: "4,5:1" },
  { pair: "line-strong / canvas", role: "Batas interaktif", light: "3,25", dark: "3,48", target: "3:1" },
  { pair: "line / canvas", role: "Garis dekoratif", light: "1,27", dark: "1,31", target: "1:1" },
] as const;

const SPACING = [
  { value: 4, use: "Label → nilai" },
  { value: 8, use: "Nilai → keterangan; jarak minimal antarelemen" },
  { value: 12, use: "CTA lengket ke navigasi" },
  { value: 16, use: "Padding kartu header/footer, antarparagraf" },
  { value: 20, use: "Padding konten mobile, padding kartu" },
  { value: 24, use: "Antar blok logis (mobile)" },
  { value: 32, use: "Antar blok logis (desktop), mode lapang" },
  { value: 40, use: "Mode lapang" },
  { value: 48, use: "Mode lapang, batas bagian" },
  { value: 64, use: "Jarak bagian pada desktop" },
  { value: 80, use: "Hero desktop" },
  { value: 96, use: "Pemisah bagian besar" },
] as const;

const RADII = [
  { name: "sm", size: "6px", use: "Input, badge, tombol", className: "rounded-sm" },
  { name: "md", size: "10px", use: "Kartu", className: "rounded-md" },
  { name: "lg", size: "14px", use: "Sheet, dialog", className: "rounded-lg" },
  { name: "full", size: "penuh", use: "Chip, avatar", className: "rounded-full" },
] as const;

const STATUS_ROW: { word: string; tone: BadgeTone }[] = [
  { word: "Berhasil", tone: "success" },
  { word: "Menunggu", tone: "pending" },
  { word: "Ditolak", tone: "rejected" },
  { word: "Draf", tone: "draft" },
  { word: "Terkunci", tone: "locked" },
];

function Section({
  code,
  title,
  children,
}: {
  code: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-8">
      <p className="text-label font-medium uppercase text-ink-muted">{code}</p>
      <h2 className="mt-2 text-h2 font-medium text-ink">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ModePanel({
  mode,
  children,
}: {
  mode: "light" | "dark";
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme={mode}
      className="rounded-md border border-line bg-canvas p-5 text-ink"
    >
      <p className="text-label font-medium uppercase text-ink-muted">
        {mode === "light" ? "Mode terang" : "Mode gelap"}
      </p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ContrastTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line-strong">
            <th className="py-2 pr-4 text-label font-medium uppercase text-ink-muted">
              Pasangan
            </th>
            <th className="hidden py-2 pr-4 text-label font-medium uppercase text-ink-muted sm:table-cell">
              Peran
            </th>
            <th className="py-2 pr-4 text-right text-label font-medium uppercase text-ink-muted">
              Terang
            </th>
            <th className="py-2 pr-4 text-right text-label font-medium uppercase text-ink-muted">
              Gelap
            </th>
            <th className="py-2 text-right text-label font-medium uppercase text-ink-muted">
              Target
            </th>
          </tr>
        </thead>
        <tbody>
          {CONTRAST.map((row) => (
            <tr key={row.pair} className="border-b border-line">
              <td className="py-2.5 pr-4 font-mono text-body-sm">{row.pair}</td>
              <td className="hidden py-2.5 pr-4 text-body-sm text-ink-secondary sm:table-cell">
                {row.role}
              </td>
              <td className="numeric py-2.5 pr-4 text-right text-body-sm">
                {row.light}:1
              </td>
              <td className="numeric py-2.5 pr-4 text-right text-body-sm">
                {row.dark}:1
              </td>
              <td className="numeric py-2.5 text-right text-body-sm text-ink-secondary">
                {row.target}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function TokensPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  /* `?mode=dark|light` pins the whole page so each mode can be captured as a
     screenshot instead of being claimed. */
  const requested = (await searchParams).mode;
  const pinnedMode =
    requested === "dark" || requested === "light" ? requested : undefined;

  return (
    <div data-theme={pinnedMode} className="min-h-full bg-canvas text-ink">
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 lg:px-10">
        <nav className="flex gap-4 text-body-sm text-ink-secondary">
          <Link href="/design/type" className="underline underline-offset-4">
            Type specimen
          </Link>
          <span aria-hidden="true">·</span>
          <span className="text-ink">Token &amp; status</span>
        </nav>

        <header className="mt-8">
          <p className="text-label font-medium uppercase text-ink-muted">
            P3 · Token &amp; Status
          </p>
          <h1 className="mt-3 text-display font-semibold md:text-display-lg">
            Hitam, putih, dan garis.
          </h1>
          <p className="mt-4 max-w-xl text-body text-ink-secondary">
            Kanvas, tinta, dan satu skala abu dari opasitas. Tidak ada warna yang
            membawa makna, sehingga tidak ada informasi yang hilang bagi
            pengguna buta warna. Setiap angka kontras di halaman ini dihasilkan
            oleh <span className="font-mono text-body-sm">scripts/contrast.mjs</span>,
            bukan diklaim.
          </p>
        </header>

        <div className="mt-12 space-y-12">
          <Section code="01" title="Ramp monokrom: terang dan gelap">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line-strong">
                    <th className="py-2 pr-4 text-label font-medium uppercase text-ink-muted">
                      Token
                    </th>
                    <th className="py-2 pr-4 text-label font-medium uppercase text-ink-muted">
                      Terang
                    </th>
                    <th className="py-2 pr-4 text-label font-medium uppercase text-ink-muted">
                      Gelap
                    </th>
                    <th className="hidden py-2 text-label font-medium uppercase text-ink-muted sm:table-cell">
                      Peran
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PALETTE.map((row) => (
                    <tr key={row.token} className="border-b border-line">
                      <td className="py-2 pr-4 font-mono text-body-sm">
                        {row.token}
                      </td>
                      <td className="py-2 pr-4">
                        <div data-theme="light" className="inline-block">
                          <div
                            className={`h-8 w-14 rounded-sm border border-line ${SWATCH[row.token]}`}
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <div data-theme="dark" className="inline-block">
                          <div
                            className={`h-8 w-14 rounded-sm border border-line ${SWATCH[row.token]}`}
                          />
                        </div>
                      </td>
                      <td className="hidden py-2 text-body-sm text-ink-secondary sm:table-cell">
                        {row.role}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-body-sm text-ink-muted">
              Swatch di atas dirender dari token itu sendiri di dalam panel
              bertema: tidak ada nilai warna yang ditulis di halaman ini.
            </p>
          </Section>

          <Section code="02" title="Kontras terukur">
            <ContrastTable />
            <p className="mt-4 max-w-2xl text-body-sm text-ink-secondary">
              <span className="font-medium text-ink">Batas yang saya ambil:</span>{" "}
              <span className="font-mono">ink-muted</span> terukur 4,83:1 — di atas
              batas teks sekunder WCAG AA (4,5:1), tetapi di bawah target body
              7:1. Karena itu token ini hanya untuk placeholder yang punya label
              persisten, dan caption yang tidak memikul informasi tunggal. Semua
              teks informatif memakai <span className="font-mono">ink</span> atau{" "}
              <span className="font-mono">ink-secondary</span>.
            </p>
          </Section>

          <Section code="03" title="Status tanpa warna: enam nada, tiga lapis">
            <ul className="border-t border-line">
              {BADGE_TONES.map((tone) => {
                const spec = badgeSpec(tone);
                return (
                  <li
                    key={tone}
                    className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line py-3"
                  >
                    <Badge tone={tone} />
                    <span className="font-mono text-body-sm text-ink-muted">
                      {spec.icon}
                    </span>
                    <span className="text-body-sm text-ink-secondary">
                      {spec.weight === "font-semibold" ? "600" : "500"} · garis{" "}
                      {spec.line.includes("dashed")
                        ? "putus-putus"
                        : spec.line.includes("transparent")
                          ? "tanpa garis"
                          : "solid"}{" "}
                      · isian{" "}
                      {spec.fill.includes("bg-ink") ? "hitam penuh" : "putih"}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <ModePanel mode="light">
                <p className="text-label font-medium uppercase text-ink-muted">
                  Satu badge per baris
                </p>
                <ul className="mt-2 border-t border-line">
                  {STATUS_ROW.map((row) => (
                    <li
                      key={row.word}
                      className="flex items-center justify-between gap-3 border-b border-line py-2"
                    >
                      <span className="text-body-sm">{row.word}</span>
                      <Badge tone={row.tone} />
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-body-sm text-ink-muted">
                  Status tetap terbaca saat diubah ke skala abu-abu: kata, bentuk
                  ikon, gaya garis, isian, dan berat ikut membedakan.
                </p>
              </ModePanel>

              <ModePanel mode="dark">
                <p className="text-label font-medium uppercase text-ink-muted">
                  Isian hitam dibalik di mode gelap
                </p>
                <ul className="mt-2 border-t border-line">
                  {BADGE_TONES.map((tone) => (
                    <li
                      key={tone}
                      className="flex items-center justify-between gap-3 border-b border-line py-2"
                    >
                      <span className="font-mono text-body-sm text-ink-secondary">
                        {tone}
                      </span>
                      <Badge tone={tone} />
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-body-sm text-ink-muted">
                  Nada “hitam penuh” menjadi putih penuh dengan teks hitam agar
                  tetap terminal secara visual, bukan inversi mekanis.
                </p>
              </ModePanel>
            </div>
          </Section>

          <Section code="04" title="Skala jarak 4pt">
            <ul className="border-t border-line">
              {SPACING.map((step) => (
                <li
                  key={step.value}
                  className="flex items-center gap-4 border-b border-line py-2"
                >
                  <span className="numeric w-10 shrink-0 text-right font-mono text-body-sm">
                    {step.value}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-3 shrink-0 bg-ink"
                    style={{ width: step.value }}
                  />
                  <span className="text-body-sm text-ink-secondary">
                    {step.use}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-body-sm text-ink-muted">
              Nilai 2 hanya untuk koreksi optik jarak label ke nilai. Di luar
              daftar ini tidak ada jarak yang sah.
            </p>
          </Section>

          <Section code="05" title="Radius, satu bayangan, satu cincin fokus">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {RADII.map((radius) => (
                <div key={radius.name}>
                  <div
                    className={`flex h-16 items-center justify-center border border-line-strong bg-sunken text-body-sm text-ink-secondary ${radius.className}`}
                  >
                    {radius.size}
                  </div>
                  <p className="mt-2 font-mono text-body-sm">{radius.name}</p>
                  <p className="text-body-sm text-ink-muted">{radius.use}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  Satu-satunya bayangan: sheet &amp; dialog
                </p>
                <div className="mt-2 rounded-lg border border-line bg-surface p-5 shadow-sheet">
                  <p className="text-h3 font-medium">Konfirmasi pembekuan</p>
                  <p className="mt-1 text-body-sm text-ink-secondary">
                    Blok di atas memakai <span className="font-mono">shadow-sheet</span>.
                    Tidak ada bayangan lain di produk; pemisahan blok memakai
                    garis.
                  </p>
                </div>
              </div>
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  Cincin fokus
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <button type="button" className="btn-primary">
                    Fokuskan aku
                  </button>
                  <a href="#token" className="btn-secondary">
                    Tautan
                  </a>
                </div>
                <p className="mt-3 text-body-sm text-ink-muted">
                  <span className="font-mono">2px</span> tinta dengan offset{" "}
                  <span className="font-mono">2px</span>, sama di kedua mode;
                  gunakan Tab untuk melihatnya.
                </p>
              </div>
            </div>

            <p className="mt-6 text-body-sm text-ink-secondary">
              Radius bawaan Tailwind dicabut di{" "}
              <span className="font-mono">@theme</span>; hanya empat nilai ini
              yang dapat dikompilasi. Bayangan bawaan juga dicabut, menyisakan{" "}
              <span className="font-mono">shadow-sheet</span>.
            </p>
          </Section>

          <Section code="06" title="Mode gelap bukan inversi">
            <ModePanel mode="dark">
              <dl className="grid gap-4 sm:grid-cols-3">
                {[
                  ["369.000", "Tersedia"],
                  ["181.000", "Terpakai"],
                  ["188.000", "Sisa"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="text-label font-medium uppercase text-ink-muted">
                      {label}
                    </dt>
                    <dd className="numeric mt-1 text-num-lg font-semibold">
                      Rp{value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 border-t border-line pt-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-body-sm text-ink-secondary">
                    Apotek Sehat Sentosa
                  </p>
                  <p className="numeric text-body-sm">Rp50.000</p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-body-sm text-ink-secondary">
                    Alasan penolakan terakhir
                  </p>
                  <Badge tone="rejected" />
                </div>
              </div>
              <p className="mt-4 text-body-sm text-ink-muted">
                Permukaan dibedakan garis 1px, bukan latar abu besar. Tangkapan
                mode gelap ada di{" "}
                <span className="font-mono">docs/design/screens/</span>.
              </p>
            </ModePanel>
            <p className="mt-4 max-w-2xl text-body-sm text-ink-secondary">
              Token dipetakan sekali untuk terang dan sekali untuk gelap, lalu{" "}
              <span className="font-mono">data-theme</span> memilih peta pada
              subtree mana pun — tidak ada utilitas{" "}
              <span className="font-mono">dark:</span> yang bisa lupa dipasang.
              Panel di atas memakai atribut{" "}
              <span className="font-mono">data-theme=&quot;dark&quot;</span> pada
              elemen biasa — bukti bahwa override bekerja per subtree.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
