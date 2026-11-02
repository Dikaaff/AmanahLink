# PROGRESS — AmanahLink

> **Untuk AI/engineer berikutnya:** file ini adalah satu-satunya sumber status
> eksekusi. Perbarui tabel di bawah setiap kali sebuah story selesai atau
> sebuah fase ditutup, lalu tambahkan baris di bagian "Log Verifikasi" dengan
> perintah dan hasil yang benar-benar dijalankan. Jangan menandai ✅ tanpa test
> yang membuktikannya (Definition of Done, `docs/backlog.md`).

| Field | Nilai |
|---|---|
| Terakhir diperbarui | 2026-11-03 |
| Fase selesai | Fase 0, 1, 2, 3, 4 |
| Fase berjalan | Fase 5 — frontend (MVP selesai, T-01…T-03 menutup gate) |
| Status gate | 28/29 story ✅; US-04 (verifikasi email) 🟡 belum; Fase 5–8 belum ditutup |
| Referensi | `docs/prd.md`, `docs/backlog.md`, `DECISIONS.md` |

## Ringkasan Fase

| Fase | Isi | Status |
|---|---|---|
| 0 — Discovery | PRD, backlog, keputusan arsitektur | ✅ selesai (GATE disetujui) |
| 2 — Arsitektur & Data | migration, enum, model, factory, seeder, invariant test | ✅ selesai |
| 3 — API & Ledger | US-01…US-21 (auth, kampanye, donasi, webhook, disbursement, refund) | ✅ selesai |
| 4 — OCR Service | US-22…US-24 (Flask `/extract`, upload nota, auto-match, review) | ✅ selesai |
| 5 — Frontend | halaman Next.js | 🟡 MVP selesai; security headers + CSP nonce terverifikasi, E2E pending |
| 6 — Security | hardening + ASVS checklist | 🟡 hardening berjalan; checklist penuh pending |
| 7 — Test Suite | k6, konkurensi, E2E | ⬜ belum |
| 8 — DevOps | compose, CI, observability, runbook | ⬜ belum |

## Status Story

| Story | Judul | Status | Bukti test |
|---|---|---|---|
| US-01 | Registrasi akun donatur | ✅ | `tests/Feature/Api/AuthApiTest.php` |
| US-02 | Login, token, lockout | ✅ | `tests/Feature/Api/AuthApiTest.php` |
| US-03 | RBAC & kepemilikan | ✅ | `tests/Feature/Api/CampaignApiTest.php` |
| US-04 | Verifikasi email | 🟡 **belum** — `MustVerifyEmail` dikomentari di `User`, tidak ada route verifikasi/resend, tidak ada test | — (lihat G-01) |
| US-05 | Buat kampanye draft | ✅ | `tests/Feature/Api/CampaignApiTest.php` |
| US-06 | Ajukan review | ✅ | `tests/Feature/Api/CampaignApiTest.php` |
| US-07 | Approve/reject kampanye | ✅ | `tests/Feature/Api/CampaignApiTest.php` |
| US-08 | Halaman publik kampanye | ✅ | `tests/Feature/Api/CampaignApiTest.php` |
| US-09 | Kunci edit setelah donasi settle | ✅ | `tests/Feature/Api/CampaignApiTest.php` |
| US-10 | Inisiasi donasi | ✅ | `tests/Feature/Api/DonationApiTest.php` |
| US-11 | Webhook settlement idempoten | ✅ | `tests/Feature/Api/PaymentWebhookApiTest.php`, `tests/Feature/DonationSettlementTest.php` |
| US-12 | Tolak webhook tanpa signature | ✅ | `tests/Feature/Api/PaymentWebhookApiTest.php` |
| US-13 | Riwayat donasi donatur | ✅ | `tests/Feature/Api/DonationApiTest.php` |
| US-14 | Terbitkan limit kampanye | ✅ | `tests/Feature/Api/DisbursementApiTest.php` |
| US-15 | Authorize disbursement | ✅ | `tests/Feature/Api/DisbursementApiTest.php` |
| US-16 | Tolak MCC tidak diizinkan | ✅ | `tests/Feature/Api/DisbursementApiTest.php` |
| US-17 | Tolak saldo tidak cukup | ✅ | `tests/Feature/Api/DisbursementApiTest.php` |
| US-18 | Tolak batas harian/bulanan | ✅ | `tests/Feature/Api/DisbursementApiTest.php` |
| US-19 | Tolak kampanye nonaktif / limit kedaluwarsa | ✅ | `tests/Feature/Api/DisbursementApiTest.php` |
| US-20 | Anti double-spend konkuren | ✅ | `tests/Feature/DisbursementConcurrencyTest.php` (5 proses PHP paralel), `tests/Feature/LedgerTransactionGuardTest.php` |
| US-21 | Tutup kampanye & refund sisa | ✅ | `tests/Feature/Api/CampaignClosureApiTest.php` |
| US-22 | Upload nota | ✅ | `tests/Feature/Api/ReceiptUploadApiTest.php` |
| US-23 | Auto-match hasil OCR | ✅ | `tests/Feature/Api/ReceiptOcrTest.php` |
| US-24 | Review manual & keputusan verifikator | ✅ | `tests/Feature/Api/ReceiptReviewApiTest.php` |
| US-25 | Dashboard monitoring | ✅ | `tests/Feature/Api/AdminDashboardApiTest.php` |
| US-26 | Freeze kampanye | ✅ | `tests/Feature/Api/CampaignFreezeApiTest.php` |
| US-27 | Audit log viewer | ✅ | `tests/Feature/Api/AuditLogApiTest.php` |
| US-28 | Notifikasi perubahan state | ✅ | `tests/Feature/Api/NotificationApiTest.php` |
| US-29 | Retry & dead-letter queue | ✅ | `tests/Feature/Api/WebhookRetryApiTest.php` |

