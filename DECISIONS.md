# DECISIONS.md — AmanahLink

| Field | Nilai |
|---|---|
| Versi dokumen | 1.0 |
| Tanggal | 2026-11-01 |
| Fase terakhir | Fase 0 — Discovery |
| Status | Menunggu approval GATE Fase 0 |
| Format entri | Keputusan \| Alasan \| Alternatif yang ditolak |

---

## 1. Register Keputusan

### D-001 — Pay-in donasi memakai Midtrans Sandbox di balik interface `PaymentGateway`

- **Keputusan:** Semua pembayaran masuk (VA + QRIS dinamis) dibuat lewat interface `PaymentGateway` dengan dua driver: `midtrans` (target sandbox nyata) dan `fake` (deterministik, untuk test & demo tanpa kredensial).
- **Alasan:** Midtrans mendukung Virtual Account dan QRIS dinamis di sandbox, dokumentasinya publik, dan webhook-nya punya signature + `transaction_id` yang bisa dipakai sebagai kunci idempotensi. Interface memisahkan domain dari vendor sehingga logika ledger tidak bergantung pada provider.
- **Alternatif yang ditolak:** (a) Xendit — layak, tapi saya pilih satu provider agar fase 3 tidak melebar; adapter tetap bisa ditambah. (b) Hardcode panggilan HTTP langsung di service — melanggar pemisahan domain/infra dan membuat test butuh jaringan.

### D-002 — Disbursement MVP memakai **merchant allowlist**, bukan MCC yang dipaksakan di jaringan

- **Keputusan:** Mode default `allowlist`: setiap merchant terverifikasi lebih dulu (NIB/identitas + MCC) dan dicatat di tabel `merchants`. QRIS/pembayaran hanya diterbitkan untuk merchant yang ada di registry dan linier dengan `campaign.allowed_mcc_array`. Ada slot driver `virtualcard` untuk issuer yang mendukung kontrol MCC + spend limit, tetapi **tidak aktif** sampai ada mitra penerbit.
- **Alasan:** Faktanya, QRIS sebagai skema tidak mengekspos kontrol MCC per-transaksi di sisi issuer untuk dana pihak ketiga. Mengklaim "MCC diblokir oleh jaringan" pada mode allowlist adalah klaim palsu. Mengunci MCC saat *registrasi merchant* + memvalidasi saat *authorize* menghasilkan jaminan yang nyata dan bisa diaudit hari ini.
- **Alternatif yang ditolak:** (a) Virtual card ber-MCC dari issuer — benar secara teknis, tapi butuh kerja sama penerbit (BIN sponsor), kontrak, dan waktu onboarding yang tidak realistis untuk tahap ini. (b) Mencatat MCC dari data merchant lalu percaya begitu saja — tidak ada verifikasi, sama dengan tidak ada kontrol.
- **Konsekuensi yang diterima:** Demo harus menyebut ini "allowlist + MCC registry", bukan "MCC-level network control". Formulir & laporan tidak boleh melebih-lebihkan.

### D-003 — Penegakan MCC berlapis (defense in depth)

- **Keputusan:** Empat lapis, semuanya wajib:
  1. **Registry** — merchant hanya boleh `verified` bila MCC-nya sudah dicek manual/verifikasi dokumen.
  2. **Authorize** — `campaign.allowed_mcc_array` dicek `in_array(..., true)`, deny-by-default (array kosong/null = tolak).
  3. **Rail** — bila driver mendukung kontrol di sisi penerbit, lapis ini aktif; di mode allowlist, lapis ini = "merchant harus ada di registry".
  4. **Rekonsiliasi** — nota OCR + settlement dicocokkan; selisih → `disputed`.
- **Alasan:** Satu lapis saja bisa dilewati lewat bug, replay, atau perubahan konfigurasi. Lapis 1 dan 2 ada di kendali kita, jadi tidak menunggu pihak ketiga.
- **Alternatif yang ditolak:** Validasi MCC hanya di frontend — bisa dilewati dengan curl; melanggar anti-pattern §18.

### D-004 — Build-first-contract: semua integrasi eksternal punya driver `fake` deterministik

