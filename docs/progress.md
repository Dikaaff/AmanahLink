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
| Fase berjalan | Epic 6 — tersisa US-25 (dashboard monitoring) |
| Status gate | Fase 4 ditutup; Epic 6 hampir selesai (US-26, US-27 ✅) |
| Referensi | `docs/prd.md`, `docs/backlog.md`, `DECISIONS.md` |

## Ringkasan Fase

| Fase | Isi | Status |
|---|---|---|
| 0 — Discovery | PRD, backlog, keputusan arsitektur | ✅ selesai (GATE disetujui) |
| 2 — Arsitektur & Data | migration, enum, model, factory, seeder, invariant test | ✅ selesai |
| 3 — API & Ledger | US-01…US-21 (auth, kampanye, donasi, webhook, disbursement, refund) | ✅ selesai |
| 4 — OCR Service | US-22…US-24 (Flask `/extract`, upload nota, auto-match, review) | ✅ selesai |
| 5 — Frontend | halaman Next.js | ⬜ belum — tunggu US-25 & Epic 7 |
| 6 — Security | hardening + ASVS checklist | ⬜ belum |
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
| US-20 | Anti double-spend konkuren | ✅ | `tests/Feature/LedgerTransactionGuardTest.php` (lock + invariant) |
| US-21 | Tutup kampanye & refund sisa | ✅ | `tests/Feature/Api/CampaignClosureApiTest.php` |
| US-22 | Upload nota | ✅ | `tests/Feature/Api/ReceiptUploadApiTest.php` |
| US-23 | Auto-match hasil OCR | ✅ | `tests/Feature/Api/ReceiptOcrTest.php` |
| US-24 | Review manual & keputusan verifikator | ✅ | `tests/Feature/Api/ReceiptReviewApiTest.php` |
| US-25 | Dashboard monitoring | ⬜ | — |
| US-26 | Freeze kampanye | ✅ | `tests/Feature/Api/CampaignFreezeApiTest.php` |
| US-27 | Audit log viewer | ✅ | `tests/Feature/Api/AuditLogApiTest.php` |
| US-28 | Notifikasi perubahan state | ⬜ | — |
| US-29 | Retry & dead-letter queue | ⬜ | — |

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
- **Epic 6 (2026-11-02):** freeze/unfreeze kampanye menyimpan `frozen_at` +
  `freeze_reason`, memblokir donasi/pencairan baru tanpa membatalkan transaksi
  captured, dan mengembalikan state `active`/`funded` saat unfreeze (D-017).
  Audit viewer read-only untuk staff dengan filter actor/action/tanggal, cursor
  pagination, dan route mutasi eksplisit 405 (D-018).
- Dua defect baseline diperbaiki saat menutup Fase 3: warning `use JsonException`
  di `bootstrap/app.php` (membuat semua test WARN) dan test MCC yang memakai kode
  `5812` yang tidak ada di registry (melanggar FK `merchants.mcc`).
- Test backend memakai **MySQL** (`amanahlink_test`), bukan SQLite (D-010).
  Jalankan dari folder `backend/`: `php artisan test`.
- Test OCR berjalan di virtualenv lokal `ocr-service/.venv` (di-gitignore):
  `.venv/Scripts/python -m pytest -q` (Windows) atau `.venv/bin/python -m pytest -q`.
- Money selalu string + `brick/math`; jangan pakai float (D-005).
- Format uang API: string desimal 2 angka (`"50000.00"`).

## Batasan yang belum diverifikasi

- `ocr-service/Dockerfile` belum pernah di-build karena Docker Desktop belum
  tersedia di mesin ini (D-010). Kontrak Flask sudah diuji dengan pytest.
- Adapter `openai` belum diuji dengan API key nyata; jalur `fake` yang diuji.
- NFR-03/NFR-10 (availability, backup) tetap belum terverifikasi sampai staging.

## Log Verifikasi

| Tanggal | Perintah | Hasil |
|---|---|---|
| 2026-11-02 | `php artisan test` (backend) | **138 passed, 490 assertions**, tanpa warning/failure |
| 2026-11-02 | `.venv/Scripts/python -m pytest -q` (ocr-service) | **8 passed** |
| 2026-11-02 | `vendor/bin/pint --format agent <file yang diubah>` | bersih (hanya file terpilih karena repo tanpa Git) |

## Langkah berikutnya (berurutan)

1. Epic 6 — `GET /admin/dashboard` (US-25). Perlu metrik latency authorize
   (p95) yang saat ini belum dicatat; tambahkan pencatatan durasi request
   disbursement sebelum membangun endpoint dashboard.
2. Epic 7 — notifikasi (US-28) dan retry/DLQ webhook (US-29).
3. Fase 5 — frontend Next.js memakai API yang sudah lengkap.
4. Fase 6–8 — security, test suite (k6/E2E), DevOps (compose, CI, runbook).