## Catatan implementasi penting

- **Fase 3 (2026-11-02):** US-21 ditutup dengan `RefundService` + `POST /api/v1/campaigns/{id}/close`
  (admin). Refund proporsional dari saldo ledger `2200`, pembagian sen dengan
  largest-remainder, payout terpisah ke `1000`. Lihat `DECISIONS.md` D-015.
- **Fase 4 (2026-11-02):** `ocr-service/` (Flask) mengekspos `GET /healthz` dan
  `POST /extract` dengan kontrak JSON tetap; provider `fake` default, adapter
  `openai` aktif lewat env. Backend memakai `App\Contracts\ReceiptOcr` dengan
  driver `fake`/`http`. Alur nota: upload (202 + job) → `extracting` →
  `auto_matched` → `verified` (transaksi `reconciled`), atau `needs_review`
  untuk confidence rendah, nominal di luar 1%, merchant tidak terdaftar, dan
  timeout OCR. Lihat D-016.
- **Webhook (2026-11-02):** US-12 dilengkapi: selain signature HMAC, payload wajib
  membawa `timestamp` (ISO-8601/Unix) dengan toleransi 300 detik, dan setiap
  penolakan (signature/external id/timestamp) menulis audit `webhook.rejected`
  tanpa menyimpan payload mentah (D-019).
- **Epic 6 — dashboard (2026-11-02):** middleware mencatat durasi authorize ke
  `request_metrics` (best-effort), `GET /admin/dashboard` (admin) melaporkan
  total settled/disbursed/refund, saldo dari ledger + cache + jumlah mismatch,
  antrean OCR & `needs_review`, serta p95 nearest-rank 24 jam (D-020).
- **Epic 7 — notifikasi (2026-11-02):** perubahan state kampanye (approve, reject,
  freeze, unfreeze) menulis baris `notifications` untuk pemilik kampanye **dan**
  meng-queue `CampaignStateChangedMail`; keduanya sengaja dipisah agar antrean
  email tidak menahan inbox in-app. Endpoint `GET /notifications`,
  `POST /notifications/{id}/read`, `POST /notifications/read-all` (D-021).
- **Epic 7 — retry/DLQ (2026-11-02):** `webhook_events` mendapat
  `next_attempt_at` + `dead_lettered_at`; kegagalan ke-1/2/3 menjadwalkan retry
  +60s/+300s/+1800s, kegagalan ke-4 memindahkan event ke `dead_letter`.
  `webhooks:retry` dijadwalkan tiap menit dan meng-dispatch
  `ProcessWebhookEvent`. Admin dapat melihat event (`GET /admin/webhook-events`)
  dan me-replay event `failed`/`dead_letter` (`POST .../replay`) secara idempoten.
  Kedalaman DLQ > `AMANAH_WEBHOOK_DLQ_ALERT_DEPTH` menulis log `critical` (D-022).
