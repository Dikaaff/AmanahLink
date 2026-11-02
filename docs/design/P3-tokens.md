# P3 — TOKENS & STATUS (Paper & Ink)

**Status:** selesai, menunggu GATE 3. **Tanggal:** 2026-11-03.
**Halaman rujukan:** `/design/tokens` (`frontend/src/app/design/tokens/page.tsx`, `noindex`).
**Tangkapan:** `docs/design/screens/p3-tokens-1440.png`, `p3-tokens-512.png`,
`p3-tokens-dark-1440.png`.
**Pengukur kontras:** `node scripts/contrast.mjs` (WCAG 2.1, relative luminance).

---

## 1. Yang dikunci di fase ini

| Berkas | Isi |
|---|---|
| `frontend/src/app/globals.css` | Lapisan primitif (semua nilai heksadesimal, satu alamat), pemetaan terang/gelap, token `@theme`, radius, satu bayangan, `:focus-visible`, shim kelas lama |
| `frontend/src/components/badge.tsx` | Enam nada status §5.2 + peta status backend → nada |
| `frontend/src/components/ui.tsx` | `StatusBadge` lama kini memakai `Badge`; 26 varian berwarna dihapus |
| `frontend/src/app/design/tokens/page.tsx` | Bukti visual: ramp, tabel kontras, tangga badge, skala jarak, radius, bayangan, mode gelap |
| `scripts/contrast.mjs` | Alat ukur kontras yang dapat dijalankan ulang |

Dependency baru: `lucide-react@^1.66.0` (ISC) — ikon §8. Disetujui lewat DD-03.

## 2. Ramp monokrom

Nilai literal hanya ditulis di lapisan primitif `--mono-*`; lapisan semantik
memetakannya. Tidak ada heksadesimal di komponen (`grep` = 0).

| Token | Terang | Gelap | Peran |
|---|---|---|---|
| `canvas` | `#ffffff` | `#0a0a0a` | Latar utama |
| `surface` | `#ffffff` | `#121212` | Kartu, dibedakan garis |
| `sunken` | `#fafafa` | `#161616` | Header tabel, area daftar |
| `line` | `#e4e4e7` | `#262626` | Garis 1px dekoratif |
| `line-strong` | `#8e8e96` | `#66666f` | Garis input, batas interaktif |
| `ink-muted` | `#71717a` | `#8b8b93` | Caption, placeholder |
| `ink-secondary` | `#52525b` | `#a1a1aa` | Teks pendukung |
| `ink` | `#0a0a0a` | `#fafafa` | Teks utama |
| `inverse` | `#ffffff` | `#0a0a0a` | Teks di atas isian hitam |
| `overlay` | `rgb(10 10 10 / .40)` | `rgb(0 0 0 / .64)` | Backdrop sheet |

### 2.1 Dua penyimpangan dari §5.1, keduanya karena pengukuran

| Token | Nilai §5.1 | Nilai dipakai | Bukti |
|---|---|---|---|
| `line-strong` (terang) | `#d4d4d8`, diklaim 3.1:1 | `#8e8e96` | `#d4d4d8` terukur **1,48:1** — gagal batas interaktif 3:1 (WCAG 1.4.11). `#8e8e96` terukur **3,25:1** |
| `line-strong` (gelap) | `#3f3f46` | `#66666f` | `#3f3f46` terukur **1,90:1**; `#66666f` terukur **3,48:1** |
| `sunken` (gelap) | `#171717` | `#161616` | `ink-secondary` di atas `#171717` terukur **6,996:1** (0,004 di bawah target 7:1); dengan `#161616` menjadi **7,06:1** |

Mengubah heksadesimal di sini **menjalankan** aturan §5.1 sendiri (batas
interaktif ≥ 3:1) dan §14.1, bukan melanggarnya. Klaim “3.1:1” pada dokumen
spesifikasi tidak sesuai dengan nilai heksadesimal yang ditulis di dokumen itu.

## 3. Kontras terukur (20 pasangan, 0 gagal)

Dihasilkan `node scripts/contrast.mjs`; tabel yang sama dirender di
`/design/tokens` §02.

