# UX_DECISIONS - Functional UX v5.0

Keputusan di bawah hanya menyangkut perilaku dan implementasi; arah visual tetap
Paper & Ink v4.0.

| ID | Fase | Keputusan | Alasan | Alternatif yang ditolak |
|---|---|---|---|---|
| UX-01 | P1 | Primitif v4.0 yang sudah ada (`Button`, `Field`, `Input`, `Alert`, `Empty`) dipertahankan; `Sheet` diperluas dan `Dialog`/`AlertDialog` ditambahkan | Menghindari dua sistem komponen dan menjaga layar yang sudah lolos GATE 5 tetap stabil | Menulis ulang semua primitif dari nol sampai layar lama pecah |
| UX-02 | P1 | Drag handle pada `Sheet` bersifat visual; penutupan lewat tombol, backdrop, atau Esc | Gestur drag buatan sendiri rawan konflik dengan scroll dan belum dibutuhkan untuk menyelesaikan alur | Implementasi drag-to-dismiss sekarang tanpa uji perangkat sentuh |
| UX-03 | P1 | Posisi toast dipilih lewat `matchMedia` setelah mount: bottom-center di mobile, top-right di desktop | Sonner hanya menerima satu `position`; dua instance Toaster akan menduplikasi toast | Menimpa posisi dengan CSS `!important` yang membuat animasi masuk/keluar tidak konsisten |
| UX-04 | P1 | Durasi default toast 3 detik; toast gagal memakai 6 detik di call site | Sonner tidak punya durasi per tipe; call site tahu apakah kegagalan butuh waktu baca lebih lama | Memaksa semua toast 6 detik sehingga konfirmasi sukses terasa lambat |
| UX-05 | P1 | Token skeleton gelap tidak diaktifkan di route produk | v4.0 mengunci seluruh route ke kanvas terang; nilai gelap disiapkan di token tetapi tidak dipakai | Mengikuti preferensi OS dan melanggar palet yang dikunci |
| UX-06 | P1 | `Sheet side="bottom"` menjadi dialog tengah di desktop, sedangkan `side="right"` menjadi panel kanan 480px | Memenuhi aturan >768: form pendek di Dialog, form panjang di Sheet kanan | Memaksa sheet bawah di desktop dan menutupi konteks daftar |
