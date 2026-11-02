import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Type Specimen — AmanahLink",
  robots: { index: false, follow: false },
};

const SCALE = [
  {
    token: "display",
    mobile: "34 / 40",
    line: "1.08",
    tracking: "−0.032em",
    weight: "600",
    usage: "Satu elemen per layar",
    sample: "Dana terkunci untuk tujuan",
    className: "text-display md:text-display-lg font-semibold",
  },
  {
    token: "h1",
    mobile: "26 / 32",
    line: "1.15",
    tracking: "−0.026em",
    weight: "600",
    usage: "Judul layar",
    sample: "Bantu Biaya Operasi Ibu Sari",
    className: "text-h1 md:text-h1-lg font-semibold",
  },
  {
    token: "h2",
    mobile: "20 / 23",
    line: "1.25",
    tracking: "−0.018em",
    weight: "500",
    usage: "Judul bagian",
    sample: "Pemakaian dana",
    className: "text-h2 md:text-h2-lg font-medium",
  },
  {
    token: "h3",
    mobile: "17 / 18",
    line: "1.35",
    tracking: "−0.012em",
    weight: "500",
    usage: "Nama merchant, judul item",
    sample: "Apotek Sehat Sentosa",
    className: "text-h3 md:text-h3-lg font-medium",
  },
  {
    token: "body",
    mobile: "16 / 16",
    line: "1.55",
    tracking: "0",
    weight: "400",
    usage: "Teks utama",
    sample:
      "Dana hanya dapat dipakai di merchant terverifikasi dengan kategori yang disetujui kampanye.",
    className: "text-body font-normal",
  },
  {
    token: "body-sm",
    mobile: "14 / 14",
    line: "1.50",
    tracking: "0",
    weight: "400",
    usage: "Metadata, keterangan",
    sample: "Diperbarui 24 Mei 2026 · 18 hari lagi",
    className: "text-body-sm font-normal",
  },
  {
    token: "label",
    mobile: "11 / 11",
    line: "1.40",
    tracking: "+0.080em",
    weight: "500",
    usage: "Label kapital, nama field",
    sample: "KATEGORI YANG DIIZINKAN",
    className: "text-label font-medium uppercase",
  },
] as const;

const AMOUNTS = ["0.00", "98000.00", "999999999.00", "1250000.00"];

const LONG_NAME =
  "Apotek Sehat Sentosa Jaya Abadi Cabang Kebayoran Lama Jakarta";

