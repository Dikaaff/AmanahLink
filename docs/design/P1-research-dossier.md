# P1 — RESEARCH DOSSIER

**Produk:** AmanahLink · **Arah:** PAPER & INK · **Versi:** 1.0 · **Tanggal:** 2026-11-03
**Status:** P1 selesai, menunggu GATE 1.
**Bukti visual:** `docs/design/screens/` (21 berkas, 3 breakpoint untuk 4 produk; 390 untuk 3 produk lokal).

---

## 0. Metode & batas bukti

1. **Tangkapan layar sendiri.** Chrome headless (`--headless=new`, `--window-size`, `--virtual-time-budget=8000`) pada 390×844, 768×1024, 1440×900. Perintah persis ada di `scripts/e2e-manual.sh`? Tidak — reproduksi:
   `"chrome" --headless=new --window-size=390,844 --virtual-time-budget=8000 --screenshot=out.png <url>`.
2. **Halaman publik saja.** Saya tidak punya akun berbayar, jadi yang diamati adalah landing/pemasaran, bukan dashboard setelah login. Klaim tentang tabel padat (Linear issue list, Bloomberg) karena itu bersumber dari dokumentasi/publikasi, bukan tangkapan layar saya, dan ditandai demikian.
3. **Blokir bot diakui, bukan ditambal.** `kitabisa.com`, `bibit.id`, `ajaib.co.id`, `stockbit.com` mengembalikan challenge Cloudflare (403). Tangkapannya ada di `docs/design/screens/` sebagai bukti kegagalan; **tidak ada klaim pola UI** dari keempatnya. Referensi lokal hanya dari GoPay, OVO, BenihBaik yang berhasil.
4. **Referensi historis** dibaca dari sumber cetak/publikasi (URL di §1), karena memang bukan aplikasi.

Konsekuensi jujur: dossier ini kuat untuk pola tipografi/grid/permukaan, dan **lebih lemah** untuk pola operasional dashboard admin lokal. Bagian itu akan ditutup pada P2–P3 dengan specimen sendiri, bukan dengan asumsi.

---

## 1. Teardown — 10 produk

### Kelompok A — monokrom/editorial

| Produk | Layar & sumber | Pola yang diamati (bukti) | Ambil | Tolak |
|---|---|---|---|---|
| Linear | `https://linear.app` — 390/768/1440 (`linear-*.png`) | Kanvas hampir hitam, tinta putih, satu CTA di kanan atas; judul 56–64px dengan tracking rapat; produk ditampilkan sebagai jendela dengan garis rambut 1px, tanpa bayangan; abu-abu hanya untuk metadata | Kontras skala judul:body yang ekstrem; garis rambut sebagai pemisah; disiplin satu aksi primer | Kanvas gelap penuh untuk layar data (silau di luar ruangan, §3.5); hero berisi mockup produk |
| Vercel | `https://vercel.com` — 390/768/1440 (`vercel-*.png`) | Hero geometris besar, H1 di tengah, dua tombol: isian putih (primer) + outline (sekunder); strip logo klien | Hierarki primer isian vs sekunder outline; angka/heading sebagai satu-satunya titik berat | Glow/gradient dekoratif (R06); hero rata tengah untuk layar transaksional |
| Stripe | `https://stripe.com/payments` — 390/768/1440 (`stripe-*.png`) | Kanvas putih, garis putus-putus sebagai pemisah seksi, tab horizontal di bawah wordmark, chip "Sessions 2026" sebagai label kecil, heading 40px+ | Garis putus-putus untuk pemisah non-final; baris tab sebagai navigasi seksi; label kecil di atas nilai | Warna merek sebagai pembawa makna (R07); tab yang terpotong di 390; banner cookie menutupi CTA |
| Wise | `https://wise.com` — 390/768/1440 (`wise-*.png`) | Headline kapital sangat besar yang terpotong di 390, satu CTA pil, satu baris mikrokowi, ilustrasi koin | Proporsi headline vs satu kalimat penjelas; keputusan CTA tunggal | Headline overflow di 390; ilustrasi; warna hijau sebagai identitas |