- **Keputusan:** Payment, disbursement rail, dan OCR diakses lewat interface. Driver `fake` dipakai untuk test, CI, dan demo sebelum kredensial sandbox tersedia. Driver nyata diaktifkan lewat konfigurasi (`PAYMENT_DRIVER=midtrans`, dst.), bukan lewat perubahan kode domain.
- **Alasan:** Kredensial belum tersedia, dan CI tidak boleh bergantung pada layanan eksternal (flaky). Interface yang sama membuat migrasi ke sandbox hanya soal env + satu adapter.
- **Alternatif yang ditolak:** Menunggu akun sandbox sebelum mulai koding — memblokir 100% progres. (b) Memakai sandbox di CI — lambat, flaky, butuh secret.

### D-005 — Representasi uang: `DECIMAL(15,2)` di MySQL, aritmetika via `brick/math`

- **Keputusan:** Kolom uang `DECIMAL(15,2)`, Eloquent cast `decimal:2`. Di PHP, nilai uang diperlakukan sebagai **string** dan setiap operasi aritmetika memakai `Brick\Math\BigDecimal`. Tidak ada `float`, tidak ada operator `+`/`-` langsung pada nilai uang.
- **Alasan:** `decimal:2` mengembalikan string, dan string + operator aritmetika PHP = cast implisit ke float. `brick/math` menutup celah itu dan tersedia sebagai dependensi mandiri (tanpa framework tambahan).
- **Alternatif yang ditolak:** (a) Menyimpan integer minor unit (sen) — sebenarnya paling aman, tetapi bertentangan dengan R6 dan memaksa konversi di setiap lapisan. (b) `float`/`double` — dilarang keras.

### D-006 — Ledger adalah sumber kebenaran saldo; `current_amount` hanya proyeksi cache

- **Keputusan:** Saldo kampanye dihitung dari `ledger_entries` (Σ debit = Σ kredit per transaksi). `campaigns.current_amount` adalah kolom cache yang di-update di dalam transaksi DB yang sama, dan diverifikasi ulang oleh invariant check harian + test.
- **Alasan:** Satu angka di kolom bisa salah tanpa jejak; ledger punya jejak per rupiah dan bisa direkonsiliasi ulang kapan saja. Cache menjaga latensi baca halaman publik tetap rendah.
- **Alternatif yang ditolak:** Hanya `current_amount` (tanpa ledger) — tidak bisa diaudit, tidak bisa dibuktikan, dan setiap bug saldo jadi permanen.

### D-007 — OCR: boundary di Flask, provider di belakang interface

- **Keputusan:** Microservice Flask mengekspos `POST /extract` dengan kontrak JSON tetap. Di dalamnya, provider vision dipilih lewat config dengan driver `fake` (deterministik, untuk test) dan adapter nyata (OpenAI/Gemini Vision) yang diaktifkan saat API key tersedia.
- **Alasan:** Kontrak stabil membuat Laravel tidak peduli vendor OCR. Driver `fake` memungkinkan test contract berjalan di CI tanpa biaya dan tanpa jaringan.
- **Alternatif yang ditolak:** Memanggil vendor vision langsung dari Laravel — melanggar pemisahan container (§5) dan mencampur domain dengan vendor.

### D-008 — Target lingkungan: Docker Compose lokal + CI GitHub Actions; staging menyusul

- **Keputusan:** Pengembangan dan demo berjalan lewat `docker-compose.yml`. CI: lint → static analysis (PHPStan level 8) → test → build → E2E. Deploy staging/produksi manual setelah gate fase 8.
- **Alasan:** Reproducible di mesin 4 jam/hari tanpa "works on my machine", dan CI menjadi bukti Definition of Done (§15), bukan klaim.
- **Alternatif yang ditolak:** Instalasi native (PHP/MySQL/Redis langsung di Windows) — cepat di awal, tapi drift versi dan tidak bisa direproduksi oleh orang lain.

### D-009 — Laravel 13.39.0, bukan Laravel 11