- **Epic 6 — freeze/audit (2026-11-02):** freeze/unfreeze kampanye menyimpan `frozen_at` +
  `freeze_reason`, memblokir donasi/pencairan baru tanpa membatalkan transaksi
  captured, dan mengembalikan state `active`/`funded` saat unfreeze (D-017).
  Audit viewer read-only untuk staff dengan filter actor/action/tanggal, cursor
  pagination, dan route mutasi eksplisit 405 (D-018).
- Dua defect baseline diperbaiki saat menutup Fase 3: warning `use JsonException`
  di `bootstrap/app.php` (membuat semua test WARN) dan test MCC yang memakai kode
  `5812` yang tidak ada di registry (melanggar FK `merchants.mcc`).
- **NFR-02 (2026-11-02):** `amanahlink:disburse` + `Symfony\Process` menjalankan 5
  proses PHP independen (koneksi MySQL masing-masing) pada kampanye yang sama.
  Hasilnya deterministik: 3 lolos, 2 ditolak `INSUFFICIENT_FUNDS`, saldo ledger
  tidak pernah negatif. Lock order tetap: kampanye → limit.
- **Security headers:** middleware dipindah ke global `prepend` agar
  `Cache-Control` tidak ditimpa middleware di dalam grup API; test menguji
  "header mengandung `no-store`", bukan kecocokan string persis, karena Symfony
  menambahkan `private` untuk respons ber-cookie/terautentikasi.
- Test backend memakai **MySQL** (`amanahlink_test`), bukan SQLite (D-010).
  Jalankan dari folder `backend/`: `php artisan test`.
- Notifikasi email dan retry webhook butuh proses runtime: `php artisan queue:work`
  dan `php artisan schedule:work` (atau cron `schedule:run` tiap menit).
- Migration baru yang perlu dijalankan: `notifications` dan kolom retry
  `webhook_events` (`php artisan migrate`).
- Test OCR berjalan di virtualenv lokal `ocr-service/.venv` (di-gitignore):
  `.venv/Scripts/python -m pytest -q` (Windows) atau `.venv/bin/python -m pytest -q`.
- Money selalu string + `brick/math`; jangan pakai float (D-005).
- Format uang API: string desimal 2 angka (`"50000.00"`).

## Batasan yang belum diverifikasi

- `ocr-service/Dockerfile` belum pernah di-build karena Docker Desktop belum
  tersedia di mesin ini (D-010). Kontrak Flask sudah diuji dengan pytest.
- Adapter `openai` belum diuji dengan API key nyata; jalur `fake` yang diuji.
- Pengiriman email notifikasi baru diuji dengan `Mail::fake()`; belum ada SMTP
  nyata atau queue worker yang diverifikasi end-to-end.
- Alert DLQ baru berupa log `critical`; belum ada integrasi alerting.
- NFR-03/NFR-10 (availability, backup) tetap belum terverifikasi sampai staging.
- `npm audit` mencatat 16 moderate di rantai `eslint`/`minimatch` (dev-only).
  `npm audit fix` tidak menawarkan perbaikan non-breaking; `--force` akan
  menurunkan/mengganti `eslint-config-next`, jadi sementara dibiarkan dan
  dicatat. Dependensi produksi bersih.

## Log Verifikasi

| Tanggal | Perintah | Hasil |
|---|---|---|
| 2026-11-02 | `php artisan test` (backend) | **153 passed, 585 assertions**, tanpa warning/failure |
| 2026-11-02 | `php artisan test` (backend, setelah US-20 nyata) | **161 passed, 627 assertions** |
| 2026-11-02 | `tests/Feature/DisbursementConcurrencyTest.php` | 5 proses paralel, saldo 98.000, 5×30.000 → tepat 3 sukses + 2 `INSUFFICIENT_FUNDS`, saldo akhir 8.000, `ledger:verify` exit 0 |
| 2026-11-02 | `.venv/Scripts/python -m pytest -q` (ocr-service) | **8 passed** |
| 2026-11-03 | `npm run lint` + `npm run build` (frontend) | bersih; 14 route, semuanya `ƒ (Dynamic)` |
| 2026-11-03 | `curl -D -` ke `npm run start` (frontend) | `Content-Security-Policy` ada, `X-Powered-By` hilang, `X-Frame-Options: DENY`; HTML produksi **11/11** `<script>` ber-`nonce` |
| 2026-11-03 | `composer audit` (backend) | **0 advisory** || 2026-11-03 | `npm audit --omit=dev` / `npm audit` (frontend) | produksi **0 kerentanan**; 16 moderate hanya di toolchain lint (`minimatch` via `eslint-config-next`) tanpa fix non-breaking |
| 2026-11-03 | `php artisan test --compact tests/Feature/Api/MerchantApiTest.php` | **10 passed, 43 assertions** (registry merchant T-02a) |
| 2026-11-03 | `php artisan test --compact` (setelah T-02a) | **171 passed, 670 assertions** |
| 2026-11-02 | `vendor/bin/pint --format agent <file yang diubah>` | bersih |