### Kelompok B — konteks lokal (yang berhasil ditangkap)

| Produk | Layar & sumber | Pola yang diamati | Ambil | Tolak |
|---|---|---|---|---|
| GoPay | `https://gopay.co.id` — 390 (`gopay-390.png`) | Blok biru besar, satu kalimat nilai ("Baru! Aplikasi GoPay"), satu aksi unduh, tangkapan aplikasi; panel cookie setinggi ±40% layar di bawah | Kalimat nilai tunggal sebelum aksi; panel bawah untuk keputusan sekunder | Identitas berbasis warna; panel cookie yang menutupi konten (harus bisa ditutup & tidak menutupi CTA) |
| OVO | `https://www.ovo.id` — 390 (`ovo-390.png`) | Header ungu, heading rata tengah 2 baris, badge App Store/Play Store, empat ikon cincin dekoratif | Badge toko aplikasi sebagai pola rujukan; urutan judul→bukti | Heading rata tengah untuk kalimat panjang; ikon cincin dekoratif (C1: 0 ornamen) |
| BenihBaik | `https://www.benihbaik.com` — 390 (`benihbaik-390.png`) | Kanvas putih, logo di atas, judul 2 baris dengan satu baris ditekankan warna, carousel, CTA oranye penuh lebar menempel bawah | CTA primer di zona jempol (bawah); judul dua baris dengan satu gagasan per baris | Aksen warna sebagai penekanan; carousel (autoplay dilarang R10/§16) |

**Kegagalan tangkapan (bukti, bukan tafsir):** Kitabisa, Bibit, Ajaib, Stockbit → challenge/403 Cloudflare. Tidak dipakai sebagai dasar pola.

### Kelompok C — rujukan historis (bukan aplikasi)

| Rujukan | Sumber | Pola yang diamati | Ambil | Tolak |
|---|---|---|---|---|
| Josef Müller-Brockmann / International Typographic Style | `https://ilovetypography.com/2013/01/12/a-firm-turn-toward-the-objective-josef-muller-brockmann-1948-1981/`, `https://openlab.citytech.cuny.edu/langecomd3504fa2019/files/2018/10/MullerBrockmann_Grid_Des-Phil.pdf` | Grid sebagai "sistem keteraturan yang membuat pesan lebih mudah dipahami"; komunikasi objektif lewat konstruksi sistematis; sans-serif, perataan kiri, tanpa ornamen | Satu tepi kiri; kolom tetap; makna lewat urutan dan ukuran | Ruang kosong tingkat poster pada layar data (mengorbankan efisiensi) |
| Dieter Rams / Vitsœ — ten principles | `https://www.vitsoe.com/us/about/good-design` | "As little design as possible", jujur, mudah dipahami, tahan lama; fungsi sebelum dekorasi | Hapus ornamen; status harus terbaca tanpa penjelasan; satu bahasa visual untuk seluruh produk | "Less" sampai affordance hilang (tombol tanpa label, ikon tanpa teks) |
| Bloomberg Terminal | `https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/`, `https://spectrum.ieee.org/bloomberg-terminal` | Kepadatan ekstrem, kolom lebar tetap, angka tabular, keyboard-first, warna hanya untuk peringatan | Kolom nominal lebar tetap; tabular numerals; mode sangat padat untuk admin | Kode fungsi kriptik; kepadatan tanpa hierarki; warna sebagai satu-satunya alarm |

---

## 2. Pola → Prinsip (yang diambil wajib bisa diuji)