- **Keputusan:** Stack backend memakai Laravel Framework **13.39.0** dan PHP 8.3.30 (zts). Sanctum, MySQL 8.4.3, brick/math 1.x.
- **Alasan:** Master prompt menyebut Laravel 11, tetapi pada November 2026 Laravel 11 sudah melewati masa dukungan keamanan; `laravel/framework` versi terbaru yang stabil di registry adalah v13.39.0 dan mensyaratkan PHP ^8.3 (tersedia). R5 memerintahkan versi LTS/stabil riil, bukan angka yang sudah EOL.
- **Alternatif yang ditolak:** Tetap memakai Laravel 11 — akan mendapat dependensi yang tidak lagi dipatch dan bertentangan dengan R5.

### D-010 — MySQL native (Laragon 8.4.3) untuk fase awal, Docker Compose di Fase 8

- **Keputusan:** Mesin pengembangan belum memiliki Docker Desktop; MySQL 8.4.3 milik Laragon dipakai sebagai database lokal (`amanahlink`, `amanahlink_test`). `docker-compose.yml` tetap menjadi deliverable Fase 8 dan harus lulus dari nol.
- **Alasan:** Memblokir fase 2–7 karena menunggu instalasi Docker bertentangan dengan semangat "kirim kode yang berjalan"; MySQL native memberi semantik ACID + `lockForUpdate` + `CHECK constraint` yang sama dengan target produksi.
- **Alternatif yang ditolak:** SQLite untuk lokal/CI — tidak menguji row lock, CHECK constraint, dan decimal MySQL, sehingga bukti ACID tidak sah.
- **Konsekuensi:** Konfigurasi `.env`/CI harus terbukti jalan di MySQL, bukan SQLite. Bila Docker dipasang nanti, hanya `.env` dan compose yang berubah.

---

### D-011 — Akun ledger memakai `owner_type='platform'` + `owner_id=0`, bukan NULL

- **Keputusan:** Akun tingkat platform disimpan dengan `owner_type = 'platform'` dan `owner_id = 0`. Akun kampanye memakai `owner_type = 'campaign'` dan `owner_id = campaigns.id`. Unik pada `(code, owner_type, owner_id, currency)`.
- **Alasan:** MySQL menganggap setiap NULL berbeda di unique index, sehingga `(code, NULL, NULL)` bisa terduplikasi tanpa batas dan saldo terpecah ke beberapa akun. Memakai sentinel `0` membuat constraint benar-benar bekerja.
- **Alternatif yang ditolak:** Kolom `owner_id` nullable + unique parsial — MySQL tidak punya partial/filtered index; butuh generated column yang menambah kompleksitas tanpa manfaat.

### D-012 — Immutability ledger ditegakkan dua lapis: model + trigger MySQL

- **Keputusan:** `LedgerEntry` menolak `update()`/`delete()` lewat model event, dan database memasang `BEFORE UPDATE` / `BEFORE DELETE` trigger dengan `SIGNAL SQLSTATE '45000'`. `AuditLog` append-only di level model.
- **Alasan:** Lapisan aplikasi bisa dilewati oleh query builder, tinker, atau job baru. Trigger membuat aturan itu berlaku untuk semua jalur tulis. Ledger yang bisa diedit tidak layak disebut ledger.
- **Alternatif yang ditolak:** Hanya `$guarded`/fillable — tidak mencegah update; hanya menghindari mass assignment. (b) Hanya trigger — pesan error di aplikasi jadi QueryException mentah, sulit dipetakan ke response API.
- **Konsekuensi:** Koreksi data tidak boleh lewat UPDATE; harus transaksi pembalik (reversal entry) yang juga tercatat.

---

### D-013 — `current_amount` dihitung ulang dari ledger saat menulis, bukan ditambah manual