## Kesiapan dokumen (PRD, backlog, kontrak API) — audit 2026-11-03

**Verdict:** PRD dan backlog **cukup kuat untuk inti uang** (ledger, idempotensi,
MCC, refund, state machine semuanya punya AC dan test nyata), tetapi **belum
cukup untuk dilanjutkan tanpa koreksi**: ada satu FR `M` yang tidak
diimplementasikan tetapi ditandai selesai, beberapa nama endpoint di backlog
menyimpang dari kode, dan beberapa artefak NFR yang dirujuk tidak ada. Agent
berikutnya harus memperlakukan `routes/api.php` + test sebagai sumber kebenaran
kontrak, bukan teks backlog.

Kesenjangan yang harus ditutup (ID dipakai di rencana kerja):

| ID | Kesenjangan | Bukti | Dampak | Task |
|---|---|---|---|---|
| G-01 | Verifikasi email (FR-03, US-04) tidak ada: `MustVerifyEmail` dikomentari, tanpa route/resend/test | `app/Models/User.php:5`, `routes/api.php` | FR `M` tidak terpenuhi; klaim ✅ sebelumnya salah | T-04 |
| G-02 | PRD §8 membolehkan campaigner menerbitkan limit; kode admin-only | `CampaignPolicy::manageLimits` | kontrak UI/API ambigu | T-11 |
| G-03 | Backlog menyebut `POST /disbursement/scan` dan `Idempotency-Key` wajib pada create campaign; kode memakai `/disbursements` dan tidak mewajibkan key di campaign | `routes/api.php`, `docs/backlog.md` US-05/US-15 | agent bisa membuat endpoint duplikat | T-11 |
| G-04 | Kode webhook memakai `INVALID_SIGNATURE`; PRD §9 menulis `UNAUTHENTICATED` | `PaymentWebhookService`, D-019 | test/regresi salah kode | T-11 |
| G-05 | Tidak ada penjadwal `expired` / auto-close + refund window | `routes/console.php` hanya `webhooks:retry` | status `expired` tak pernah terjadi | T-05 |
| G-06 | Tidak ada `/healthz` dan `/readyz`; hanya `/up` bawaan Laravel | `php artisan route:list --path=up` | NFR-03/NFR-09 tak bisa diverifikasi | T-06 |
| G-07 | NFR-08 retensi (log 90 jam, nota 24 jam, audit 5 tahun) belum diimplementasikan | tidak ada command/test retensi | klaim kepatuhan palsu | T-13 |
| G-08 | NFR-06 (WCAG 2.1 AA) belum diuji; tidak ada axe-core | belum ada `docs/a11y.md` | klaim aksesibilitas tak terbukti | T-14 |
| G-09 | NFR-01 (p95 < 500 ms @200 rps) belum diukur; baru metrik internal aplikasi | tidak ada k6/`docs/perf/` | target performa belum terbukti | T-09 |
| G-10 | Artefak yang dirujuk PRD tidak ada: `docs/erd.md`, `docs/security/asvs.md`, `docs/runbook.md`, `docs/a11y.md`, `docs/perf/scan-p95.md`, `IdempotencyTest.php`, `RetentionTest.php`, `tests/Concurrency/` | `docs/prd.md` §5 | traceability NFR putus | T-11, T-13 |
| G-11 | Q-01…Q-04 di PRD masih "terbuka" padahal sudah diputuskan di `DECISIONS.md` | `docs/prd.md` §12, D-005/D-015 | agent bisa memutus ulang | T-11 |
| G-12 | FR-08 menyebut VA **dan QRIS**; `PaymentInstruction` hanya VA | `PaymentGateway`/`FakePaymentGateway` | ekspektasi demo meleset | T-11 |
| G-13 | Token Sanctum disimpan di `localStorage`; CSP nonce sudah aktif tetapi risiko XSS residual tetap ada | `frontend/src/lib/api.ts` | pencurian token bila XSS lolos | T-07 |
| G-14 | A-05 single-tenant masih asumsi, bukan keputusan eksplisit | `DECISIONS.md` A-05 | skema sulit diubah bila multi-org | T-11 (terima/tolak) |
| G-15 | Registry merchant tidak punya API/UI; campaigner harus mengetik ID merchant (seed saja) | `routes/api.php` tidak punya route merchant; `dashboard/page.tsx:537` | demo & pemakaian nyata rapuh; PRD §8 "kelola merchant" tak terpenuhi | T-02 |
| G-16 | Form limit disbursement tampil di dashboard campaigner, tetapi API `manageLimits` admin-only | `dashboard/page.tsx`, `CampaignPolicy::manageLimits` | campaigner mendapat 403 dari UI sendiri | T-02 |

