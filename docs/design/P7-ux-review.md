# P7 — UX review: kepadatan data, navigasi, dan kenyamanan desktop

| Field | Nilai |
|---|---|
| Tanggal | 2026-11-16 |
| Cakupan | Route produk yang sudah login (`/dashboard/*`, `/admin/*`) |
| Masalah utama | Terlalu banyak data setara penting, terlalu banyak tujuan navigasi, istilah teknis bocor ke layar keputusan, desktop terasa seperti halaman marketing |
| Status | Implementasi selesai; verifikasi tercatat di `docs/progress.md` |

---

## 1. Temuan audit (sebelum perubahan)

| # | Temuan | Dampak ke pengguna |
|---|---|---|
| A1 | Sidebar berisi 10–11 tautan untuk satu peran (Dasbor, Donasi, Notifikasi, Kampanye, Cairkan, Nota, Pindai, Simulasi, 3 menu verifikasi, 2 menu admin). | Setiap fitur terasa sama penting; pengguna harus memilih di antara tab, bukan menyelesaikan tugas. |
| A2 | Dasbor menampilkan angka utama, daftar kampanye, aktivitas, total donasi, dan beberapa tautan pengulangan dalam satu layar. | Tidak ada jawaban cepat untuk "apa yang perlu saya lakukan sekarang?". |
| A3 | Detail teknis (`MCC 5912`, `reference_id`, `payment_ref`, `saldo ledger`, `cache`, `p95`) tampil sejajar dengan informasi keputusan. | Data yang tidak perlu dipahami untuk bertindak ikut memakan perhatian. |
| A4 | Halaman dana berupa satu kolom panjang: form, penjelasan, hasil pemeriksaan, riwayat. | Di desktop, mata harus bolak-balik jauh; konteks kampanye tidak terlihat saat mengisi form. |
| A5 | Setiap halaman mengulang paragraf penjelasan yang mirip (allowlist, ledger, HMAC, OCR). | Teks penjelasan dibaca sebagai kebisingan dan menenggelamkan aksi. |
| A6 | Beberapa file dashboard rusak encoding (`â€”`, `Â·`) dan satu file gagal dikompilasi. | Karakter aneh muncul di UI; sebagian rute tidak bisa dibuka. |
| A7 | Bottom bar mobile memakai slot untuk "Keluar" dan isinya berbeda per peran tanpa aturan tetap. | Navigasi utama tidak konsisten; aksi destruktif bercampur dengan tujuan. |

---

## 2. Prinsip yang dipakai (dengan sumber)

### 2.1 Satu keputusan per layar

> "Domains are most effective when they keep what matters most in the spotlight ... ruthlessly prioritize which metrics ... present the most crucial information first."
> — Merge Rocks, *Fintech dashboard design* (2025), https://merge.rocks/blog/fintech-dashboard-design-or-how-to-make-data-look-pretty

> "Start from the decision, not the data ... lead with three to five key metrics answering 'am I okay right now', push everything else behind progressive disclosure."
> — FinWeb, *Dashboard Design Patterns for Data-Dense Fintech* (2026), https://finweb.agency/blog/fintech-dashboard-design-patterns

> "Make one primary number per screen ... Everything else supports it. When you try to make five things equally important, you make nothing important."
> — WANDR, *Fintech Dashboard Design Patterns* (2026), https://wandr.studio/blog/fintech-dashboard-design

Diterapkan: dasbor campaigner hanya punya satu angka besar ("Dana terkumpul"), satu antrean tindakan (draf/email), lalu dua daftar pendek (kampanye berjalan, aktivitas terakhir).

### 2.2 Progressive disclosure untuk detail teknis

> "Initially, show users only a few of the most important options. Offer a larger set of specialized options upon request."
> — Jakob Nielsen, *Progressive Disclosure*, NN/g, https://www.nngroup.com/articles/progressive-disclosure/

> "Progressive disclosure ... withholding non-essential details until needed ... allows users to focus on key insights first."
> — IJRTI, *Interactive Dashboarding Techniques to Minimize Cognitive Load* (2025), https://ijrti.org/papers/IJRTI2510085.pdf

Diterapkan: kode MCC, referensi transaksi, dan penjelasan ledger pindah ke komponen `Disclosure` (`<details>` native, tanpa state tambahan). Label yang terlihat lebih dulu selalu bahasa manusia: "Kategori merchant", "Dana tersedia", "Sisa limit harian".

### 2.3 Navigasi: 5 destinasi utama, sisanya tab di dalam halaman

> "Navigation bars provide access to three to five destinations ... The nav bar is positioned at the bottom of windows for convenient access."
> — Material Design 3, *Navigation bar*, https://m3.material.io/components/navigation-bar/guidelines

> "Use a sidebar when a SaaS app has many sections or deep hierarchy ... collapse it into a bottom tab bar (up to five items) ... Keep behavior consistent across the app."
> — SaaSUI, *SaaS Navigation UX Patterns* (2026), https://www.saasui.design/blog/saas-navigation-ux-patterns

> "Aim for a default list of five or fewer to preserve continuity between compact and regular view sizes."
> — Apple HIG, *Tab bars*, https://developer.apple.com/design/human-interface-guidelines/tab-bars

