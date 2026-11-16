# P8 — Pengelolaan Admin AmanahLink

| Field | Nilai |
|---|---|
| Status | Berlaku (diimplementasikan pada 2026-11-16) |
| Dasar | `docs/design/P8-admin-research.md` (T1–T5) |
| Prinsip inti | **Admin adalah operator keputusan, bukan pihak transaksi.** |
| Cakupan | Peran & izin, tujuh kapabilitas admin, alur kerja, desain antrean, audit, kriteria terima |

---

## 1. Piagam peran

| Peran | Tugas | Tidak boleh |
|---|---|---|
| **Donatur** | berdonasi, melihat riwayat donasi | membuat kampanye, mencairkan, review |
| **Penggalang** | membuat & mengelola kampanye miliknya, mencairkan ke merchant, mengunggah nota | review kampanye/nota, freeze, ubah peran |
| **Verifikator** | memutuskan antrean kampanye & nota, membaca audit log | membuat/menyunting kampanye, berdonasi, mencairkan, freeze/refund, kelola pengguna |
| **Admin** | mengelola antrean, pengguna, merchant, limit, dan operasional platform | **membuat kampanye, berdonasi, memulai/menjalankan pencairan, mengunggah nota, menyunting konten kampanye** |

Alasan pemisahan: kontrol maker–checker hanya sah bila pembuat dan pemeriksa adalah dua identitas berbeda (P8-research T1). Satu akun admin yang bisa membuat kampanye, menyetujuinya, lalu mencairkan dananya menghapus kontrol itu sepenuhnya.

### 1.1 Aturan keras

1. Setiap aksi sensitif diperiksa di **server** melalui policy; UI hanya mencegah kebingungan.
2. Admin tidak memiliki jalur tulis ke `campaigns`, `donations`, `transactions`, `receipts`, atau `ledger_entries` atas nama pengguna.
3. Admin hanya boleh mengubah **keadaan kontrol**: status review, freeze, close/refund, limit, status merchant, status akun/peran.
4. Semua keputusan admin menyimpan aktor, waktu, alasan (bila menolak/membekukan), dan tercatat di audit log.
5. Admin tidak dapat mengubah perannya sendiri, menangguhkan dirinya sendiri, atau menghapus admin terakhir.

---

## 2. Matriks izin

`✓` = boleh, `—` = ditolak server (403), `own` = hanya resource miliknya.

| Kapabilitas | Donatur | Penggalang | Verifikator | Admin |
|---|---|---|---|---|
| Buat kampanye | — | ✓ | — | **—** |
| Sunting konten kampanye | — | own | — | **—** |
| Ajukan review kampanye | — | own | — | — |
| Donasi | ✓ | ✓ | — | **—** |
| Mulai / pindai / simulasi pencairan | — | own | — | **—** |
| Unggah nota pencairan | — | own | — | **—** |
| Review keputusan kampanye | — | — | ✓ | ✓ |
| Review keputusan nota | — | — | ✓ | ✓ |
| Freeze / unfreeze kampanye | — | — | — | ✓ |
| Tutup kampanye + refund | — | — | — | ✓ |
| Tetapkan limit pencairan | — | — | — | ✓ |
| Verifikasi merchant & MCC | — | — | — | ✓ |
| Lihat & replay webhook / DLQ | — | — | — | ✓ |
| Baca audit log | — | — | ✓ | ✓ |
| Kelola pengguna (suspend, peran) | — | — | — | ✓ |
| Lihat semua pencairan (read-only) | — | — | — | ✓ |

Catatan: "lihat semua pencairan" adalah pengawasan baca-saja. Tidak ada tombol cairkan di console admin.

---

## 3. Tujuh kapabilitas admin (SOP)

Setiap kapabilitas punya: pemicu → bukti → keputusan → jejak. Antrean di beranda admin diurutkan berdasarkan risiko dana lebih dulu, lalu umur item.

### S1 — Verifikasi kampanye

- **Pemicu:** kampanye berstatus `pending_review` (penggalang menekan "Ajukan review").
- **Bukti yang wajib terlihat:** judul, deskripsi, target, tenggat, MCC yang diizinkan, identitas penggalang, riwayat audit kampanye.
- **Keputusan:** setujui (`active`) atau tolak (`rejected`) dengan alasan ≥ 1 kalimat.
- **Yang dilarang:** menyunting judul/deskripsi/target/MCC milik penggalang; menyetujui kampanye milik sendiri (admin tidak punya kampanye).
- **Jejak:** `campaign.approved` / `campaign.rejected` + alasan.
- **SLA target:** 1×24 jam kerja (parameter kebijakan, bukan hardcode).

### S2 — Verifikasi nota

