# P2 — TYPE SPECIMEN (Geist Sans + Geist Mono)

**Status:** selesai, menunggu GATE 2. **Tanggal:** 2026-11-03.
**Halaman:** `/design/type` (`frontend/src/app/design/type/page.tsx`, `noindex`).
**Tangkapan:** `docs/design/screens/p2-specimen-512.png`, `p2-specimen-1440.png`.

---

## 1. Keluarga huruf

| Peran | Keluarga | Cara memuat | Bukti |
|---|---|---|---|
| UI, body, display | **Geist Sans** | paket npm `geist@^1.9.0`, `next/font` self-host | `<html class="…_variable …_variable">`, 2 `@font-face` di CSS produksi |
| Angka, kode, rujukan | **Geist Mono** | paket yang sama | token `--font-mono` memakai `var(--font-geist-mono)` |
| Cadangan bila Geist gagal | Instrument Sans / Public Sans | belum dipasang | dicatat di `DESIGN_DECISIONS.md` |

Tidak ada Inter, Poppins, Montserrat, Space Grotesk, Roboto, atau system UI sebagai display. Serif lama (`Iowan Old Style`/Palatino) **dicabut pada P2**, bukan P5: specimen harus menilai huruf yang benar-benar akan dipakai.

## 2. Token tipografi (dari `@theme`)

| Token | Mobile px | Desktop px | LH | Tracking | Berat | Pakai |
|---|---|---|---|---|---|---|
| `display` / `display-lg` | 34 | 40 | 1.08 | −0.032em | 600 | satu elemen per layar |
| `h1` / `h1-lg` | 26 | 32 | 1.15 | −0.026em | 600 | judul layar |
| `h2` / `h2-lg` | 20 | 23 | 1.25 | −0.018em | 500 | judul bagian |
| `h3` / `h3-lg` | 17 | 18 | 1.35 | −0.012em | 500 | nama merchant, item |
| `body` | 16 | 16 | 1.55 | 0 | 400 | teks utama |
| `body-sm` | 14 | 14 | 1.50 | 0 | 400 | metadata |
| `label` | 11 | 11 | 1.40 | +0.080em | 500 | label kapital |
| `num-lg` / `num-lg-md` | 32 | 40 | 1.05 | −0.030em | 600 | nominal utama |
| `num-md` | 18 | 20 | 1.20 | −0.010em | 500 | nominal kartu |
| `num-sm` | 14 | 14 | 1.40 | 0 | 400 | tabel |

Bukti CSS terkompilasi (dari `/_next/static/chunks/*.css`):

```css
.text-display{font-size:var(--text-display);line-height:var(--tw-leading,var(--text-display--line-height));letter-spacing:var(--tw-tracking,var(--text-display--letter-spacing))}
.text-label{font-size:var(--text-label);line-height:var(--tw-leading,var(--text-label--line-height));letter-spacing:var(--tw-tracking,var(--text-label--letter-spacing))}
.text-h1{font-size:var(--text-h1);line-height:var(--tw-leading,var(--text-h1--line-height));letter-spacing:var(--tw-tracking,var(--text-h1--letter-spacing))}
```

Konsekuensi: tracking dan line-height tidak ditulis di komponen; hanya nama token.

## 3. Isi specimen dan hasilnya

