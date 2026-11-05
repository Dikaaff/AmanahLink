# P4 Component Provenance (§9.4) — AmanahLink

## Tujuan
Catat sumber tiap komponen di `/design/components` dan membedakan komponen
sistem produk dari komponen demonstrasi dokumen.

## Ruang lingkup
- Breadcrumb dan SpecimenCard berasal dari komponen yang sudah ada di proyek.
- Header demonstrasi dokumen dan footer galeri memakai Magic UI Sparkles
  dan Magic UI Marquee.
- Kedua komponen Magic UI hanya berada di halaman ini dan tidak dipakai di
  layar produk.

## Komponen
1. Breadcrumb — navigasi halaman yang sudah ada.
2. SpecimenCard — pembungkus rekam jejak komponen.
3. Header demonstrasi — Magic UI Sparkles, digunakan sesuai §9 dan DD-03.
4. Footer galeri — Magic UI Marquee, digunakan sesuai §9 dan DD-03.

## Jumlah Magic UI
Dokumen ini hanya menggunakan dua komponen Magic UI, sesuai batas maksimum yang ditetapkan di §9 dan DD-03.

## Klaim arah visual
Halaman ini tidak memakai gradient.
Halaman ini tidak memakai blur.
Halaman ini tidak memakai bayangan, kecuali yang diizinkan untuk sheet atau
dialog.
Setiap rekam jejak hanya ditunjukkan dengan kata, bentuk, dan bobot teks; warna
tidak dipakai sebagai satu-satunya pembeda.

## Verifikasi
- Jalankan `npm run lint` dan `npm run build` dari folder frontend.
- Bukakan `/design/components?mode=light` dan `/design/components?mode=dark`.
- Pastikan tidak ada elemen yang bergantung pada gradient atau blur untuk
  rekam jejak atau komponen produk.

## Gate
P4 ditandai selesai bila dokumen ini ada, galeri menampilkan komponen yang
terdaftar, dan klaim non-gradient serta non-blur tercantum bersama bukti
verifikasi.