- **Pemicu:** nota berstatus `needs_review` setelah OCR selesai, atau OCR gagal/buram.
- **Bukti:** gambar nota, hasil OCR (merchant, nominal, tanggal), transaksi asal (merchant, nominal, campaign), selisih nominal.
- **Keputusan:** setujui (`verified`) atau tolak (`rejected`) dengan alasan.
- **Yang dilarang:** mengunggah atau mengganti nota. Bila nota tidak terbaca, admin menolak dengan alasan "minta unggah ulang" — penggalang yang mengunggah.
- **Jejak:** `receipt.verified` / `receipt.rejected` + alasan.
- **SLA target:** 1×24 jam kerja.

### S3 — Pengawasan pencairan

- **Pemicu:** daftar pencairan baru, pencairan tanpa nota, atau anomali (nominal besar, merchant baru, frekuensi tidak wajar).
- **Aksi yang sah:** membaca detail, menandai untuk ditindaklanjuti, membekukan kampanye, mengeskalasi.
- **Yang dilarang:** memulai pencairan, mengubah nominal, mengunggah nota, menghapus transaksi.
- **Jejak:** `campaign.frozen` dengan alasan; catatan tindak lanjut.
- **Ambang eskalasi (kebijakan):** pencairan > limit harian, merchant < 7 hari terverifikasi, atau 3 pencairan dalam 10 menit.

### S4 — Registry merchant & MCC

- **Pemicu:** merchant baru berstatus `pending`, atau merchant lama perlu dicabut.
- **Bukti:** nama, MID, MCC, kota, dokumen verifikasi.
- **Keputusan:** verifikasi, tolak, cabut.
- **Yang dilarang:** menetapkan MCC yang tidak sesuai dokumen; memverifikasi merchant tanpa bukti.
- **Jejak:** `merchant.verified` / `merchant.rejected`.

### S5 — Pengguna & peran

- **Pemicu:** laporan penyalahgunaan, permintaan menjadi verifikator, akun mencurigakan.
- **Keputusan:** suspend, aktifkan kembali, ubah peran ke `donor` / `campaigner` / `verifier`.
- **Aturan:** tidak boleh mengubah diri sendiri; tidak boleh menurunkan/menangguhkan admin terakhir; peran `admin` tidak dapat diberikan lewat UI (hanya seeder/operasi database).
- **Efek suspend:** login ditolak, token yang ada ditolak pada request berikutnya (403 `ACCOUNT_SUSPENDED`), notifikasi tidak dikirim.
- **Jejak:** `user.suspended`, `user.reactivated`, `user.role_changed` (before/after).
- **Catatan:** impersonasi tidak disediakan pada MVP.

### S6 — Sengketa, pembekuan, refund

- **Pemicu:** laporan donatur/publik, indikasi penyalahgunaan, kampanye kedaluwarsa.
- **Aksi:** freeze (hentikan belanja), unfreeze (setelah klarifikasi), close + refund proporsional.
- **Yang dilarang:** menambah/mengurangi saldo manual; menghapus transaksi; mengedit ledger.
- **Jejak:** `campaign.frozen`, `campaign.unfrozen`, `campaign.closed` + jumlah refund.
- **Refund** dihitung sistem dari ledger; admin hanya memicu, tidak mengetik nominal.

### S7 — Operasional & audit

- **Pemicu:** webhook `dead_letter`, mismatch ledger, antrean OCR menumpuk, error rate.
- **Aksi:** replay webhook (idempoten), telusuri mismatch, baca audit, ekspor.
- **Yang dilarang:** mengedit/menghapus audit log (route immutable sudah menolak).
- **Jejak:** `webhook.replayed`, akses audit tercatat pada middleware.

---

## 4. Desain console admin

### 4.1 Navigasi (desktop sidebar, mobile bottom bar)

| Grup | Entri | Isi |
|---|---|---|
| Tugas | **Tugas** (`/admin`) | antrean yang butuh keputusan + kesehatan platform |
| Review | **Review** (`/admin/campaigns`) | tab: Kampanye · Nota · Pencairan · Audit log |
| Pengguna | **Pengguna** (`/admin/users`) | cari, filter peran/status, suspend, ubah peran |
| Operasional | **Operasional** (`/admin/webhooks`) | webhook & DLQ |

Admin **tidak** melihat "Dasbor" penggalang, "Kampanye saya", "Donasi saya", atau "Dana". Bila admin membuka `/dashboard`, ia dialihkan ke `/admin`.

### 4.2 Beranda "Tugas"

Urutan blok:

1. **Peringatan dana** (bila ada): mismatch ledger → "tahan pencairan".
2. **Antrean keputusan** (kartu angka + tautan): kampanye menunggu review, nota perlu review, pencairan menunggu nota, webhook gagal.
3. **Kesehatan platform** (3 angka utama + detail di `Disclosure`), label "Kesehatan platform" dipertahankan untuk rujukan.