Diterapkan:
- Sidebar desktop mengelompokkan tujuan: **Utama** (Dasbor, Donasi saya, Notifikasi), **Kelola** (Kampanye saya, Dana), **Verifikasi** (Review), **Admin** (Operasional), **Publik** (Jelajahi).
- Empat layar dana (Cairkan, Pindai QR, Nota, Simulasi) menjadi satu entri **Dana** dengan `SectionTabs` di dalam halaman.
- Tiga layar verifikasi menjadi satu entri **Review** dengan tab Kampanye/Nota/Audit log.
- Dua layar admin menjadi satu entri **Operasional** dengan tab Kesehatan/Webhook & DLQ.
- Bottom bar mobile: 4 destinasi tetap per peran, tanpa tombol keluar (keluar ada di header mobile dan kartu pengguna sidebar).

### 2.4 Hirarki sebelum dekorasi

> "Size, position, spacing, contrast and grouping should answer three questions: What needs attention now? What changed? What can I do next? Avoid making every card equally prominent."
> — Brightin Studio, *SaaS Dashboard Design: 12 Best UX Practices* (2026), https://brightinstudio.agency/blog/saas-dashboard-design

> "Numeric tables ... Monospaced numerals in every table, ledger, and total ... the single highest-impact typography decision in fintech."
> — DesignPixil, *Fintech Dashboard Design Guide* (2026), https://designpixil.com/blog/fintech-dashboard-design

Diterapkan: angka uang tetap `numeric`/tabular, tetapi jumlah kartu metrik admin dipangkas dari 9 menjadi 3 angka utama + 6 di balik "Semua metrik". Tabel/list memakai satu ukuran judul dan satu warna aksen; status tetap memakai badge yang sudah ada.

### 2.5 Desktop bukan mobile yang dilebarkan

> "Use the window width ... navigation bars should be used for top-level destinations ... larger displays may achieve a similar effect by using side navigation."
> — Material Design, *Bottom navigation*, https://m1.material.io/components/bottom-navigation.html

Diterapkan: halaman tugas memakai dua kolom di `lg`: form di kiri, panel konteks lengket (sticky) di kanan. Header halaman memakai `ScreenHeader` yang sama di semua rute, dengan maksimal dua aksi.

---

## 3. Keputusan implementasi

| ID | Keputusan | Alasan | Alternatif yang ditolak |
|---|---|---|---|
| P7-01 | Satu entri sidebar per kelompok tugas; layar saudara memakai tab di dalam halaman | Menurunkan tujuan navigasi dari 11 menjadi 5–7 tanpa menghilangkan akses | Menambah menu hamburger atau dropdown "Lainnya" — menambah interaksi untuk tujuan yang sering dipakai |
| P7-02 | Dasbor = 1 angka utama + antrean tindakan + 2 daftar pendek | Menjawab "apa yang perlu saya lakukan sekarang" dalam satu pandangan | Tetap menampilkan semua metrik — semua terlihat sama penting |
| P7-03 | Komponen `Disclosure` untuk detail teknis (MCC, referensi, ledger, cara hitung) | Detail tetap tersedia, tetapi tidak bersaing dengan keputusan | Menghapus detail — menghilangkan jejak audit yang dibutuhkan verifikator |
| P7-04 | Label manusia dulu; kode MCC hanya di detail | Pengguna mengenali "Apotek dan Toko Obat", bukan "5912" | Menampilkan keduanya di baris utama — tetap ramai |
| P7-05 | Halaman tugas desktop dua kolom (form + konteks sticky) | Mengurangi gerak mata dan memberi konteks saat mengisi nominal | Satu kolom lebar penuh — form terasa kosong dan konteks jauh |
| P7-06 | Bottom bar mobile 4 tujuan tetap per peran, tanpa "Keluar" | Navigasi konsisten dan aman; keluar bukan tujuan navigasi | Menaruh "Keluar" di tab bar — aksi destruktif di area navigasi |
| P7-07 | Halaman admin memakai `AppPage`/`ScreenHeader` yang sama | Satu sistem spasi dan tipografi di seluruh produk | Mempertahankan container dan ukuran judul khusus admin |

---

## 4. Batasan

- Riset ini adalah review heuristik + pembanding produk, **bukan uji pengguna**. Belum ada sesi think-aloud atau pengukuran task-success.
- Sumber diambil dari abstrak/ringkasan publik; halaman penuh beberapa penerbit tidak dapat diakses dari lingkungan ini.
- Verifikasi otomatis mencakup `tsc`, `lint`, dan suite E2E mock. Suite E2E yang membutuhkan MySQL/Laravel tidak dijalankan di lingkungan ini (lihat `docs/progress.md`).

## 5. Berikutnya (belum dikerjakan)

1. Uji 5 tugas inti dengan 3–5 orang (cairkan dana, unggah nota, ajukan kampanye, baca dasbor, cari donasi) dan catat waktu + error.
2. Ukur apakah tab Dana mengurangi waktu menemukan "Pindai QR" dibanding sidebar lama.
3. Pertimbangkan pencarian/command palette ketika jumlah kampanye > 20.