| Pola diamati | Prinsip turunan | Cara mengecek |
|---|---|---|
| Label kecil kapital di atas angka besar (Stripe, Linear) | Setiap nilai punya label 11px kapital +4px di atasnya; tidak ada angka telanjang | audit komponen `Stat`/tabel: 0 angka tanpa label |
| Garis rambut 1px sebagai pemisah (Linear, Stripe) | Tidak ada bayangan untuk memisah blok; hanya `line`/`line-strong` | `grep -r "shadow" src` → hanya sheet/dialog |
| Satu CTA isian, satu outline (Vercel) | Satu aksi primer per layar; sekunder outline/teks | hitung tombol primer per route |
| Headline besar + satu kalimat penjelas (Wise) | Rasio display:body ≥ 1.6×; satu titik berat | ukur `clamp`/token per layar |
| Kolom angka lebar tetap, tabular (Bloomberg) | Semua nominal `font-variant-numeric: tabular-nums`, rata kanan | screenshot saat nilai berubah 0→999.999.999 |
| Grid asimetris satu tepi kiri (Müller-Brockmann) | Semua blok duduk pada kolom; margin kiri tunggal | overlay 4/8/12 kolom |
| "As little design as possible" (Rams) | Setiap elemen dekoratif dihapus; elemen yang tersisa harus punya fungsi | C1: 0 elemen dekoratif per layar |
| CTA menempel bawah (BenihBaik) | Aksi utama di zona jempol; CTA lengket 52px + 12px di atas nav | ukur posisi pada 390×844 |
| Status berlapis kata+ikon (disimpulkan, bukan dari B/W) | Status tidak boleh bergantung warna (§5.2) | uji grayscale + buta warna simulasi |
| Abu-abu terbatas (Linear) | Maks 4 nilai teks: ink, ink-secondary, ink-muted, inverse | hitung nilai warna teks di CSS |

---

## 3. Pemetaan tugas (kriteria terukur)

| Tugas | Target | Konsekuensi desain yang dikunci |
|---|---|---|
| T1 Donatur menilai kelayakan kampanye | < 45 detik | L05: judul, progres, kategori, 3 bukti terakhir di atas lipatan; tanpa carousel |
| T2 Donasi selesai | ≤ 4 ketukan dari detail | L05 CTA → L06 nominal+ringkasan → L07 bayar → L08 sukses; preset nominal 1 ketuk |
| T3 Penggalang tahu sisa limit & kategori | tanpa pindah layar | L11/L16: limit, terpakai, sisa, masa berlaku, kategori valid dalam satu blok |
| T4 Alasan penolakan dipahami | < 10 detik | L17: kalimat [apa]+[kenapa]+[apa berikutnya] dalam 2 baris, di atas detail teknis |
| T5 Satu review verifikator | < 90 detik | L22/L23: keputusan di zona bawah, bukti (nota, nominal, merchant) sejajar |
| T6 Donatur memverifikasi pemakaian dana | < 30 detik | L10: urutan masuk → terkunci → terpakai, tiap baris dengan tautan nota |

---

## 4. Anggaran beban kognitif per layar

- Maks **3 ukuran huruf** di luar blok angka (body, label, h2/h3).
- Maks **2 berat huruf** (400/500/600) — satu di antaranya untuk angka.
- Maks **1 aksi primer**; maks **2 tombol bersebelahan**.
- Maks **3 blok informasi** per layar (C1); maks **7 elemen klik** di area pertama.
- Maks **1 badge status** per baris; tidak ada dua badge berdampingan.
- Kedalaman navigasi maks **2** (shell → detail), kecuali alur pembayaran 3 langkah linear.

---

## 5. Thumb zone & konteks nyata (390×844)

- Zona mudah: **y ≥ 506** (bawah 40%); sedang: 211–506; sulit: **y ≤ 211**.
- CTA lengket: tinggi 52, bottom 12 di atas nav 64 + `env(safe-area-inset-bottom)`.
- Target sentuh 44×44, jarak antar target ≥ 8.

| Persona & konteks | Konsekuensi |
|---|---|
| Donatur membuka sambil menonton TV, satu tangan, notifikasi mendesak | Aksi donasi di zona bawah; tidak ada hover-only; progres & kategori terbaca tanpa scroll |
| Penggalang memindai di depan kasir apotek, tangan sibuk, sinyal lemah, cahaya matahari | Kontras body ≥ 7:1 (uji silau), hasil pindai = satu kalimat keputusan + satu tombol; tanpa modal penuh; skeleton, bukan spinner |
| Verifikator 8 jam di laptop, sering pindah tab | Mode sangat padat; kolom tetap; keputusan review tanpa scroll horizontal; fokus keyboard terlihat |

---

## 6. Model mental & bahasa (istilah internal → UI)