- **Keputusan:** Setelah posting ledger, `CampaignBalanceService::sync()` membaca saldo akun `2200` untuk kampanye tersebut dari `ledger_entries` dan menulis ulang `campaigns.current_amount`. Sesudahnya `assertConsistent()` membandingkan cache vs ledger di dalam transaksi yang sama; selisih melempar `LedgerMismatchException` dan membatalkan seluruh transaksi.
- **Alasan:** `+=` manual mengasumsikan setiap jalur tulis mengingat semua komponen (donasi, fee, pencairan, refund). Satu jalur yang lupa = drift permanen tanpa alarm. Recompute-from-ledger membuat drift mustahil secara struktural, dan biayanya satu query agregat berindex.
- **Alternatif yang ditolak:** (a) Increment manual + job rekonsiliasi malam — drift bisa hidup berjam-jam, dan job-nya sendiri bisa salah. (b) Tidak menyimpan cache sama sekali — halaman publik harus menjumlah ribuan baris per request.
- **Konsekuensi:** Pemanggil wajib sudah memegang row lock kampanye; tanpa lock, recompute bisa menimpa nilai yang lebih baru.

---

### D-014 — Idempotency-Key di-scope per pengguna dan replay mengembalikan body tersimpan

- **Keputusan:** Key disimpan sebagai `donation:user:{id}:{key}`. Payload di-hash kanonik (`donor_id`, `campaign_id`, `amount` sebagai string desimal). Replay dengan hash sama mengembalikan `response_body` tersimpan (`donation_id` + instruksi pembayaran) dengan status 200; hash beda → `422 IDEMPOTENCY_MISMATCH`; baris belum selesai → `409 DUPLICATE_REQUEST`.
- **Alasan:** Tanpa scope, dua pengguna yang kebetulan memakai key sama akan saling menimpa. Menyimpan instruksi pembayaran (bukan membuat ulang) membuat replay benar-benar identik, termasuk bila kelak gateway asli menghasilkan VA baru setiap panggilan.
- **Alternatif yang ditolak:** (a) Key global — tabrakan antar pengguna. (b) Hanya mengandalkan unique `transactions.idempotency_key` — tidak bisa membedakan "sedang diproses" dari "sudah selesai", sehingga replay sah akan tampak seperti error.
- **Konsekuensi:** Hash harus stabil; ubah kanonikalisasi nominal = semua key lama tidak cocok lagi (hanya berlaku 24 jam).

---

### D-015 — Tutup kampanye = refund proporsional dari saldo ledger, dipicu admin

- **Keputusan:** `POST /api/v1/campaigns/{id}/close` (admin) memindahkan kampanye `active|funded|expired → closed → refunded` dalam satu transaksi DB. Dana yang dikembalikan adalah saldo akun `2200` kampanye (bukan `current_amount`), dibagi proporsional terhadap kontribusi **neto** tiap donasi (`amount − fee`). Pembagian dilakukan dalam satuan sen dengan metode largest remainder (Hamilton), sehingga Σ refund = saldo persis. Ledger mencatat satu transaksi refund per donatur (debit 2200, kredit 2050) lalu satu payout agregat (debit 2050, kredit 1000). Donasi `settled` menjadi `refunded`.
- **Alasan:** BR-05 melarang fee dipotong ulang, jadi fee tidak ikut dikembalikan; saldo `2200` harus nol tepat setelah refund, dan pembulatan per donatur tidak boleh menyisakan atau menciptakan sen. Menulis per donatur menjaga jejak audit per rupiah. Refund kedua kali ditolak `409 CONFLICT_STATE` karena `refunded` adalah state terminal.
- **Alternatif yang ditolak:** (a) Bagi rata per donatur — mengabaikan besar kontribusi. (b) Refund gross (termasuk fee) — mengembalikan pendapatan yang sudah diakui. (c) Satu transaksi ledger agregat tanpa rincian donatur — tidak bisa direkonsiliasi per donasi. (d) Refund proporsional langsung dari `current_amount` — cache bisa drift; ledger adalah sumber kebenaran (D-006).
- **Konsekuensi:** Kampanye `frozen` harus di-unfreeze lebih dulu (state machine tidak mengizinkan `frozen → closed`). Endpoint bersifat administratif; campaigner tidak dapat menutup sendiri kampanyenya.

---

### D-016 — Status nota `verified` dan kriteria auto-match OCR yang konservatif