## Protokol handoff untuk agent berikutnya

1. **Baca berurutan:** `docs/progress.md` → `DECISIONS.md` → `docs/prd.md` →
   `docs/backlog.md` → `routes/api.php` + test. Bila dokumen bertentangan
   dengan kode, **kode + test menang** sampai T-11 menyinkronkan dokumen.
2. **Satu task = satu commit + satu push.** Setelah selesai: jalankan bukti,
   perbarui tabel Status Story / Log Verifikasi di file ini **dalam commit yang
   sama**, lalu `git push origin main`. Jangan menandai ✅ tanpa output perintah.
3. **Jangan mengerjakan dua fase sekaligus.** Setiap akhir fase = GATE: tulis
   ringkasan + bukti, berhenti, tunggu persetujuan manusia.
4. **Jangan menambah dependency baru** tanpa mencatatnya di `DECISIONS.md`
   (versi persis, alasan, alternatif).
5. **Backend dan frontend bisa dikerjakan paralel hanya bila file tidak
   bersinggungan.** Frontend dev server bersifat tunggal per folder (lihat
   jebakan di bawah) — koordinasikan sebelum restart.
6. **Bahasa:** kode/komentar/commit message ringkas dalam Inggris atau
   Indonesia konsisten dengan repo; dokumen dan penjelasan ke manusia dalam
   Bahasa Indonesia. Jangan memakai float untuk uang (D-005).

### Jebakan lingkungan (Windows 11, tanpa Docker)

- **MySQL Laragon sering mati sendiri.** Nyalakan lewat Laragon → Start All,
  atau `mysqld --defaults-file=...` lalu tunggu ±8 detik. Semua perintah
  `artisan` dan test akan gagal bila MySQL mati; cek dulu sebelum menyimpulkan
  kode bermasalah.
- **Composer tidak ada di PATH:** `php C:\laragon\bin\composer\composer.phar …`.
- **Hanya satu `next dev` per folder.** Menjalankan `npm run dev` kedua hanya
  mencetak "Another next dev server is already running" lalu keluar. Hentikan
  proses lama (PID dari pesan itu) sebelum memulai ulang; jangan menjalankan
  `next dev` dan `next start` bersamaan pada folder yang sama.
- **PowerShell 5.1 merusak UTF-8** bila memakai `Get-Content … | Set-Content`.
  Gunakan tool editor (bukan shell) untuk mengubah file berisi `—`, `→`, emoji.
- **Jangan pakai `git status` dari dalam `backend/`** untuk menilai perubahan;
  jalankan dari root repo.
- **`next dev` menulis ulang blok di `frontend/AGENTS.md`.** Commit blok itu
  bersama perubahan agar working tree bersih.

### Perintah verifikasi cepat (wajib sebelum push)

```powershell
# backend
cd backend
php artisan test            # suite penuh, MySQL amanahlink_test
vendor/bin/pint             # gaya kode
php artisan ledger:verify   # invariant ledger

# frontend
cd frontend
npm run lint
npm run build
# cek header + nonce (server start pada port lain, lalu)
curl.exe -s -D - -o NUL http://127.0.0.1:3000/login

# ocr
cd ocr-service
.venv\Scripts\python -m pytest -q
```