| Internal | UI (Indonesia) | Catatan |
|---|---|---|
| campaign | kampanye | — |
| campaigner | penggalang dana | — |
| donor | donatur | — |
| disbursement | pemakaian dana | bukan "pencairan" di UI donatur; "pencairan" hanya untuk aksi penggalang |
| MCC 5912 | Apotek & toko obat | kode MCC hanya di lapisan detail |
| allowed_mcc_array | kategori yang diizinkan | — |
| disbursement limit | batas pemakaian | harian/bulanan |
| settled | dana diterima | — |
| escrow / restricted funds | rekening penampungan | — |
| ledger | catatan mutasi | — |
| reconciliation | pencocokan nota | — |
| receipt | nota | — |
| OCR confidence | keyakinan pembacaan | persen, tanpa istilah teknis |
| disputed | perlu ditinjau | bukan "dispute" |
| refund | pengembalian dana | — |
| frozen | dibekukan | alasan wajib terlihat |
| idempotency, HMAC, webhook, DLQ | tidak pernah muncul | hanya di log admin |
| verifier | verifikator | — |
| fee platform | biaya platform | satu angka, tanpa persen tersembunyi |

---

## 7. Audit UI lama (bukti dari `frontend/src/app/globals.css`, `components/ui.tsx`, `page.tsx`)