- **Keputusan:** `ReceiptStatus` mendapat state `verified` (mengikuti PRD §7.4 dan US-23): alur otomatis `uploaded → extracting → auto_matched → verified`, sedangkan review manusia `needs_review → approved|rejected`. Auto-match hanya terjadi bila **ketiga** syarat terpenuhi: confidence ≥ `AMANAH_OCR_CONFIDENCE` (default 0.75), nominal hasil ekstraksi berada dalam toleransi 1% dari nominal transaksi, dan nama merchant ada di registry `verified` dengan MCC yang aktif, tidak diblokir, serta tercantum di `campaign.allowed_mcc_array`. Selain itu nota masuk `needs_review`; kegagalan provider (timeout/5xx/payload rusak) juga `needs_review` dengan audit `ocr.timeout`, bukan HTTP 500. Upload nota memindahkan transaksi `captured → receipt_pending`; verifikasi memindahkannya `receipt_pending → verified → reconciled`; penolakan memindahkannya ke `disputed`.
- **Alasan:** US-23 menyebut status `verified`, sedangkan enum lama tidak punya state itu; memetakannya ke `approved` akan membuat AC dan laporan tidak cocok. Auto-approve berdasarkan confidence saja akan membuat nota palsu/ salah merchant lolos tanpa jejak, jadi registry merchant dan MCC tetap diperiksa (D-003 lapis 3). Menyimpan kegagalan OCR sebagai `needs_review` menjaga antrean verifikator tetap menjadi satu-satunya jalur keputusan saat provider bermasalah.
- **Alternatif yang ditolak:** (a) Menambah state `reconciled` di nota — rekonsiliasi adalah status transaksi, bukan nota. (b) Auto-approve hanya dengan confidence — mengabaikan nominal dan registry. (c) Menyimpan kolom terpisah untuk merchant/nominal/tanggal — `ocr_payload` JSON cukup dan kontraknya sudah stabil. (d) Membiarkan provider error menjadi 500 — melanggar R-06 dan membuat nota hilang dari antrean.
- **Konsekuensi:** Provider `fake` mengembalikan satu bentuk nota deterministik (Apotek Sehat, 50.000) untuk test/demo; adapter nyata hanya diaktifkan lewat `AMANAH_OCR_DRIVER=http` + `OCR_PROVIDER=openai` di container OCR. `ocr-service/` belum diuji lewat Docker karena Docker Desktop belum tersedia (D-010); kontraknya diuji dengan pytest langsung.

---

### D-017 — Freeze menyimpan alasan, memblokir transaksi baru, dan tidak membalik yang sudah captured

- **Keputusan:** `POST /campaigns/{id}/freeze` (admin, alasan wajib) menyimpan `frozen_at` + `freeze_reason` dan memindahkan kampanye `active|funded → frozen`. `POST /campaigns/{id}/unfreeze` mengembalikannya ke `funded` bila saldo cache ≥ target, selain itu `active`, lalu menghapus kedua kolom beku. Disbursement yang sudah `captured` tidak dibatalkan; hanya donasi dan pencairan **baru** yang ditolak `409 CAMPAIGN_NOT_ACTIVE` lewat `CampaignStatus`.
- **Alasan:** Alasan pembekuan harus bisa dibaca kembali oleh admin dan auditor, bukan hanya muncul di log. Membalik transaksi yang sudah captured akan mengubah ledger historis dan melanggar semantik pencairan yang sudah terjadi. Menentukan state tujuan dari saldo target membuat unfreeze tidak "menurunkan" kampanye yang sudah funded.
- **Alternatif yang ditolak:** (a) Menyimpan alasan hanya di audit log — tidak terlihat di resource kampanye. (b) Unfreeze selalu ke `active` — kampanye funded akan kehilangan statusnya. (c) Membatalkan disbursement captured saat freeze — butuh reversal entry dan mengaburkan fakta transaksi.
- **Konsekuensi:** Kampanye harus di-unfreeze dulu sebelum bisa ditutup/refund (state machine `frozen → active|funded`).

### D-018 — Audit log viewer read-only, cursor pagination, tanpa endpoint mutasi

