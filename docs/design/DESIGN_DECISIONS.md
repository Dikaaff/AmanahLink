# DESIGN_DECISIONS — AmanahLink UI/UX v4.0

Format: **Keputusan | Alasan | Alternatif yang ditolak**.
Arah visual dikunci: PAPER & INK. Entri di bawah hanya menyangkut eksekusi dan
cakupan, bukan palet.

| ID | Keputusan | Alasan | Alternatif yang ditolak |
|---|---|---|---|
| DD-01 | Cakupan P5–P6: 14 route Next.js yang ada dipetakan lebih dulu, layar baru (L01–L31 yang belum punya route) menyusul | Jawaban pemilik produk "ya, dua"; memperbaiki layar yang dipakai demo memberi bukti tercepat tanpa membuang pekerjaan backend | (a) Bangun 31 layar dari nol — menunda GATE 5 yang sudah dekat; (b) hanya reskin route lama — melanggar R02 |
| DD-02 | Bukti riset = URL publik + tangkapan layar Chrome headless sendiri | Jawaban "cukup"; tidak ada MCP browser di sesi ini | (a) Menunggu paket screenshot dari pemilik produk — memblokir P1; (b) mengklaim observasi dashboard berbayar — melanggar R09 |
| DD-03 | Boleh menambah dependency: shadcn/ui, Geist (next/font), Sonner, Lucide, Magic UI (maks 3 komponen) | Jawaban "boleh"; §9 mengunci komponen ke shadcn/ui + allowlist | (a) Mempertahankan komponen buatan sendiri di `components/ui.tsx` — bertentangan dengan R05; (b) menambah library animasi pihak ketiga — di luar allowlist |
| DD-04 | Halaman publik yang memblokir bot dicatat sebagai kegagalan bukti, bukan ditafsirkan | R09: klaim tanpa artefak tidak sah | Menyalin pola dari artikel pihak ketiga dan menyebutnya observasi — menyesatkan |
| DD-05 | Data seed E2E memakai akun demo (`budi`, `admin`) + registrasi unik per run, bukan menghapus database | Menjaga bukti audit lama tetap dapat diperiksa | `migrate:fresh` tiap E2E — menghapus jejak audit dan ledger historis |
| DD-06 | Frontend tetap satu aplikasi Next.js; shell mobile-first, admin memakai layout padat pada 768/1440 | R03 + §13; menghindari dua basis kode | Memisahkan aplikasi admin — biaya rilis dan konsistensi token |
| DD-07 | Status badge memakai 6 keadaan §5.2, bukan 26 status internal | R07 + C5; 26 varian warna mustahil dibedakan tanpa warna | Memetakan 1:1 status backend ke badge — melanggar batas kognitif §3.4 |
| DD-08 | Tidak ada halaman/dialog yang memakai gradient, blur, atau bayangan selain sheet/dialog | R06 dan §8 | Mempertahankan hero `blur-3xl` lama — melanggar arah yang dikunci |
| DD-09 | Geist dimuat lewat paket npm `geist@^1.9.0` (self-host), bukan `next/font/google` | Tidak bergantung jaringan saat build/CI; font ikut artefak; §6.1 mensyaratkan self-host | (a) `next/font/google` — build gagal tanpa jaringan; (b) menyalin file font manual — tidak perlu karena paket resmi sudah menyediakannya |
| DD-10 | Serif display dicabut di P2, bukan P5 | Specimen harus menilai huruf yang akan dipakai; mempertahankan serif membuat bukti P2 menguji sistem yang salah | (a) Pertahankan serif sampai P5 — specimen menyesatkan; (b) ubah semua layout sekaligus di P2 — melampaui gate |
| DD-11 | Route `/design/*` dirender tanpa nav/footer legacy lewat `SiteChrome` | Specimen harus dinilai pada tipografi, bukan palet lama; menghindari refactor route group sebelum P5 | (a) Pindahkan semua route ke route group sekarang — risiko besar di luar gate; (b) biarkan chrome lama — bukti specimen tercampur |
| DD-12 | Tangkapan layar P2 memakai 512 px dan 1440 px; 390/360/320 dicatat sebagai utang bukti | Chrome headless di mesin ini memaksa `innerWidth=512`; memaksa angka 390 hanya menghasilkan PNG terpotong yang menyesatkan | (a) Klaim 390 dari PNG terpotong — melanggar R09; (b) pasang Playwright sekarang — pekerjaan T-08 di luar fase |
