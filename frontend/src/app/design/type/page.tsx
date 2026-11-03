"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const rows: Array<{
  label: string;
  mobile: string;
  desktop: string;
  mono: boolean;
  note: string;
}> = [
  {
    label: "display",
    mobile: "34 / 1.08 · −0.032em · 600",
    desktop: "40 / 1.08 · −0.032em · 600",
    mono: false,
    note: "Satu elemen per layar saja.",
  },
  {
    label: "h1",
    mobile: "26 / 1.15 · −0.026em · 600",
    desktop: "32 / 1.15 · −0.026em · 600",
    mono: false,
    note: "Judul layar.",
  },
  {
    label: "h2",
    mobile: "20 / 1.25 · −0.018em · 500",
    desktop: "23 / 1.25 · −0.018em · 500",
    mono: false,
    note: "Judul bagian.",
  },
  {
    label: "h3",
    mobile: "17 / 1.35 · −0.012em · 500",
    desktop: "18 / 1.35 · −0.012em · 500",
    mono: false,
    note: "Judul item, nama merchant.",
  },
  {
    label: "body",
    mobile: "16 / 1.55 · 0 · 400",
    desktop: "16 / 1.55 · 0 · 400",
    mono: false,
    note: "Teks utama.",
  },
  {
    label: "body-sm",
    mobile: "14 / 1.50 · 0 · 400",
    desktop: "14 / 1.50 · 0 · 400",
    mono: false,
    note: "Metadata, keterangan.",
  },
  {
    label: "label",
    mobile: "11 / 1.40 · +0.080em · 500",
    desktop: "11 / 1.40 · +0.080em · 500",
    mono: false,
    note: "Kapital, label field.",
  },
  {
    label: "num-lg",
    mobile: "32 / 1.05 · −0.030em · 600",
    desktop: "40 / 1.05 · −0.030em · 600",
    mono: true,
    note: "Nominal utama.",
  },
  {
    label: "num-md",
    mobile: "18 / 1.20 · −0.010em · 500",
    desktop: "20 / 1.20 · −0.010em · 500",
    mono: true,
    note: "Nominal kartu.",
  },
  {
    label: "num-sm",
    mobile: "14 / 1.40 · 0 · 400",
    desktop: "14 / 1.40 · 0 · 400",
    mono: true,
    note: "Tabel, mono, tabular.",
  },
];

function SpecRow({ label, mobile, desktop, mono, note }: (typeof rows)[0]) {
  return (
    <section aria-label={label} className="border-b border-line pb-10 pt-8">
      <h2 className="text-h2">{label}</h2>
      <div className="mt-3 flex items-baseline gap-3 text-[11px] text-ink-secondary">
        <span>{mobile}</span>
        <span className="text-[10px] text-ink-muted">/</span>
        <span>{desktop}</span>
      </div>
      <p
        className="mt-3 font-mono"
        style={{
           fontFamily: mono ? "var(--font-geist-mono)" : "var(--font-geist-sans)",
          fontSize: 18,
          lineHeight: 1.4,
        }}
      >
        #P2 {label === "num-lg" ? "Rp999.999.999" : label === "num-md" ? "Rp1.250.000" : label === "num-sm" ? "0123456789" : label === "display" ? "AmanahLink" : label === "h1" ? "Donasi Kampanye Kesehatan Ibu Sari" : label === "h2" ? "Bantuan Medis Ibu Sari" : label === "h3" ? "Apotek & toko obat" : label === "body" ? "Setiap pencairan hanya boleh ke merchant terverifikasi dengan kategori transaksi yang disetujui kampanye." : label === "body-sm" ? "MCC 5912 — Apotek & toko obat" : label === "label" ? "STATUS: MENUNGGU VERIFIKASI" : "AmanahLink"}
      </p>
      <p className="mt-2 text-xs text-ink-secondary">{note}</p>
    </section>
  );
}

function SampleTable() {
  const columns = ["Ukuran", "Geist Sans", "Geist Mono", "Catatan"];
  const samples: Array<[string, string, boolean, string]> = [
    ["display", "AmanahLink", false, "satukan tiap layar"],
    ["h1", "Donasi Kampanye Kesehatan Ibu Sari", false, "judul layar"],
    ["h2", "Bantuan Medis Ibu Sari", false, "judul bagian"],
    ["h3", "Apotek & toko obat", false, "nama merchant"],
    ["body", "Setiap pencairan hanya boleh ke merchant terverifikasi.", false, "teks utama"],
    ["body-sm", "MCC 5912 — Apotek & toko obat", false, "metadata"],
    ["label", "STATUS: MENUNGGU VERIFIKASI", false, "kapital"],
    ["num-lg", "Rp999.999.999", true, "nominal utama"],
    ["num-md", "Rp1.250.000", true, "nominal kartu"],
    ["num-sm", "0123456789", true, "tabel, mono"],
  ];

  return (
    <section aria-label="Tabel perbandingan Geist Sans dan Geist Mono" className="border-b border-line pb-10 pt-8">
      <h2 className="text-h2">Pasangan Geist Sans + Geist Mono</h2>
      <div className="mt-4 w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((h) => (
                <th key={h} className="border-b border-line font-label text-label text-ink">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {samples.map(([role, sans, mono, catatan]) => (
              <tr key={role} className="border-b border-line last:border-b-0">
                <td className="font-label text-label text-ink-secondary">{role}</td>
                <td className="font-sans">{sans}</td>
                <td className="font-mono">{String(mono)}</td>
                {catatan ? <td className="text-xs text-ink-secondary">{catatan}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function TypeSpecimen() {
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-3xl space-y-10">
      <section className="border-b border-line pb-10 pt-8">
        <h1 className="text-display">Geist Sans + Geist Mono</h1>
        <p className="mt-4 text-body leading-relaxed text-ink-secondary">
          Specimen skala tipografi AmanahLink. Geist Sans untuk tubuh dan antarmuka,
          Geist Mono untuk angka, ID, dan kode referensi. Tracking negatif dipakai
          pada ukuran besar agar tidak terlihat longgar. Angka pakai tabular numerals.
        </p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Rincian skala
          </button>
        </div>
        {open ? (
          <div className="mt-4 space-y-4 text-sm text-ink-secondary">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center gap-4">
                <span className="text-label w-16 shrink-0">{r.label}</span>
                <span className="font-mono">{r.mobile}</span>
                <span className="text-ink-muted">/</span>
                <span className="font-mono">{r.desktop}</span>
                <span className="text-ink-muted">{r.note}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {rows.map((r) => (
        <SpecRow key={r.label} {...r} />
      ))}

      <SampleTable />
    </div>
  );
}
