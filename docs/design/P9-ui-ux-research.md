# P9 — Riset UI/UX: satu sistem kartu untuk mobile dan desktop

> Status: riset + keputusan desain. Implementasi menyusul di halaman publik
> (feed, detail kampanye, kartu) dan di shell navigasi.
> Tanggal: 2026-11-16.

## 1. Pertanyaan riset

1. Apa pola layout yang tepat ketika versi mobile sudah terasa lebih nyaman
   daripada desktop — apakah desktop sebaiknya "meniru" mobile, atau
   menambah kepadatan?
2. Bagaimana membuat feed kampanye tidak polos tanpa merusak sistem visual
   Paper & Ink yang monokrom?
3. Foto seperti apa yang membangun kepercayaan donatur, dan bagaimana
   memakainya secara jujur?
4. Bagaimana menjaga performa serta stabilitas layout saat gambar masuk?

## 2. Sumber

| Sumber | Dipakai untuk |
|---|---|
| [Material Design 3 — Canonical layouts](https://m3.material.io/foundations/layout/canonical-examples) | Feed, list-detail, supporting pane; compact 1 pane, expanded 2 pane |
| [Material 3 — Adaptive design](https://m3.material.io/foundations/layout/layout-overview/adaptive-design) | Strategi show/hide, levitate, reflow; panes berubah menurut lebar |
| [NN/g — Breakpoints in Responsive Design](https://www.nngroup.com/articles/breakpoints-in-responsive-design/) | Breakpoint adalah titik perubahan layout, bukan titik perubahan identitas visual |
| [NN/g — Responsive Web Design & UX](https://www.nngroup.com/articles/responsive-web-design-definition) | Satu konten, satu alur; kolom berubah, urutan tetap |
| [NN/g — Non-Profit & Charity Website UX](https://www.nngroup.com/reports/attracting-donors-and-volunteers-non-profit) | Desain rapi dan terorganisasi dinilai lebih tepercaya; gambar orang yang tidak jelas konteksnya membingungkan |
| [Baymard — Product list UX](https://baymard.com/research-articles/current-state-product-list-and-filtering) | Grid bertambah kolom di layar besar, tetapi dibatasi agar tidak sulit dipindai |
| [Baymard — Large-screen e-commerce](https://baymard.com/research-articles/responsive-upscaling) | Manfaatkan ruang ekstra dengan kolom/isi yang lebih kaya, bukan meregangkan kartu |
| [MIS Quarterly — Pictures that are Worth a Thousand Donations](https://misq.umn.edu/misq/article/47/2/535/2226/Pictures-that-are-Worth-a-Thousand-Donations-How) | Emosi pada gambar proyek berhubungan dengan keberhasilan penggalangan dana |
| [The Role of Genuine Human Faces in Charitable Websites](https://reference-global.com/download/article/10.2478/picbe-2024-0094.pdf) | Foto autentik meningkatkan kepercayaan dan niat berdonasi dibanding stok generik |
| [BBB Wise Giving — Photos in fundraising appeals](https://give.org/news/photos-and-images-in-fundraising-appeals) | Foto harus akurat, tidak menyesatkan, dan tidak kedaluwarsa |
| [Impact Guru — Charity image best practices](https://www.impactguru.com/info/charity-images-donation-pages-best-practices/) | Persetujuan subjek, relevansi, optimasi mobile, aksesibilitas |

## 3. Temuan

### T1 — "Mirip mobile" berarti satu sistem, bukan layout sempit di desktop

Material 3 memakai *feed* untuk kumpulan kartu dan *supporting pane* untuk
konten utama + panel pendukung. Pada layar compact hanya satu pane; pada
layar lebar pane kedua muncul. Yang berubah adalah **jumlah kolom/pane**,
bukan komponen, urutan baca, atau gaya kartu.

Implikasi: kartu kampanye harus sama di 390px dan 1440px. Desktop menambah
kolom (1 → 2 → 3) dan panel donasi di samping, bukan mengganti kartu menjadi
tabel atau baris padat. Tabel tetap dipakai di console admin karena di sana
kepadatan adalah tujuan, bukan pengalaman menjelajah.

### T2 — Urutan dan bahasa visual harus identik di semua breakpoint

NN/g menekankan satu konten dan satu alur; breakpoint hanya mengatur
susunan. Pengguna yang pertama melihat versi mobile lalu membuka desktop
harus mengenali halaman yang sama dalam satu pandangan.

Implikasi: hierarki kartu (status → judul → ringkasan → progres → nominal →
penggalang) tidak berubah. Di desktop hanya ada ruang lebih untuk gambar dan
panel konteks.

### T3 — Gambar adalah anchor pemindaian pertama

Baymard menemukan gambar adalah salah satu dari sedikit atribut yang membuat
pengguna mau membuka item; konsistensi rasio dan latar membuat grid mudah
dibandingkan. Untuk kampanye, satu foto utama yang kuat lebih berguna
daripada banyak thumbnail kecil.

Implikasi: setiap kartu punya cover 16:10 dengan rasio tetap, object-fit
cover, dan posisi yang sama. Status dan sisa hari ditempel di atas gambar
sebagai chip solid agar tetap terbaca. Tidak ada kartu tanpa area gambar:
bila data kosong, tampil pola pengganti yang tenang, bukan ruang kosong.

### T4 — Foto autentik membangun trust; stok generik merusak

Riset non-profit menunjukkan foto orang nyata meningkatkan kepercayaan dan
niat berdonasi, sedangkan stok generik mudah dikenali dan melemahkan
kredibilitas. Foto juga harus akurat dan tidak menyesatkan (BBB Wise Giving).

Keputusan untuk MVP demo: gambar contoh dari Unsplash dipakai sebagai
**placeholder demo**, diberi kredit di `frontend/public/campaigns/CREDITS.md`,
dan tidak diklaim sebagai penerima manfaat nyata. Di produksi, gambar harus
diunggah penggalang, dengan persetujuan subjek dan verifikasi admin. Sistem
tetap menyimpan URL/path, sehingga jalur unggah dapat ditambahkan tanpa
mengubah kontrak tampilan.

### T5 — Monokrom tetap dijaga, tetapi foto tidak boleh jadi abu-abu tanpa makna

Sistem Paper & Ink melarang warna membawa makna. Foto berwarna akan
mendominasi perhatian dan bersaing dengan status/angka. Solusi: foto
diproses `grayscale` dengan kontras sedikit dinaikkan. Ini menyatukan foto
ke dalam sistem editorial, bukan menghilangkan konteks: alt text tetap
menjelaskan isi gambar, dan kredit tersedia.

Devil's advocate: grayscale dapat mengurangi emosi yang justru mendorong
donasi (MISQ). Karena itu gambar tetap besar dan manusiawi; yang monokrom
adalah palet, bukan subjek. Bila kelak ada uji A/B, warna dapat diuji
sebagai varian, bukan default.

### T6 — Gambar harus tidak menggeser layout dan tidak memperlambat LCP

Rasio tetap (aspect-ratio) mencegah CLS. `loading="lazy"` untuk kartu di
bawah lipatan, `decoding="async"`, dan file ±100 KB sudah cukup untuk
kartu 400–800px. Gambar hero detail dimuat lebih awal karena berada di
atas lipatan.

## 4. Anti-pola yang ditemukan di kode saat ini

1. Kartu kampanye hanya teks; tidak ada anchor visual, sehingga feed terasa
   seperti daftar pengumuman.
2. Halaman detail memakai `text-3xl/4xl` dan warna `stone-*` sementara
   halaman lain memakai token `text-h1`/`ink-*`; bahasa visual pecah.
3. Navigasi publik desktop menampilkan banyak tautan admin (Kampanye,
   Review nota, Audit, Admin), berbeda dari bottom bar mobile yang hanya
   punya empat tujuan. Pengguna staf melihat dua IA sekaligus.
4. Tidak ada kolom gambar di database, sehingga tidak mungkin menampilkan
   foto tanpa perubahan kontrak.
5. Skeleton feed tidak menyediakan area gambar, sehingga tinggi kartu
   melompat saat data tiba.

## 5. Keputusan desain (P9)

| ID | Keputusan |
|---|---|
| UX-21 | Satu anatomi kartu di semua breakpoint: cover 16:10, chip status, judul, ringkasan 2–3 baris, progres, nominal, penggalang. Desktop hanya menambah kolom (1/2/3). |
| UX-22 | Cover kampanye disimpan sebagai `cover_image_url` (nullable) dan dirender `grayscale` dengan fallback pola; gambar contoh demo diberi kredit. |
| UX-23 | Detail kampanye memakai hero image dan supporting pane donasi di desktop; urutan mobile dipertahankan, CTA donasi tetap terlihat. |
| UX-24 | Navigasi publik disederhanakan agar sama di mobile dan desktop: jelajah, dasbor/console, notifikasi, aksi utama. Tautan admin rinci hanya ada di console. |
| UX-25 | Skeleton feed memesan area gambar dengan rasio yang sama agar tidak ada layout shift. |

## 6. Kriteria penerimaan

- AC-P9-1: Feed di 390px, 768px, dan 1440px memakai kartu yang sama; jumlah
  kolom bertambah tanpa horizontal scroll.
- AC-P9-2: Setiap kampanye demo menampilkan cover; kampanye tanpa cover
  menampilkan fallback yang tidak terlihat rusak.
- AC-P9-3: Detail kampanye menampilkan cover, status, dan CTA donasi pada
  urutan yang sama di mobile dan desktop.
- AC-P9-4: `cover_image_url` muncul di API kampanye dan tidak dapat diisi
  lewat endpoint pembuatan kampanye (field sistem, bukan input pengguna).
- AC-P9-5: Tidak ada `next/image` remote config baru; gambar lokal di
  `public/campaigns` dimuat dengan `loading="lazy"` (kecuali hero).
- AC-P9-6: `prefers-reduced-motion` mematikan zoom hover pada cover.

## 7. Batas

- Belum ada unggah gambar dari penggalang; ini field sistem yang diisi
  seeder/admin di masa depan.
- Foto demo bukan penerima manfaat sebenarnya; produksi memerlukan
  persetujuan subjek dan moderasi.
- Riset ini tidak menguji konversi donasi secara kuantitatif; ia memakai
  temuan publik untuk mengurangi risiko desain.