Setiap kartu antrean menjelaskan *mengapa* item ada dan ke mana harus pergi; tidak ada angka tanpa aksi.

### 4.3 Halaman Pengguna

- Kolom: nama/email, peran, status verifikasi email, status akun, tanggal bergabung, aksi.
- Pencarian toleran (nama atau email), filter peran dan status, pagination server-side.
- Aksi berisiko memakai dialog konfirmasi + alasan untuk suspend.
- Admin tidak dapat memilih aksi pada barisnya sendiri.

### 4.4 Halaman Pencairan (pengawasan)

- Daftar semua pencairan (server-side pagination), filter kampanye/status.
- Kolom: waktu, kampanye, merchant, nominal, status, nota.
- Tidak ada aksi tulis; tautan ke detail kampanye untuk freeze bila perlu.

---

## 5. Kontrak API yang dipakai console

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/admin/dashboard` | admin | metrik + `queue` (jumlah antrean) |
| GET | `/api/v1/campaigns/review-queue?status=` | verifier, admin | antrean S1 |
| POST | `/api/v1/campaigns/{campaign}/review` | verifier, admin | keputusan S1 |
| POST | `/api/v1/campaigns/{campaign}/freeze` | admin | S3/S6 |
| POST | `/api/v1/campaigns/{campaign}/close` | admin | S6 (refund) |
| GET | `/api/v1/receipts?status=` | verifier, admin | antrean S2 (semua nota) |
| POST | `/api/v1/receipts/{receipt}/review` | verifier, admin | keputusan S2 |
| GET | `/api/v1/disbursements` | admin (semua), penggalang (miliknya) | S3 read-only |
| GET | `/api/v1/admin/users?q=&role=&status=` | admin | S5 |
| PATCH | `/api/v1/admin/users/{user}/role` | admin | S5 |
| POST | `/api/v1/admin/users/{user}/suspend` | admin | S5 |
| POST | `/api/v1/admin/users/{user}/reactivate` | admin | S5 |
| GET | `/api/v1/admin/webhook-events` | admin | S7 |
| POST | `/api/v1/admin/webhook-events/{event}/replay` | admin | S7 |

Ditolak untuk admin (403): `POST /campaigns`, `PUT /campaigns/{id}`, `POST /donations`, `POST /disbursements*`, `POST /disbursements/{id}/receipts`, `POST /campaigns/{id}/submit`.

---

## 6. Kriteria terima

| ID | Kriteria | Dibuktikan oleh |
|---|---|---|
| AC-1 | Admin mendapat 403 saat membuat kampanye, berdonasi, memulai/mensimulasikan/memindai pencairan, dan mengunggah nota | `AdminSeparationOfDutiesTest` |
| AC-2 | Penggalang tetap dapat melakukan alur yang sama (tidak ada regresi) | tes alur yang ada + `AdminSeparationOfDutiesTest` |
| AC-3 | Admin dapat melihat semua pencairan, tetapi tidak memiliki aksi tulis | `DisbursementApiTest` + halaman `/admin/pencairan` |
| AC-4 | Admin dapat suspend/aktifkan pengguna; login dan request token berikutnya ditolak saat suspend | `AdminUserManagementApiTest` |
| AC-5 | Admin dapat mengubah peran donor ↔ campaigner ↔ verifier; peran admin tidak dapat diberikan lewat API | `AdminUserManagementApiTest` |
| AC-6 | Admin tidak dapat menangguhkan dirinya sendiri atau menurunkan admin terakhir | `AdminUserManagementApiTest` |
| AC-7 | Sidebar admin tidak memuat Dasbor penggalang, Kampanye saya, atau Dana; admin diarahkan ke `/admin` | `p7-admin.spec.ts`, `admin-separation.spec.ts` |
| AC-8 | Beranda admin menampilkan antrean keputusan dengan tautan, bukan hanya metrik | `p7-admin.spec.ts` |
| AC-9 | Setiap perubahan peran/suspend tercatat di audit log | `AdminUserManagementApiTest` |
| AC-10 | Halaman pengguna dan pencairan tidak meluber pada 768/1440 | `p7-admin.spec.ts` |

---

## 7. Di luar cakupan (sengaja ditunda)

- Impersonasi pengguna dan "login sebagai".
- Antrean penugasan per petugas (assignment/ownership) dan SLA timer.
- KYC dokumen formal, daftar sanksi, dan pelaporan otomatis.
- Dua admin independen untuk satu keputusan (dual approval internal). Saat ini maker adalah pengguna, checker adalah staf — pemisahan sudah nyata.
- Pengaturan kebijakan (ambang nominal, SLA) lewat UI; masih di config.