- **Keputusan:** `GET /audit-logs` hanya untuk `verifier` dan `admin`, dengan filter `actor_id`, `action`, `from`, `to`, cursor pagination 25 baris, urut `created_at DESC, id DESC`. `PUT/PATCH/DELETE /audit-logs/{id}` didaftarkan eksplisit dan mengembalikan `405 METHOD_NOT_ALLOWED`; model `AuditLog` tetap menolak update/delete.
- **Alasan:** AC US-27 meminta 405, bukan 404; mendaftarkan route eksplisit membuat kontrak itu stabil. Cursor pagination menghindari offset yang bergeser saat log bertambah cepat, dan urutan id sebagai tie-breaker menjaga halaman tidak melompat saat timestamp sama.
- **Alternatif yang ditolak:** (a) Offset pagination — halaman bisa duplikat/hilang pada tabel append-only berkecepatan tinggi. (b) Tanpa route mutasi (404) — tidak memenuhi AC. (c) Filter `subject_type`/`subject_id` di MVP — belum diminta, bisa ditambahkan tanpa breaking change.

---

### D-019 — Webhook wajib membawa timestamp segar dan setiap penolakan diaudit

- **Keputusan:** Payload webhook wajib memuat `timestamp` (ISO-8601 atau Unix detik). Selisih terhadap waktu server dibatasi `AMANAH_PAYMENT_WEBHOOK_TOLERANCE` (default 300 detik). Signature salah, `external_id` tidak valid, timestamp hilang/tidak terbaca/kedaluwarsa semuanya ditolak `401 INVALID_SIGNATURE` dan menulis audit `webhook.rejected` berisi provider + alasan (tanpa payload mentah).
- **Alasan:** Signature yang valid atas body lama tetap merupakan replay; `external_id` unik saja tidak menutup serangan pengulangan sebelum event pertama tercatat. AC US-12 meminta toleransi 5 menit dan audit penolakan. Tidak menyimpan payload pada jalur tolak menghindari menyimpan data penyerang yang belum terverifikasi.
- **Alternatif yang ditolak:** (a) Hanya mengandalkan keunikan `external_id` — replay sebelum insert tetap lolos. (b) Menyimpan seluruh payload penolakan — menambah permukaan data tak tepercaya. (c) Menolak tanpa audit — melanggar BR-06.
- **Konsekuensi:** Adapter provider nyata harus memetakan timestamp provider ke field `timestamp`; kontrak ini didokumentasikan di README dan diuji.

---

### D-020 — p95 authorize diukur di aplikasi; dashboard membandingkan ledger dengan cache

- **Keputusan:** Middleware `RecordAuthorizeMetrics` mencatat durasi proses `POST /api/v1/disbursements` ke tabel `request_metrics` (`route`, `status_code`, `duration_ms`, `created_at`) secara best-effort: kegagalan menulis metrik tidak pernah menggagalkan request. `GET /api/v1/admin/dashboard` (admin) mengembalikan total donasi settled, disbursement captured, refund, saldo kampanye **dari ledger**, saldo cache, jumlah mismatch ledger per kampanye, kedalaman antrean OCR (`uploaded`/`extracting`), jumlah `needs_review`, serta p95 authorize nearest-rank pada jendela 24 jam terakhir.
- **Alasan:** NFR-01 membutuhkan artefak p95 yang konkret, tetapi belum ada APM di lingkungan ini. Mengukur di middleware memberi angka yang reproducible tanpa dependensi baru. Saldo dilaporkan dari ledger dan cache secara berdampingan agar drift langsung terlihat; memakai cache saja akan menyembunyikan bug yang justru ingin dideteksi (D-006).
- **Alternatif yang ditolak:** (a) Menghitung p95 dari access log — format log tidak stabil dan mahal diparse. (b) Memakai rata-rata latency — tidak menjawab NFR p95. (c) Histogram/bucket Prometheus — berlebihan untuk MVP dan belum ada infrastrukturnya. (d) Menampilkan saldo dari `current_amount` saja — bertentangan dengan AC US-25.
- **Konsekuensi:** p95 mengukur waktu proses aplikasi (bukan jaringan end-to-end). Jendela tetap 24 jam pada MVP; retensi/pemangkasan `request_metrics` masuk Fase 8.

---

### D-021 — Notifikasi in-app ditulis langsung, email lewat queue terpisah