const LEDGER = [
  { date: "2026-11-03", title: "Dana donasi diterima", amount: "98000.00" },
  { date: "2026-11-03", title: "Pemakaian dana — Apotek", amount: "50000.00" },
  { date: "2026-11-04", title: "Pengembalian dana sisa", amount: "48000.00" },
  { date: "2026-11-04", title: "Biaya platform (2%)", amount: "2000.00" },
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

export default function TypeSpecimenPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 lg:px-10">
        <header>
          <p className="text-label font-medium uppercase text-ink-muted">
            P2 · Type Specimen
          </p>
          <h1 className="mt-3 text-display font-semibold md:text-display-lg">
            Kertas, tinta, dan huruf.
          </h1>
          <p className="mt-4 max-w-xl text-body text-ink-secondary">
            Seluruh hierarki dibangun dari tiga alat: ukuran huruf, berat huruf,
            dan jarak. Halaman ini menjadi rujukan sebelum token dan komponen
            dikunci, dan tidak memakai warna sebagai pembawa makna.
          </p>
          <dl className="mt-8 grid gap-x-6 gap-y-3 border-t border-line pt-5 text-body-sm sm:grid-cols-3">
            <div>
              <dt className="text-label font-medium uppercase text-ink-muted">
                UI &amp; body
              </dt>
              <dd className="mt-1 font-medium">Geist Sans</dd>
            </div>
            <div>
              <dt className="text-label font-medium uppercase text-ink-muted">
                Angka &amp; kode
              </dt>
              <dd className="mt-1 font-mono">Geist Mono</dd>
            </div>
            <div>
              <dt className="text-label font-medium uppercase text-ink-muted">
                Acuan lebar
              </dt>
              <dd className="mt-1">390 dulu · 360 minimum · uji 320</dd>
            </div>
          </dl>
        </header>

        <div className="mt-12 space-y-12">
          <Section code="01" title="Dua keluarga, satu kewenangan">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  Geist Sans · 400 / 500 / 600
                </p>
                <p className="mt-3 text-num-lg font-semibold">Aa</p>
                <p className="mt-3 text-body text-ink-secondary">
                  Dana donasi tidak dicairkan menjadi uang tunai. Setiap rupiah
                  tercatat di catatan mutasi dan dapat dicocokkan kembali dengan
                  nota.
                </p>
                <p className="mt-3 text-body-sm text-ink-muted">
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ
                  <br />
                  abcdefghijklmnopqrstuvwxyz
                </p>
              </div>
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  Geist Mono · angka &amp; rujukan
                </p>
                <p className="numeric mt-3 text-num-lg font-semibold">0123</p>
                <p className="numeric mt-3 text-body text-ink-secondary">
                  PAY-DEMO-0001 · TRX-2026-0007
                </p>
                <p className="numeric mt-3 text-body-sm text-ink-muted">
                  0123456789 · Rp1.250.000
                </p>
              </div>
            </div>
          </Section>

          <Section code="02" title="Skala lengkap dalam bahasa Indonesia">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line-strong">
                    <th className="py-2 pr-4 text-label font-medium uppercase text-ink-muted">
                      Token
                    </th>
                    <th className="py-2 pr-4 text-label font-medium uppercase text-ink-muted">
                      Mobile / Desktop
                    </th>
                    <th className="py-2 pr-4 text-label font-medium uppercase text-ink-muted">
                      LH
                    </th>
                    <th className="hidden py-2 pr-4 text-label font-medium uppercase text-ink-muted sm:table-cell">
                      Tracking
                    </th>
                    <th className="hidden py-2 text-label font-medium uppercase text-ink-muted sm:table-cell">
                      Berat
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SCALE.map((step) => (
                    <tr key={step.token} className="border-b border-line">
                      <td className="py-3 pr-4 font-mono text-body-sm">
                        {step.token}
                      </td>
                      <td className="numeric py-3 pr-4 text-body-sm">
                        {step.mobile}
                      </td>
                      <td className="numeric py-3 pr-4 text-body-sm">
                        {step.line}
                      </td>
                      <td className="numeric hidden py-3 pr-4 text-body-sm sm:table-cell">
                        {step.tracking}
                      </td>
                      <td className="numeric hidden py-3 text-body-sm sm:table-cell">
                        {step.weight}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-8 space-y-7">
              {SCALE.map((step) => (
                <li key={step.token}>
                  <p className="text-label font-medium uppercase text-ink-muted">
                    {step.token} · {step.usage}
                  </p>
                  <p className={`mt-1 ${step.className}`}>{step.sample}</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section code="03" title="Angka: tabular dipakai, proporsional tidak">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  Tabular · dipakai di produk
                </p>
                <div className="mt-3 border-y border-line">
                  {AMOUNTS.map((amount) => (
                    <p
                      key={amount}
                      className="numeric border-b border-line py-2 text-num-md last:border-b-0"
                    >
                      {amount}
                    </p>
                  ))}
                </div>
                <p className="mt-2 text-body-sm text-ink-muted">
                  Lebar digit tetap: kolom nominal tidak bergoyang saat nilai
                  berubah.
                </p>
              </div>
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  Proporsional · tidak dipakai
                </p>
                <div className="mt-3 border-y border-line">
                  {AMOUNTS.map((amount) => (
                    <p
                      key={amount}
                      className="border-b border-line py-2 text-num-md last:border-b-0"
                    >
                      {amount}
                    </p>
                  ))}
                </div>
                <p className="mt-2 text-body-sm text-ink-muted">
                  Lebar digit berubah; angka “1” lebih sempit dari “9”. Terlihat
                  tidak rata pada daftar transaksi.
                </p>
              </div>
            </div>
          </Section>

          <Section code="04" title="Tanda baca &amp; format uang">
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ["Rp1.250.000", "Rupiah tanpa spasi setelah Rp, tanpa desimal"],
                ["−Rp50.000", "Minus U+2212, bukan hyphen"],
                ["-Rp50.000", "Salah: hyphenasi ASCII"],
                ["62,4%", "Koma desimal, persen menempel"],
                ["24 Mei 2026", "Tanggal ditulis penuh"],
                ["18 hari lagi", "Sisa waktu dalam kata"],
                ["100000.00", "Hanya di API, tidak di UI"],
              ].map(([value, note]) => (
                <div
                  key={value}
                  className="flex items-baseline justify-between gap-4 border-b border-line pb-3"
                >
                  <dd className="numeric text-body">{value}</dd>
                  <dt className="max-w-[16rem] text-right text-body-sm text-ink-muted">
                    {note}
                  </dt>
                </div>
              ))}
            </dl>
          </Section>

          <Section code="05" title="Data ekstrem">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  Nama panjang · {LONG_NAME.length} karakter
                </p>
                <p className="mt-2 text-h3 font-medium">{LONG_NAME}</p>
                <p className="mt-4 text-label font-medium uppercase text-ink-muted">
                  Dua baris lalu elipsis (tabel)
                </p>
                <p className="mt-2 line-clamp-2 max-w-[16rem] text-h3 font-medium">
                  {LONG_NAME}
                </p>
              </div>
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  Nominal tertinggi
                </p>
                <p className="numeric mt-2 text-num-lg font-semibold md:text-num-lg-md">
                  Rp999.999.999
                </p>
                <p className="text-label mt-4 font-medium uppercase text-ink-muted">
                  Nol dan kosong
                </p>
                <p className="numeric mt-2 text-num-lg font-semibold">Rp0</p>
                <p className="mt-2 text-body-sm text-ink-muted">
                  Nol ditulis “Rp0”, bukan “Rp0,00” atau “—”.
                </p>
              </div>
            </div>
          </Section>

          <Section code="06" title="Tracking: display dan h1">
            <div className="space-y-6">
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  display −0.032em (benar)
                </p>
                <p className="mt-1 text-display font-semibold md:text-display-lg">
                  Dana terkunci
                </p>
              </div>
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  display tracking-normal (salah)
                </p>
                <p className="mt-1 text-display font-semibold tracking-normal md:text-display-lg">
                  Dana terkunci
                </p>
              </div>
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  h1 −0.026em (benar)
                </p>
                <p className="mt-1 text-h1 font-semibold md:text-h1-lg">
                  Bantu Biaya Operasi Ibu Sari
                </p>
              </div>
              <div>
                <p className="text-label font-medium uppercase text-ink-muted">
                  h1 tracking-normal (salah)
                </p>
                <p className="mt-1 text-h1 font-semibold tracking-normal md:text-h1-lg">
                  Bantu Biaya Operasi Ibu Sari
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-xl text-body-sm text-ink-secondary">
              Pada 34px ke atas, teks tanpa tracking negatif terasa longgar dan
              kehilangan ketegangan. Selisihnya kecil di tangkapan mata, tetapi
              terlihat jelas saat dua baris ditumpuk.
            </p>
          </Section>

          <Section code="07" title="Sans dan Mono dalam satu baris tabel">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line-strong">
                  <th className="py-2 pr-4 text-label font-medium uppercase text-ink-muted">
                    Tanggal
                  </th>
                  <th className="py-2 pr-4 text-label font-medium uppercase text-ink-muted">
                    Keterangan
                  </th>
                  <th className="py-2 text-right text-label font-medium uppercase text-ink-muted">
                    Nominal
                  </th>
                </tr>
              </thead>
              <tbody>
                {LEDGER.map((row) => (
                  <tr key={row.date + row.title} className="border-b border-line">
                    <td className="numeric py-3 pr-4 font-mono text-body-sm text-ink-secondary">
                      {row.date}
                    </td>
                    <td className="py-3 pr-4 text-body">{row.title}</td>
                    <td className="numeric py-3 text-right font-mono text-body-sm">
                      {row.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section code="08" title="Aturan yang diuji halaman ini">
            <ul className="space-y-2 text-body">
              {[
                "Tidak ada teks di bawah 11px.",
                "Body tetap 16px, termasuk pada 360.",
                "Maksimal tiga ukuran huruf di luar blok angka.",
                "Satu titik berat per layar: display dan num-lg tidak bersamaan.",
                "Tidak ada hex mentah di komponen; semua nilai dari token @theme.",
                "Nol gradient, nol blur, nol bayangan.",
              ].map((rule) => (
                <li key={rule} className="flex gap-3 border-b border-line pb-2">
                  <span className="font-mono text-body-sm text-ink-muted">—</span>
                  <span className="text-ink-secondary">{rule}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-body-sm text-ink-muted">
              Catatan migrasi: font serif lama masih dipakai halaman lain sampai
              P5. Halaman ini adalah rujukan, bukan pengganti layar produk.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
