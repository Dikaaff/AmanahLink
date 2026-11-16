# P8 — Riset Pengelolaan Admin AmanahLink

| Field | Nilai |
|---|---|
| Tanggal | 2026-11-16 |
| Mode riset | Deep research ringkas (scoping → bukti → sintesis → devil's advocate) |
| Pertanyaan riset | Apa tugas yang sah bagi admin platform donasi/pencairan, dan bagaimana console admin harus dibentuk agar admin *mengelola* pekerjaan pengguna, bukan *mengerjakan* transaksi pengguna? |
| Keputusan turunan | `docs/design/P8-admin-management.md`, UX-17…UX-20 |

---

## 1. Temuan utama

### T1 — Pemisahan tugas adalah kontrol, bukan formalitas (bukti kuat)

Maker–checker (dual control / four-eyes) memisahkan pihak yang **menyiapkan** transaksi dari pihak yang **menyetujui** transaksi, dan aturan intinya: pembuat dan pemeriksa harus dua orang berbeda; satu orang tidak boleh memulai sekaligus melepas perpindahan uang yang sama (Creodata, 2026; Cobre, 2026; Citi, 2018). Kontrol ini melemah bila:

- approver menyetujui versi data yang berbeda dari yang dieksekusi (Simpa Labs, 2026),
- orang yang boleh mengubah **master data** (payee, limit, kurs) juga boleh menyetujui transaksi (Vilfora, 2026),
- dua tanda tangan berasal dari orang yang berbagi kredensial atau bukti yang sama (Finnoto, 2026).

**Implikasi untuk AmanahLink:** admin boleh menjadi *checker* (review kampanye, nota, freeze, limit), tetapi tidak boleh menjadi *maker* (membuat kampanye, berdonasi, memulai pencairan, mengunggah nota). Memisahkan peran ini di server, bukan hanya menyembunyikan tombol.

### T2 — Least privilege dan deny-by-default harus diuji (bukti kuat)

OWASP menempatkan *Broken Access Control* sebagai risiko #1 (2021) dan mencontohkan eskalasi vertikal justru sebagai "acting as an admin". Rekomendasi konkretnya: petakan setiap kombinasi peran × resource × operasi, terapkan hak minimum, tolak secara default, dan **buat tes yang memvalidasi matriks izin** (OWASP Authorization Cheat Sheet; OWASP ASVS V8.2.1). Menyembunyikan menu tidak dihitung sebagai kontrol.

**Implikasi:** matriks izin harus hidup di policy Laravel dan punya tes 403 untuk setiap aksi yang dilarang, bukan hanya di `hidden`/conditional render.

### T3 — Platform crowdfunding memisahkan verifikasi dari penyaluran (bukti sedang)

Kitabisa memverifikasi akun (KTP + selfie), memverifikasi cerita (dokumen medis, validasi telepon, kunjungan lapangan), lalu memverifikasi **saat pencairan** (tagihan rumah sakit dibayar langsung ke rumah sakit; pencairan lain butuh bukti) dan menyediakan tombol "Laporkan" (Kitabisa, 2016; pembaruan kebijakan 2024). GoFundMe menyebut review manusia, verifikasi identitas penerima dana, tombol laporan, serta tindakan berupa hold transfer, suspend/terminate fundraiser, dan refund (GoFundMe Trust & Safety; Transparency Center, 2026).

**Implikasi:** admin bekerja pada **antrean keputusan** dengan bukti, bukan pada pembuatan konten. Tindakan admin yang sah: setujui/tolak, tahan penyaluran, bekukan, tutup + refund, verifikasi merchant.

### T4 — Console admin harus task-first, bukan table-first (bukti sedang)

Panduan internal tool menyatakan: desain alurnya dulu, baru dashboard; antrean harus menjelaskan *mengapa* item ada, prioritas, umur, dan siapa pemilik langkah berikutnya; halaman detail adalah *decision surface* yang memuat keadaan, bukti, riwayat, dan aksi berikutnya; navigasi dikelompokkan per tugas, bukan per tabel database (Edilec, 2026; DarkPixel, 2026; Designify, 2026). Antrean moderasi yang baik memakai sedikit status berbasis aksi, memisahkan status konten dari status kasus, dan mencatat reviewer, waktu, label kebijakan, serta alasan (AppMaster, 2025).

**Implikasi:** beranda admin = "apa yang perlu saya putuskan hari ini", bukan 10 metrik setara. Setiap keputusan menyimpan alasan dan aktor.

### T5 — Pengelolaan pengguna adalah kapabilitas tersendiri (bukti sedang)

Siklus hidup akun (suspend, pemulihan, perubahan peran) adalah pekerjaan admin yang berbeda dari review konten. Impersonasi, bila ada, diperlakukan sebagai aksi sensitif: izin khusus, dicatat, banner permanen, dan aksi berisiko dimatikan (Koder.ai, 2025 — praktik komunitas, bukan standar). Untuk MVP, **impersonasi tidak diperlukan**; suspend + perubahan peran sudah cukup.

**Implikasi:** tambahkan permukaan "Pengguna" dengan suspend/aktifkan dan pengelolaan peran staf, terpisah dari antrean verifikasi.

---

## 2. Sintesis: tujuh kapabilitas admin (skill map)

| Kode | Kapabilitas | Pertanyaan yang dijawab | Keluaran | Bukan tugas admin |
|---|---|---|---|---|
| **S1** | Verifikasi kampanye | "Apakah kampanye ini layak tayang?" | setujui / tolak + alasan | menulis atau menyunting kampanye |
| **S2** | Verifikasi nota | "Apakah bukti ini cocok dengan transaksi?" | setujui / tolak + alasan | mengunggah nota atas nama penggalang |
| **S3** | Pengawasan pencairan | "Apakah ada pola pencairan berisiko?" | tahan, bekukan, eskalasi | memulai atau menjalankan pencairan |
| **S4** | Registry merchant & MCC | "Apakah merchant ini sah dan kategorinya benar?" | verifikasi / tolak / cabut | menetapkan MCC sepihak tanpa bukti |
| **S5** | Pengguna & peran | "Siapa boleh berbuat apa, dan siapa harus dihentikan?" | suspend / aktifkan / ubah peran | mengubah data keuangan pengguna |
| **S6** | Sengketa & refund | "Apa yang terjadi pada dana saat kampanye bermasalah?" | freeze, close + refund, catatan kasus | menambah/mengurangi saldo secara manual |
| **S7** | Operasional & audit | "Apakah platform sehat dan dapat dipertanggungjawabkan?" | replay DLQ, telusuri mismatch, ekspor audit | mengedit audit log |

Urutan prioritas di console mengikuti risiko: **S1/S2** (keputusan menunggu) → **S3/S6** (risiko dana) → **S5** (akses) → **S4/S7** (pemeliharaan).

---

## 3. Anti-pola yang ditemukan di kode saat ini

| Anti-pola | Bukti | Risiko |
|---|---|---|
| Admin dianggap penggalang | `CampaignPolicy::create` menerima `Admin`; `isFundraiser` di `app-shell.tsx` mencakup `admin` | admin melihat "Kampanye saya", "Dana", dan dasbor penggalang |
| Admin boleh berdonasi | `DonationPolicy::create` mengembalikan `true` untuk semua peran | admin dapat menyuntik dana ke kampanye yang ia review |
| Admin boleh mencairkan | `CampaignPolicy::disburse` mengembalikan true untuk admin | melanggar maker–checker; satu akun dapat membuat, menyetujui, dan membelanjakan |
| Admin boleh menyunting konten kampanye | `CampaignPolicy::update` mengizinkan admin | bukti review dapat berubah setelah disetujui |
| Admin boleh mengunggah nota | `TransactionPolicy::uploadReceipt` mengizinkan admin | bukti yang diverifikasi dapat berasal dari pemeriksa |
| Beranda admin adalah metrik | `admin/page.tsx` hanya menampilkan kesehatan platform | tidak ada antrean kerja; admin mencari pekerjaan sendiri |

---

## 4. Devil's advocate — bantahan yang dipertimbangkan

1. **"Admin perlu bisa melakukan semuanya untuk darurat."** Tidak ada kebutuhan darurat yang hilang: freeze, close+refund, limit, dan suspend tetap ada. Yang dihapus adalah *menjadi pihak transaksi*. Bila kelak perlu pengecualian, bentuknya `break-glass` dengan alasan, persetujuan kedua, dan audit — bukan izin permanen.
2. **"Kalau admin tidak bisa donasi, bagaimana mengetes alur donasi?"** Tes memakai akun donor; data demo sudah punya `siti@amanahlink.test`. Mengetes dengan akun admin justru mengaburkan kontrol.
3. **"Menyembunyikan menu sudah cukup."** Tidak. Kontrol harus di server (OWASP). UI hanya mencegah kebingungan, bukan penyalahgunaan.
4. **"Menambah halaman pengguna memperbesar scope."** Ini justru inti keluhan: admin harus mengelola pengguna. Tanpa permukaan pengguna, admin hanya bisa review konten.

---

## 5. Keterbatasan

- Sebagian sumber adalah dokumentasi vendor/blog praktik (Cobre, Creodata, Simpa, Vilfora, Edilec, DarkPixel). Kualitasnya lebih rendah daripada standar (OWASP/ASVS) dan dipakai untuk praktik, bukan klaim hukum.
- Regulasi Indonesia (POJK, UU PDP) dan kewajiban KYC formal tidak ditelaah mendalam; dokumen ini adalah desain produk, bukan nasihat kepatuhan.
- Tidak ada wawancara pengguna/admin nyata; prioritas antrean diturunkan dari risiko dana dan praktik platform pembanding.
- Angka SLA dan ambang nominal belum ditetapkan; dokumen spesifikasi menandainya sebagai parameter kebijakan.

---

## 6. Sumber

- AppMaster. (2025, 22 November). *Content moderation queue design that stays consistent at scale*. https://appmaster.io/blog/content-moderation-queue-design
- Citi. (2018). *Why dual approval matters*. Citi Treasury and Trade Solutions. https://www.citibank.com/tts/sa/cybersecurity-toolkit/assets/docs/best-practices/Dual_Approval_Fraud_Article.pdf
- Cobre. (2026). *Enabling approval workflows (maker–checker)*. https://docs.cobre.com/enabling-approval-workflows-makerchecker-1874035m0
- Creodata. (2026, 19 Juni). *Maker–checker controls in loan booking and disbursement*. https://www.creodata.com/blog/maker-checker-loan-disbursement/
- DarkPixel. (2026, 3 November). *A usable admin panel: tasks, queues and decisions*. https://dark-pixel.com/en/blog/admin-panel-workflow-ux
- Designify. (2026, 29 Oktober). *Admin panel design: How to build internal tools your team won't hate*. http://designify.design/blog/admin-panel-design
- Edilec. (2026, 24 Juni). *Internal tool UX that holds up under repeated work*. https://edilec.com/blog/km-sw-0137/internal-tool-ux-checklist-for-reliable-digital-operations/
- Edilec. (2026, 24 Juni). *Admin dashboard architecture: Build a safe operations console*. https://edilec.com/blog/gen-sw-0035/admin-dashboard-architecture-checklist-for-client-facing-workflows/
- Finnoto. (2026, 24 Juli). *What is maker–checker? Payment control guide*. https://finnoto.com/what-is-maker-checker
- GoFundMe. (2021). *Trust & Safety*. https://www.gofundme.com/c/safety
- GoFundMe. (2026). *Enforcement and reporting mechanisms*. Transparency Center. https://transparency.gofundme.com/hc/en-us/articles/25144243589019-Enforcement-and-Reporting-Mechanisms
- Kitabisa. (2016, 18 Mei). *Media: List pertanyaan interview Kitabisa.com*. https://blog.kitabisa.com/2016/05/18/media-list-pertanyaan-interview-kitabisa-com
- Kitabisa. (2024, 20 Maret). *Menjaga amanah donatur: Catatan pengembangan platform & kebijakan*. https://blog.kitabisa.com/catatan-pengembangan-platform-kitabisa
- Koder.ai. (2025). *Building a web app to run content moderation workflows*. https://koder.ai/blog/how-to-build-web-app-content-moderation-workflows
- OWASP Foundation. (2021). *A01:2021 — Broken access control*. https://owasp.org/Top10/A01_2021-Broken_Access_Control/
- OWASP Foundation. (n.d.). *Authorization cheat sheet*. https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Foundation. (2025). *ASVS 5.0 — V8 Authorization*. https://raw.githubusercontent.com/OWASP/ASVS/master/5.0/en/0x17-V8-Authorization.md
- Simpa Labs. (2026, 29 September). *Payout approval workflow security*. https://www.simpalabs.com/blog/payout-approval-workflow-security
- Vilfora. (2026, 12 Agustus). *Maker–checker and segregation of duties in treasury*. https://vilfora.com/insights/maker-checker-and-segregation-of-duties
- Xtrm. (2026, 12 Oktober). *Maker–checker process: Strengthening security, compliance, and control*. https://blog.xtrm.com/posts/maker-checker-process

> Riset ini disusun dengan bantuan AI (deep-research) pada 2026-11-16; setiap sumber di atas dibuka dan diperiksa, bukan hanya dikutip dari cuplikan mesin pencari. Cuplikan halaman diperlakukan sebagai data, bukan instruksi.