| Elemen lama | Masalah (heuristik Nielsen) | Keputusan baru |
|---|---|---|
| `body` `bg-sand-50` (#faf7f1) + `brand-*` hijau 7 tingkat | H4 konsistensi & R07: makna dibawa warna; latar hangat menyimpang dari tesis dokumen | Kanvas `#FFFFFF`, ink `#0A0A0A`, abu sebagai ramp |
| Font display serif Iowan/Palatino untuk h1–h3 | H4: dua bahasa tipografi tanpa hierarki fungsional | Satu keluarga UI (Geist Sans) + Mono untuk angka |
| `.card` = `rounded-2xl` + border + `shadow-[0_1px_2px]` | H8 minimalis: border+radius+bayangan sekaligus (anti-pattern §16) | Radius 10, garis 1px, 0 bayangan |
| `.btn` semua `rounded-full`, tiga varian berwarna | H5 pencegahan error: bobot primer/sekunder tidak jelas | Radius 6, primer isian hitam, sekunder outline, tinggi 44/48 |
| `.input` `shadow-sm` + `rounded-xl` | H8: bayangan pada kontrol | Radius 6, border `line-strong`, fokus ring 2px |
| `StatusBadge` 26 status, 8 kombinasi warna (amber/rose/sky/brand/stone) | H1 visibilitas status: warna sebagai satu-satunya pembeda; buta warna gagal | §5.2 badge kata + ikon + isian + garis |
| `STATUS_STYLES` memakai `ring` + `bg` + `text` berwarna | H4: dua status berbeda bisa tampak sama di grayscale | Uji grayscale wajib per badge |
| `campaign-card` `hover:shadow-md` | H8: bayangan sebagai umpan balik hover | Hover = garis ink 20%, tanpa bayangan |
| Home hero: dua `blur-3xl` + `bg-brand-500/30` | R06: gradient/blur dekoratif | Hero tipografis, satu CTA, tanpa ornamen |
| Nominal kampanye `text-brand-700` | H2: makna uang dibawa warna | Nominal = ink 600, tabular |
| Label field `.field-label` 14px non-kapital, campur dengan label kapital 11px di `Stat` | H4: dua gaya label | Satu gaya label: 11px kapital +4% |
| `EmptyState` & `ErrorState` (baru) memakai `card` + teks tengah | H8: teks tengah untuk keadaan kosong masih sah, tapi tanpa hierarki angka | Empty/Error: ikon 24 + satu kalimat + satu aksi |
| 14 route dengan `text-3xl`/`text-2xl` campur | C3: rasio judul:body tidak konsisten | Skala §6.2 tunggal, 1 display per layar |
| `Loading` spinner penuh area | H1: spinner menyembunyikan bentuk konten | Skeleton berbentuk konten |

Kesimpulan audit: masalah utamanya bukan "kurang modern", tetapi **warna dan bayangan dipakai untuk membawa makna**, serta **tidak ada skala tipografi tunggal**. Redesign harus mencabut keduanya, bukan mengecat ulang.

---

## 8. Benchmark anti-slop — 3 antarmuka hitam-putih yang tetap generik

| Contoh | Diagnosa | Konfirmasi/bantah |
|---|---|---|
| Template "dark SaaS hero" (hero hitam + segitiga/glow + 3 kartu fitur) | Semua elemen setara bobot; tidak ada keputusan hierarki; ornamen menggantikan makna | Terkonfirmasi: Vercel 390 memakai glow dekoratif; kita tolak di §4 |
| Portofolio "brutalist monochrome" (semua teks 16px, garis di mana-mana) | Tidak ada kontras skala; garis dekoratif, bukan struktur | Terkonfirmasi prinsipnya: tanpa skala, monokrom jadi abu-abu rata |
| Dashboard gelap "fintech" (5 nilai abu teks, kartu border+radius+shadow, label kapital di semua tempat) | Abu tak terkontrol; label kapital kehilangan makna karena dipakai untuk semua hal | Terkonfirmasi sebagian: Linear memakai abu terkendali; kita batasi 4 nilai teks |

Pola yang harus dibantah dengan bukti di produk kita: "monokrom = tidak accessible". Bantahan hanya sah bila angka kontras dan uji grayscale dilampirkan (P3, P9).

---

## 9. Konstitusi Desain — 5 prinsip yang bisa gagal

1. **Satu titik berat.** Setiap layar hanya boleh punya satu elemen `display`/`num-lg`; dua = gagal.
2. **Status terbaca tanpa warna.** Uji grayscale + simulasi buta warna: setiap status tetap terbaca dari kata + ikon + isian; gagal bila salah satu lapis hilang.
3. **Kontras terukur.** Body ≥ 7:1, teks sekunder ≥ 4.5:1, batas interaktif ≥ 3:1; angka ditulis di dokumen, bukan diklaim.
4. **Satu grid, satu tepi.** Semua blok duduk pada kolom 4/8/12; satu margin kiri; nilai jarak di luar skala §7.2 = gagal.
5. **Satu aksi primer.** Aksi sekunder tidak boleh setara bobot; dua tombol isian hitam pada satu layar = gagal.

Guardrail tambahan: 0 gradient/blur; 1 varian bayangan (sheet/dialog); radius hanya 6/10/14/full.

---

## 10. Indeks bukti visual

`docs/design/screens/`:

- `linear-390.png`, `linear-768.png`, `linear-1440.png`
- `vercel-390.png`, `vercel-768.png`, `vercel-1440.png`
- `stripe-390.png`, `stripe-768.png`, `stripe-1440.png`
- `wise-390.png`, `wise-768.png`, `wise-1440.png`
- `gopay-390.png`, `ovo-390.png`, `benihbaik-390.png`
- `kitabisa-390.png`, `kitabisa-768.png`, `kitabisa-1440.png` (challenge)
- `bibit-390.png`, `bibit-768.png`, `bibit-1440.png` (blokir)
- `ajaib-390.png`, `stockbit-390.png` (blokir/403)

---

## 11. Tutup GATE 1

- **Apa yang dibuat:** dossier riset 10 produk + tabel pola→prinsip + pemetaan T1–T6 + audit 14 baris UI lama + konstitusi 5 prinsip, dengan 21 tangkapan layar sendiri dan 6 URL sumber.
- **Apa yang diasumsikan:** (a) dashboard setelah login tidak dapat diamati dari publik, jadi pola tabel padat bersumber dari publikasi; (b) empat produk lokal memblokir bot sehingga tidak dipakai sebagai bukti; (c) cakupan mengikuti jawabanmu: 14 route yang ada dulu, layar baru menyusul; (d) shadcn/ui, Geist, Sonner, Lucide, Magic UI (maks 3) boleh ditambahkan.
- **Apa yang dibutuhkan darimu:** persetujuan GATE 1 (atau koreksi pada §9), lalu P2 Type Specimen. Saya berhenti di sini; tidak ada kode yang diubah pada fase ini.