## Rencana kerja (task terstruktur)

Urutan ini **mengikat**: task berikutnya baru dimulai setelah task sebelumnya
selesai + bukti dicatat. Estimasi dalam jam kerja manusia, bukan janji.

### Fase 5 — menutup frontend (GATE 5)

| ID | Task | Estimasi | Bukti/DoD |
|---|---|---|---|
| T-01 | Peta UI↔API: daftar halaman yang ada vs aksi API yang belum punya layar (donasi, riwayat donasi, limit & disbursement, upload/review nota, close/refund, freeze) | 1h | ✅ **selesai 2026-11-03** — hasil di §T-01 |
| T-02 | Implementasikan layar yang kurang dengan fetch API asli (tanpa placeholder), termasuk state loading/error/empty, guard role, dan perbaikan G-15/G-16 | 8h | `npm run lint` + `npm run build`; setiap layar memanggil endpoint nyata |
| T-03 | Skrip E2E manual (langkah + data seed) dan jalankan sekali dari UI ke backend: register → campaign → donate → webhook fake → disburse → receipt → review → close/refund | 2h | tabel hasil per langkah + screenshot/response; **GATE 5** |

### Fase 6 — security & kepatuhan (GATE 6)

| ID | Task | Estimasi | Bukti/DoD |
|---|---|---|---|
| T-04 | Verifikasi email end-to-end (G-01): aktifkan `MustVerifyEmail`, route signed verify + resend, gate aksi sensitif (`EMAIL_UNVERIFIED`), test 3 skenario, banner UI | 4h | test baru di `AuthApiTest` + `CampaignApiTest`; FR-03 ✅ |
| T-05 | Penjadwal siklus: tandai `expired` saat deadline lewat, buka refund window, auto-close + refund, retensi `request_metrics` (G-05) | 4h | command + test; `routes/console.php` diperbarui |
| T-06 | `/healthz` (liveness) dan `/readyz` (DB + queue + OCR reachability) (G-06) | 2h | test feature; contoh output di README |
| T-07 | `docs/security/asvs.md`: checklist ASVS L2 subset dengan status + bukti per item; perbaiki temuan (CORS, rate limit per route, redaksi log, validasi upload, kebijakan token G-13) | 6h | dokumen + test untuk setiap perbaikan |
| T-11 | Sinkronisasi kontrak: PRD §8/§9/§12, backlog endpoint & AC, `DECISIONS.md` D-024… (G-02, G-03, G-04, G-11, G-12, G-14), buat `docs/erd.md` (G-10) | 3h | dokumen konsisten; tidak ada AC yang menyebut endpoint fiktif |

### Fase 7 — test suite (GATE 7)

| ID | Task | Estimasi | Bukti/DoD |
|---|---|---|---|
| T-08 | Playwright: alur kritis end-to-end terhadap stack lokal (butuh unduh browser) | 8h | `npm run e2e` hijau; artefak trace |
| T-09 | k6 authorize: 2 menit, target 200 rps, hitung query per request; tulis `docs/perf/scan-p95.md` (G-09) | 4h | hasil p95 + grafik/angka |
| T-10 | Perluas uji konkurensi (di luar 5 proses) atau dokumentasikan batas bukti saat ini | 2h | hasil + catatan batas |

### Fase 8 — DevOps (GATE 8)

| ID | Task | Estimasi | Bukti/DoD |
|---|---|---|---|
| T-12 | `docker-compose.yml`: mysql, api, queue, scheduler, ocr, web + healthcheck + volume | 5h | `docker compose up` (butuh Docker di mesin lain/CI) |
| T-13 | CI GitHub Actions: php test + pint + `composer audit`, es lint/build/audit, pytest, (opsional) k6 smoke; retensi sesuai NFR-08 | 4h | workflow hijau di PR |
| T-14 | Observability + `docs/runbook.md` + drill backup/restore + axe-core (G-08, G-10) | 6h | runbook + hasil drill + laporan a11y |

**Total sisa ± 51 jam** (≈13 sesi 4 jam), belum termasuk perbaikan yang muncul
saat E2E/security review.

## T-01 — Peta UI ↔ API (2026-11-03)

Hasil audit `frontend/src/app/**` + `src/lib/api.ts` terhadap `routes/api.php`.
Kesimpulan: **UI MVP sudah menutupi hampir semua endpoint**, bukan "belum ada
frontend". Yang kurang adalah dua hal fungsional (registry merchant, guard form
limit) dan beberapa state/UX.