| Pasangan | Peran | Terang | Gelap | Target |
|---|---|---|---|---|
| `ink / canvas` | Body, judul | 19,80:1 | 18,97:1 | 7:1 |
| `ink / surface` | Teks di kartu | 19,80:1 | 17,95:1 | 7:1 |
| `ink / sunken` | Teks header tabel | 18,97:1 | 17,34:1 | 7:1 |
| `ink-secondary / canvas` | Teks pendukung | 7,73:1 | 7,72:1 | 7:1 |
| `ink-secondary / sunken` | Metadata daftar | 7,41:1 | 7,06:1 | 7:1 |
| `inverse / ink` | Teks badge hitam penuh | 19,80:1 | 18,97:1 | 7:1 |
| `ink-muted / canvas` | Caption, placeholder | 4,83:1 | 5,86:1 | 4,5:1 |
| `ink-muted / sunken` | Caption di daftar | 4,63:1 | 5,35:1 | 4,5:1 |
| `line-strong / canvas` | Batas interaktif | 3,25:1 | 3,48:1 | 3:1 |
| `line / canvas` | Garis dekoratif | 1,27:1 | 1,31:1 | 1:1 |

**Batas penggunaan `ink-muted`:** 4,83:1 lulus AA untuk teks sekunder tetapi
**tidak** mencapai target body 7:1. Karena itu token ini dilarang untuk teks
informatif; hanya placeholder yang punya label persisten dan caption yang tidak
memikul informasi tunggal. Ini dicatat sebagai keputusan, bukan kelalaian.

## 4. Mode gelap: peta, bukan inversi

`globals.css` menulis nilai sekali (`--mono-*`), lalu memetakannya tiga kali:

1. `:root, [data-theme="light"]` → peta terang (default).
2. `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` →
   peta gelap saat OS meminta gelap.
3. `[data-theme="dark"]` → peta gelap pada subtree mana pun.

Konsekuensi yang sudah diuji: `data-theme` bekerja per elemen, bukan hanya pada
`<html>`. Halaman `/design/tokens` memakainya dua kali — panel mode gelap di
dalam halaman terang, dan pin seluruh halaman lewat `?mode=dark`.

Catatan bukti: Chrome headless di mesin ini melaporkan
`prefers-color-scheme: dark`, sehingga tangkapan pertama (tanpa pin) keluar
gelap. Semua tangkapan sekarang dipin eksplisit (`?mode=light` /
`?mode=dark`) agar mode yang dinilai tidak bergantung pada preferensi mesin.

Tidak ada utilitas `dark:` di komponen mana pun; tidak ada nilai kontras yang
saya klaim tanpa tabel §3.

## 5. Status tanpa warna (§5.2)

Enam nada, semuanya selalu membawa kata:

| Nada | Kata | Ikon | Garis | Isian | Berat |
|---|---|---|---|---|---|
| `rejected` | Ditolak | `x-circle` | solid | hitam penuh, teks putih | 600 |
| `success` | Berhasil | `check` (stroke 2.5) | solid | putih, teks hitam | 500 |
| `pending` | Menunggu | `clock` | solid | putih, teks hitam | 500 |
| `draft` | Draf | `circle-dashed` | putus-putus | putih, teks sekunder | 500 |
| `locked` | Terkunci | `lock` | tanpa garis | `sunken` | 500 |
| `warning` | Hampir habis | `alert-triangle` | solid | putih | 600 |

Peta status backend → nada (DD-07), 24 status internal, sisanya jatuh ke
`pending` — sistem tidak pernah mengarang nada ketujuh. Contoh: `settled`,
`verified`, `reconciled` → `success`; `needs_review`, `extracting`,
`uploaded` → `pending`; `frozen`, `expired`, `closed` → `locked`;
`failed`, `refunded`, `disputed` → `rejected`.

`StatusBadge` lama (26 varian berwarna: hijau/amber/biru/merah) sekarang
memanggil `Badge`. `status_label` dari API tidak lagi dirender di badge —
badge hanya boleh satu kata, sedangkan label backend sering tiga kata. Label
rinci menjadi teks baris pada P5.

### 5.1 Dua ketidaksesuaian di §5.2 yang saya laporkan, bukan saya putuskan sendiri

1. **`success` vs `pending` hanya dua lapis.** Tangga §5.2 menuntut minimal
   tiga lapis; tabelnya mengunci isian (putih), garis (solid), dan berat (500)
   untuk keduanya, sehingga yang tersisa hanya kata dan bentuk ikon (plus
   ketebalan stroke 2.5 vs 1.5). Tidak ada lapis ketiga tanpa mengubah tabel.
2. **`Hampir habis` dua kata**, sedangkan §5.2 melarang badge lebih dari satu
   kata. Saya ikuti tabelnya karena maknanya tidak bisa dipendekkan tanpa
   kehilangan arti ("Hampir" saja ambigu).

Keduanya perlu keputusanmu di GATE 3; alternatifnya ada di §9.

## 6. Jarak, radius, bayangan

