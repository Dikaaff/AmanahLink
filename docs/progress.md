# PROGRESS — AmanahLink

> **Untuk AI/engineer berikutnya:** file ini adalah satu-satunya sumber status
> eksekusi. Perbarui tabel di bawah setiap kali sebuah story selesai atau
> sebuah fase ditutup, lalu tambahkan baris di bagian "Log Verifikasi" dengan
> perintah dan hasil yang benar-benar dijalankan. Jangan menandai ✅ tanpa test
> yang membuktikannya (Definition of Done, `docs/backlog.md`).

| Field | Nilai |
|---|---|
| Terakhir diperbarui | 2026-11-02 |
| Fase selesai | Fase 0, 1, 2, 3, 4 |
| Fase berjalan | Fase 5 — frontend (MVP selesai, E2E menyusul) |
| Status gate | 29 story backend ✅; Fase 5 MVP ✅; Fase 6–8 belum ditutup |
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
| US-04 | Verifikasi email | ✅ | `tests/Feature/Api/AuthApiTest.php` |
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
| 2026-11-02 | `npm run lint` + `npm run build` (frontend) | bersih; 14 route, semuanya `ƒ (Dynamic)` |
| 2026-11-02 | `curl -D -` ke `npm run start` (frontend) | `Content-Security-Policy` ada, `X-Powered-By` hilang, `X-Frame-Options: DENY`; HTML produksi **11/11** `<script>` ber-`nonce` |
| 2026-11-02 | `composer audit` (backend) | **0 advisory** |
| 2026-11-02 | `npm audit --omit=dev` / `npm audit` (frontend) | produksi **0 kerentanan**; 16 moderate hanya di toolchain lint (`minimatch` via `eslint-config-next`) tanpa fix non-breaking |
| 2026-11-02 | `vendor/bin/pint --format agent <file yang diubah>` | bersih (hanya file terpilih karena repo tanpa Git) |

## Langkah berikutnya (berurutan)

1. Fase 5 — frontend Next.js memakai API yang sudah lengkap (termasuk inbox
   notifikasi dan panel DLQ admin).
2. Fase 6–8 — security, test suite (k6/E2E), DevOps (compose, CI, runbook,
   retensi `request_metrics`, alert DLQ nyata).