| Aksi | Endpoint | Layar | Status |
|---|---|---|---|
| Register / login / logout / me | `/auth/*` | `/register`, `/login`, nav + `auth-provider` | ✅ |
| Feed kampanye publik | `GET /campaigns` | `/` | ✅ |
| Detail + progress + label MCC | `GET /campaigns/{slug}` | `/campaigns/[slug]` | ✅ |
| Donasi + instruksi VA | `POST /donations` | form di `/campaigns/[slug]` | ✅ (tanpa tombol simulasi bayar) |
| Riwayat donasi sendiri | `GET /donations` | `/dashboard` | ✅ |
| Kampanye milik sendiri | `GET /campaigns/mine` | `/dashboard` | ✅ |
| Buat / edit draft | `POST /campaigns`, `PUT /campaigns/{id}` | `/dashboard/new`, `/dashboard/campaigns/[slug]/edit` | ✅ |
| Ajukan review | `POST /campaigns/{id}/submit` | `/dashboard` | ✅ |
| Review queue + approve/reject | `GET /campaigns/review-queue`, `POST .../review` | `/admin/campaigns` | ✅ |
| Freeze / unfreeze / close | `POST .../freeze`, `.../unfreeze`, `.../close` | `/admin/campaigns` | ✅ |
| Atur limit disbursement | `PUT /campaigns/{id}/disbursement-limit` | form di `/dashboard` | ⚠️ G-16 (form tampil untuk campaigner, API admin-only) |
| Authorize disbursement | `POST /disbursements` | form di `/dashboard` | ⚠️ G-15 (merchant ID diketik manual) |
| Riwayat disbursement | `GET /disbursements` | `/dashboard` | ✅ |
| Upload nota | `POST /disbursements/{id}/receipts` | `/dashboard` | ✅ |
| Review nota | `GET /receipts`, `POST /receipts/{id}/review` | `/admin/receipts` | ✅ |
| Notifikasi | `/notifications*` | `/notifications` | ✅ |
| Audit log | `GET /audit-logs` | `/admin/audit-logs` | ✅ |
| Webhook events + replay | `/admin/webhook-events*` | `/admin/webhooks` | ✅ |
| Dashboard admin | `GET /admin/dashboard` | `/admin` | ✅ |
| Registry merchant | — (tidak ada route) | — | ❌ G-15 |
| Verifikasi email | — (tidak ada route) | — | ❌ G-01 |

**Rincian T-02 (urutan kerja):**

1. **T-02a — Registry merchant (backend):** ✅ **selesai 2026-11-03** —
   `MerchantController` (`GET/POST /merchants`, `PUT /merchants/{id}`,
   `PATCH /merchants/{id}/verify`), `MerchantPolicy`, `MerchantResource`
   (field internal `mid`/`verified_at` hanya admin), validasi MCC aktif &
   tidak diblokir, audit `merchant.created/updated/verified`, 10 test di
   `tests/Feature/Api/MerchantApiTest.php`. Lanjut ke T-02b.
2. **T-02b — Pemilih merchant di UI:** ganti input ID manual dengan `<select>`
   dari `GET /merchants`; tampilkan MCC + kategori + status verifikasi.
3. **T-02c — Guard limit (D-024):** tambahkan `GET /campaigns/{id}/disbursement-limit`
   (pemilik + admin) dan sembunyikan form edit untuk non-admin; tampilkan sisa
   limit read-only. Test: campaigner GET 200, campaigner PUT 403, admin PUT 200.
4. **T-02d — Status nota campaigner:** daftar nota per disbursement (status,
   confidence, alasan reject) agar campaigner tahu harus upload ulang.
5. **T-02e — State kosong/error:** pastikan setiap layar punya empty state dan
   tombol retry; jangan ada teks placeholder.

## Langkah berikutnya (ringkas)

1. **T-02a/T-02b** (registry merchant + pemilihnya) → **T-02c** (keputusan
   limit) → **T-02d/T-02e** → **T-03** (E2E manual) → GATE 5.
2. **T-04** verifikasi email (FR-03 satu-satunya FR `M` yang belum ada).
3. **T-07** ASVS + **T-11** sinkronisasi dokumen sebelum menyentuh Fase 7.