1. **Dua keluarga, satu kewenangan** — Sans untuk kalimat, Mono untuk `PAY-DEMO-0001`, `TRX-2026-0007`, tanggal, dan nominal tabel.
2. **Skala lengkap dalam bahasa Indonesia** — tujuh baris skala dirender dengan kalimat nyata ("Bantu Biaya Operasi Ibu Sari", "Apotek Sehat Sentosa"), bukan lorem ipsum. Tabel menampilkan token, mobile/desktop, LH, tracking, berat; dua kolom terakhir disembunyikan di bawah `sm` agar tidak ada scroll horizontal.
3. **Angka tabular vs proporsional** — `.numeric` (`tabular-nums` + `font-feature-settings: "tnum" 1, "ss01" 1`) dipakai untuk produk; kolom proporsional ditampilkan berdampingan sebagai pembanding. Terlihat: "1" sempit dan angka tidak rata pada kolom proporsional.
4. **Tanda baca & format** — `Rp1.250.000` (tanpa spasi/desimal), `−Rp50.000` (U+2212) vs `-Rp50.000` (salah, hyphen), `62,4%`, `24 Mei 2026`, `18 hari lagi`, dan `100000.00` yang hanya boleh muncul di API.
5. **Data ekstrem** — nama 61 karakter (melebihi target 60) dirender penuh dan dalam varian dua baris + elipsis; nominal `Rp999.999.999` pada `num-lg`/`num-lg-md`; `Rp0` untuk nol (bukan `Rp0,00` atau `—`).
6. **Tracking close-up** — display dengan token vs `tracking-normal`, h1 dengan token vs `tracking-normal`, ditumpuk berurutan agar selisih terlihat, bukan diklaim.
7. **Sans + Mono dalam satu baris tabel** — tanggal mono, keterangan sans, nominal mono tabular, rata kanan.
8. **Aturan yang diuji halaman ini** — daftar enam aturan (≥11px, body 16, maks 3 ukuran di luar blok angka, satu titik berat, 0 hex di komponen, 0 gradient/blur/shadow).

## 4. Angka slop detector untuk halaman ini

| Cek | Hasil |
|---|---|
| Hex mentah di komponen specimen | **0** (`grep -c '#[0-9a-fA-F]\{3,6\}'` → 0) |
| Utilitas `shadow` di specimen | **0** |
| Kelas gradient di specimen | **0** (satu kemunculan kata "gradient" ada di daftar aturan, bukan kelas) |
| `@font-face` dimuat | **2** (Sans + Mono) |
| Warna non-netral | **0** (hanya `canvas/ink/line/sunken/ink-secondary/ink-muted`) |
| Ukuran huruf di specimen | 10 jenis — **disengaja**, halaman ini adalah katalog skala; batas 3 ukuran berlaku pada layar produk (P5+) |

## 5. Batas bukti (jujur)

- **Chrome headless di mesin ini memaksa lebar layout minimum 512 CSS px.** Diukur lewat `data:` URL: `innerWidth=512 clientWidth=512` saat `--window-size=390`. Karena itu tangkapan “390” sebelumnya sebenarnya layout 512 yang dipotong menjadi PNG 390 — kemiripan teks terpotong bukan bug layout. Tangkapan sah yang tersedia: **512** dan **1440**. Bukti 390/360/320 menunggu driver browser (P9/Playwright), dan itu dicatat sebagai utang bukti, bukan klaim.
- **Mode gelap belum dirender** — token dark ditambahkan di P3, lalu ada tangkapan sendiri.
- **Chrome produk** (nav/footer) disembunyikan di route `/design/*` lewat `SiteChrome` agar specimen dinilai tanpa palet lama. Halaman produk akan memakai shell baru di P5.
- **Layout lama belum diubah**; font serif hilang global, tetapi komponen, warna brand, dan radius lama masih ada sampai P3–P5.

## 6. Tutup GATE 2

- **Apa yang dibuat:** halaman specimen `/design/type` dengan seluruh skala, dua keluarga huruf, bukti angka tabular/proporsional, tanda baca, data ekstrem, perbandingan tracking, dan pasangan Sans+Mono; ditambah token tipografi di `@theme` serta pensiunnya serif lama.
- **Apa yang diasumsikan:** 512 px adalah lebar terendah yang dapat dibuktikan dengan tool saat ini; warna netral parsial (canvas/ink/line) dipakai lebih awal karena specimen membutuhkan permukaan, sedangkan token status dan mode gelap menyusul di P3.
- **Apa yang dibutuhkan darimu:** persetujuan GATE 2 (atau koreksi pada nilai skala/tracking di §2) sebelum P3 mengunci token warna, status, radius, dan jarak.