- **Keputusan:** Perubahan state kampanye (approve/reject/freeze/unfreeze) memanggil `CampaignNotificationService` setelah transaksi DB selesai. Service menulis baris `notifications` (channel `database`) secara sinkron dan meng-queue `CampaignStateChangedMail` lewat `Mail::to()->queue()`. Endpoint inbox: `GET /notifications` (cursor 25, filter `unread`), `POST /notifications/{id}/read`, `POST /notifications/read-all`; semua selalu di-scope ke `$request->user()`.
- **Alasan:** AC US-28 meminta **dua** artefak sekaligus: baris `notifications` dan email ter-queue. Menjadikan satu `Notification` ber-`ShouldQueue` akan menunda baris in-app sampai worker berjalan; mengirim email sinkron membuat request review bergantung pada SMTP. Memisahkan keduanya membuat inbox langsung terisi dan kegagalan email tidak membatalkan keputusan review.
- **Alternatif yang ditolak:** (a) Satu notifikasi `ShouldQueue` untuk semua channel — baris in-app tertunda dan tidak ada saat approver menerima respons. (b) Hanya email — tidak ada inbox in-app. (c) Menulis baris notifikasi di dalam transaksi review — baris bisa ada meski transaksi rollback.
- **Konsekuensi:** Notifikasi dikirim setelah commit, sehingga kegagalan pengiriman tidak me-rollback perubahan status. Email memerlukan queue worker; inbox tetap berfungsi tanpanya. Notifikasi hanya untuk pemilik kampanye; penerima lain (donatur) di luar scope MVP.

---

### D-022 — Retry webhook dengan backoff di database, DLQ di-replay admin secara idempoten

- **Keputusan:** `webhook_events` mendapat `next_attempt_at` dan `dead_lettered_at`. `WebhookEvent::markFailed()` menaikkan `attempts`; kegagalan ke-1/2/3 menjadwalkan retry pada +60/+300/+1800 detik (`AMANAH_WEBHOOK_RETRY_DELAYS`), kegagalan ke-4 memindahkan event ke `dead_letter`. `webhooks:retry` (dijadwalkan tiap menit, `withoutOverlapping`) mengambil event `failed` yang jatuh tempo dan meng-dispatch `ProcessWebhookEvent`. Admin dapat me-replay event `failed`/`dead_letter` melalui `POST /admin/webhook-events/{id}/replay`; event `processed` ditolak `409 CONFLICT_STATE`.
- **Alasan:** Jadwal retry harus bertahan terhadap restart worker, jadi disimpan di database, bukan bergantung pada `delay` job di queue. Endpoint provider tetap harus menerima event duplikat kapan pun; `handle()` tidak memproses ulang event yang sudah `failed`/`dead_letter`, sehingga pengiriman ulang provider tidak melewati backoff. Replay aman karena `DonationSettlementService::settle()` sudah idempoten per `payment_ref`.
- **Alternatif yang ditolak:** (a) Mengandalkan retry queue worker (`$tries`/`backoff`) — hitungan percobaan hilang saat queue di-flush dan tidak bisa diinspeksi. (b) Cron menghapus event setelah gagal — kehilangan payload untuk replay. (c) Replay membuat event baru — melanggar unique `external_id` dan mengaburkan jejak audit. (d) Alert DLQ via layanan eksternal — observability baru ada di Fase 8; sementara log `critical` sudah cukup sebagai sinyal.
- **Konsekuensi:** Butuh scheduler berjalan; tanpa itu retry tidak pernah dieksekusi. `attempts` di event adalah jumlah kegagalan pemrosesan, bukan jumlah pengiriman provider. Kedalaman DLQ dilaporkan lewat log `critical` ketika melewati `AMANAH_WEBHOOK_DLQ_ALERT_DEPTH` (default 1000).

---