| Skala | Nilai | Konteks |
|---|---|---|
| 4pt | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 | §7.2; 2 hanya koreksi optik label→nilai |
| Radius | 6 · 10 · 14 · full | input/badge/tombol · kartu · sheet/dialog · chip/avatar |
| Bayangan | `shadow-sheet` | satu-satunya: `0 1px 2px rgb(10 10 10 / .04), 0 12px 32px rgb(10 10 10 / .10)` |
| Fokus | `2px` tinta, offset `2px` | global `:focus-visible`, sama di kedua mode |

Penegakan: namespace `--radius-*` dan `--shadow-*` di-reset dengan `initial`,
lalu hanya nilai di atas yang didefinisikan. Bukti CSS terkompilasi:
`.shadow-sm` dan `.shadow-md` **tidak ada** (0 kemunculan), `.shadow-sheet` ada
satu. Radius utilitas lama (`rounded-xl`, `rounded-2xl`, `rounded-3xl`) dipetakan
ke 14px sebagai klem transisi, bukan nilai kelima; alias ini dihapus di P5.

## 7. Slop detector — angka

| Cek | Hasil | Catatan |
|---|---|---|
| 1. Kelas gradient di `src/` | **1** (`blur-3xl` ×2, `backdrop-blur` ×1 di `app/page.tsx`) | Utang P5: hero lama belum dibongkar |
| 2. Hex di luar `globals.css` | **0** | `grep -rnE "#[0-9a-fA-F]{3,8}" src --include=*.tsx --include=*.ts` |
| 3. Varian bayangan | **1** | `shadow-sheet`; `.shadow-sm`/`.shadow-md` tidak terkompilasi |
| 4. Nilai radius | **4** | 6 · 10 · 14 · full (+3 alias klem ke 14) |
| 5. Warna non-netral di `src/` | **27** (dari 98) | Sisa di `dashboard/page.tsx`, `dashboard/new/page.tsx`, `login`, `register`, `page.tsx`, `campaign-editor.tsx`, `ui.tsx` (Alert) — utang P4/P5, bukan token |
| 6. Ukuran huruf di halaman produk | belum berlaku | Halaman `/design/tokens` adalah katalog skala; batas 3 ukuran diuji di P5 |
| 7. Warna sebagai pembawa makna | **0** di sistem status | 26 status backend dipetakan ke 6 nada berbasis kata |

Angka 1 dan 5 bukan klaim lulus — itu sisa layar lama yang belum dimigrasikan,
dan saya catat supaya tidak terbaca sebagai “selesai”.

## 8. Verifikasi

- `npm run lint` → **0 error**.
- `npm run build` → sukses, 16 route termasuk `ƒ /design/tokens`.
- `node scripts/contrast.mjs` → **20 pasangan, 0 gagal**.
- Tangkapan: `p3-tokens-1440.png` (terang), `p3-tokens-dark-1440.png` (gelap),
  `p3-tokens-512.png`. Lebar 390/360/320 tetap **utang bukti**: Chrome headless
  di mesin ini memaksa `innerWidth=512` (dicatat di P2), jadi 512 adalah lebar
  terendah yang bisa saya klaim.
- Halaman produk lama masih 200 setelah kunci palet (`/`, `/login`,
  `/campaigns/{slug}`, `/dashboard`), karena kelas lama dipetakan ke token
  netral, bukan dihapus.

## 9. Tutup GATE 3

- **Apa yang dibuat:** lapisan token penuh (primitif + pemetaan terang/gelap +
  `@theme`), radius dan bayangan yang ditegakkan dengan reset namespace, cincin
  fokus global, sistem badge enam nada dengan peta status backend, shim kelas
  lama ke netral, alat ukur kontras yang dapat dijalankan ulang, dan halaman
  bukti `/design/tokens` dalam dua mode.
- **Apa yang diasumsikan:** `line-strong` dan `sunken` gelap boleh dikoreksi
  karena angka §5.1 tidak cocok dengan heksadesimalnya; `ink-muted` dibatasi
  pemakaiannya alih-alih dinaikkan kontrasnya (menaikkan akan menghapus bedanya
  dari `ink-secondary`); radius lama diklem ke 14px sampai P5.
- **Apa yang dibutuhkan darimu:** persetujuan GATE 3, plus dua keputusan kecil —
  (a) apakah `success`/`pending` boleh tetap dua lapis, atau garis `pending`
  diubah menjadi putus-putus agar tiga lapis; (b) apakah “Hampir habis” boleh
  tetap dua kata, atau diganti satu kata (usulan: “Kritis”). Tanpa jawaban saya
  lanjut dengan default konservatif: tetap seperti tabel §5.2.