## 2. Register Asumsi (default yang saya pakai sampai dikoreksi)
| ID | Asumsi | Default bila salah | Dampak bila berubah |
|---|---|---|---|
| A-01 | Docker Desktop + WSL2 tersedia di mesin Windows 11 | **Terkoreksi:** belum ada; dipakai MySQL/Apache Laragon native (D-010) | Struktur repo & skrip demo |
| A-02 | Bahasa/toolchain: PHP 8.3, Laravel **13.39.0**, Node 24, Python 3.12, MySQL 8.4.3 | Versi dipin saat scaffolding | Minor |
| A-03 | Versi Next.js/React **belum dipin**; akan dipin persis saat `create-next-app` dijalankan di Fase 5 | — | Fase 5 |
| A-04 | Semua nominal IDR positif; tidak ada desimal fungsional | Tetap `DECIMAL(15,2)` | Kalkulasi refund |
| A-05 | Satu tenant (satu organisasi platform), tanpa multi-org | Skema butuh `tenant_id` di hampir semua tabel | **Besar** — sebaiknya dikoreksi sebelum Fase 2 |
| A-06 | Penggalang dana adalah individu/lembaga yang sudah login; donatur boleh anonim di level tampilan | Kolom `is_anonymous` | Kecil |
| A-07 | Kampanye tidak berulang (one-off), tanpa donasi rutin/subscription | Skema `recurring_plans` | Sedang |
| A-08 | Kredensial sandbox & OCR API key belum ada | Driver `fake` aktif; `.env.example` hanya berisi placeholder | Waktu tunggu, bukan arsitektur |
| A-09 | Timezone `Asia/Jakarta`, locale `id-ID`, mata uang tunggal IDR | — | Kecil |
| A-10 | Ada 1 akun admin awal lewat seeder (bukan registrasi publik) | — | Kecil |

---

## 3. Register Risiko

| ID | Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|---|
| R-01 | Proposal menyiratkan "MCC diblokir di jaringan" padahal mode allowlist | Sedang | Reputasi & kredibilitas produk | D-002/D-003 + label eksplisit di UI dan materi demo |
| R-02 | Kredensial sandbox lama terbit → integrasi tergeser | Tinggi | Jadwal | D-004: domain selesai tanpa kredensial; adapter tinggal diisi |
| R-03 | Fokus 4 jam/hari tidak cukup untuk 8 fase penuh | Sedang | Kualitas terpotong | Urutkan ledger & disbursement lebih dulu (fase 2–3 adalah inti); frontend boleh minimal tapi benar |
| R-04 | Gesekan Docker/WSL2 di Windows (volume lambat, file watcher) | Sedang | Produktivitas harian | Volume terpisah untuk `vendor/` & `node_modules/`, polling watcher |
| R-05 | Webhook ganda / replay saat retry provider | Tinggi | Saldo dobel | Idempotency key unik di DB + signature + timestamp tolerance |
| R-06 | Nota OCR tidak terbaca (foto buram) → antrean review menumpuk | Tinggi | Operasional | Threshold confidence 0.75 + queue admin + SLA review |

---

## 4. Log Perubahan

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 2026-11-01 | Entri awal dari GATE Fase 0 |
| 1.1 | 2026-11-01 | D-009 Laravel 13, D-010 MySQL native; A-01/A-02 dikoreksi setelah verifikasi mesin |
| 1.2 | 2026-11-01 | D-011 owner akun ledger, D-012 immutability ledger; schema fase 2b selesai |
| 1.3 | 2026-11-01 | D-013 proyeksi saldo dari ledger; service settlement + fee + seeder demo (fase 2c) |
| 1.4 | 2026-11-02 | D-014 scope Idempotency-Key; HTTP layer fase 3a (Sanctum, RBAC, error envelope, request id) |
| 1.5 | 2026-11-02 | D-015 tutup kampanye + refund proporsional (US-21); fase 3 selesai |
| 1.6 | 2026-11-02 | D-016 status nota `verified` + auto-match OCR; service Flask fase 4, US-22…US-24 selesai |
| 1.7 | 2026-11-02 | D-017 freeze/unfreeze, D-018 audit viewer; US-26 dan US-27 selesai |
| 1.8 | 2026-11-02 | D-019 timestamp + audit penolakan webhook; README utama lengkap |
| 1.9 | 2026-11-02 | D-020 metrik p95 authorize + dashboard admin; US-25 selesai, Epic 6 tuntas |
