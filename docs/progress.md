# PROGRESS — AmanahLink

> **Untuk AI/engineer berikutnya:** file ini adalah satu-satunya sumber status
> eksekusi. Perbarui tabel di bawah setiap kali sebuah story selesai atau
> sebuah fase ditutup, lalu tambahkan baris di bagian "Log Verifikasi" dengan
> perintah dan hasil yang benar-benar dijalankan. Jangan menandai ✅ tanpa test
> yang membuktikannya (Definition of Done, `docs/backlog.md`).

| Field | Nilai |
|---|---|
| Terakhir diperbarui | 2026-11-06 |
| Fase selesai | Fase 0, 1, 2, 3, 4, 6, 7, 8 (7/8 dengan catatan D-028) |
| Fase berjalan | Fase 5 — implementasi + bukti screenshot selesai; menunggu persetujuan GATE 5. Bukti tertunda: T-09 performa & T-12 Docker (butuh staging/Docker) |
| Status gate | 29/29 story ✅; GATE 7/8 disetujui 2026-11-04 dengan catatan; **GATE 5 menunggu persetujuan** |
| Referensi | `docs/prd.md`, `docs/backlog.md`, `DECISIONS.md` |

## Ringkasan Fase

| Fase | Isi | Status |
|---|---|---|
| 0 — Discovery | PRD, backlog, keputusan arsitektur | ✅ selesai (GATE disetujui) |
| 2 — Arsitektur & Data | migration, enum, model, factory, seeder, invariant test | ✅ selesai |
| 3 — API & Ledger | US-01…US-21 (auth, kampanye, donasi, webhook, disbursement, refund) | ✅ selesai |
| 4 — OCR Service | US-22…US-24 (Flask `/extract`, upload nota, auto-match, review) | ✅ selesai |
| 5 — Frontend | halaman Next.js | 🟡 MVP + P5 mobile core + bukti screenshot 390/1440 tersedia; **menunggu GATE 5** |
| 6 — Security | hardening + ASVS checklist | ✅ T-04…T-07 selesai; subset ASVS dan sinkronisasi kontrak tersedia |
| 7 — Test Suite | k6, konkurensi, E2E | ✅ GATE disetujui 2026-11-04 — T-08/T-10 lulus; T-09 instrumen siap, target 200 rps tertunda (D-028) |
| 8 — DevOps | compose, CI, observability, runbook | ✅ GATE disetujui 2026-11-04 — T-13/T-14 lulus, CI hijau; eksekusi T-12 tertunda (D-028) |

## Status Story

| Story | Judul | Status | Bukti test |
|---|---|---|---|
| US-01 | Registrasi akun donatur | ✅ | `tests/Feature/Api/AuthApiTest.php` |
| US-02 | Login, token, lockout | ✅ | `tests/Feature/Api/AuthApiTest.php` |
| US-03 | RBAC & kepemilikan | ✅ | `tests/Feature/Api/CampaignApiTest.php` |
| US-04 | Verifikasi email | ✅ — signed verify + resend, guard `EMAIL_UNVERIFIED`, banner dashboard, dan test end-to-end | `tests/Feature/Api/AuthApiTest.php`, `tests/Feature/Api/CampaignApiTest.php` |
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
| 2026-11-03 | `composer audit` (backend) | **0 advisory** |
| 2026-11-03 | `npm audit --omit=dev` / `npm audit` (frontend) | produksi **0 kerentanan**; 16 moderate hanya di toolchain lint (`minimatch` via `eslint-config-next`) tanpa fix non-breaking |
| 2026-11-03 | `php artisan test --compact tests/Feature/Api/MerchantApiTest.php` | **10 passed, 43 assertions** (registry merchant T-02a) |
| 2026-11-03 | `php artisan test --compact` (setelah T-02a) | **171 passed, 670 assertions** |
| 2026-11-03 | smoke API + `npm run lint`/`build` (T-02b) | campaigner `GET /merchants` → 2 merchant tanpa `mid`; admin → `mid` ada; lint/build bersih |
| 2026-11-03 | `npm run lint` + `npx tsc --noEmit` + `npm run build` (P4 components) | lint/typecheck/build bersih; `/design/components`, `/design/type`, `/design/tokens` ter-build; 17 route dan Proxy terdeteksi |
| 2026-11-03 | `npm run lint` + `npx tsc --noEmit` + `npm run build` (P5 mobile core) | lint/typecheck/build bersih; mobile bottom nav, sticky CTA detail, dan mobile card lists ter-build |
| 2026-11-04 | `npx playwright test tests/e2e/screenshots.spec.ts` (bukti Fase 5) | **3 passed**; 5 PNG di `docs/e2e/screenshots/` — `feed` 1440×940 & 390×1157, `login` 390×1152, `dashboard` 1440×3677 & 390×5973; `npm run lint` bersih |
| 2026-11-03 | `php artisan test --compact tests/Feature/Api/AuthApiTest.php` + `CampaignApiTest.php` (T-04) | **27 passed, 105+ assertions**; registration sends verification, resend/verify works, unverified campaign creation returns `EMAIL_UNVERIFIED`, verified campaigner can create draft |
| 2026-11-03 | `php artisan test --compact tests/Feature/CampaignCycleTest.php` (T-05) | **4 passed, 14 assertions**; expiry + audit, refund after 7-day window, no early refund, request-metrics retention |
| 2026-11-03 | `php artisan test --compact tests/Feature/HealthCheckTest.php` (T-06) | **4 passed, 26 assertions**; liveness, readiness sehat, OCR gagal, dan queue gagal |
| 2026-11-03 | `php artisan test --compact tests/Unit/RedactSensitiveDataProcessorTest.php tests/Feature/SecurityHardeningTest.php tests/Feature/Api/ReceiptUploadApiTest.php` (T-07) | **9 passed, 57 assertions**; CORS allowlist, named rate limit, log redaction, dan MIME-content upload validation |
| 2026-11-03 | `php artisan test --compact` + `php artisan ledger:verify` + `composer audit` + frontend lint/typecheck/build + `npm audit --omit=dev` (T-07) | **193 passed, 778 assertions**; ledger invariant lulus, composer/npm production audit 0 vulnerability, lint/typecheck/build bersih |
| 2026-11-03 | audit route/migration terhadap PRD, backlog, README, dan `DECISIONS.md` (T-11) | Kontrak diselaraskan; `docs/erd.md` ditambahkan; tidak ada perubahan runtime |
| 2026-11-04 | `npm run e2e` (T-08) | **2 passed**; login campaigner → dashboard dan register donor → dashboard + warning verifikasi email; Playwright report/trace configured |
| 2026-11-04 | k6 bounded authorize smoke (T-09) | **46 requests, 100% sukses, 29 query/request** pada `RATE=5,DURATION=10s`; p95 **17.32s**, 8 dropped karena single-process `artisan serve`; target 200 rps belum diklaim |
| 2026-11-04 | `php artisan test --compact tests/Feature/DisbursementConcurrencyTest.php` (T-10) | **1 passed**; 20 proses PHP/MySQL paralel, 3 sukses + 17 `INSUFFICIENT_FUNDS`, saldo akhir 8.000, 3 transaksi, `ledger:verify` exit 0 |
| 2026-11-03 | smoke API (T-02c) | campaigner `GET /campaigns/{id}/disbursement-limit` → `daily=5000000.00`, `used_today=0.00`; campaigner `PUT` → 403 `FORBIDDEN` |
| 2026-11-03 | `php artisan test --compact tests/Feature/Api/ReceiptReviewApiTest.php tests/Feature/Api/ReceiptUploadApiTest.php` (T-02d) | **11 passed, 53 assertions** |
| 2026-11-03 | `vendor/bin/pint --test` (4 file T-02d) | bersih |
| 2026-11-03 | `npm run lint` + `npm run build` (panel status nota) | lint bersih; build 14 route `ƒ (Dynamic)` |
| 2026-11-03 | `npm run lint` + `npm run build` (T-02e, state kosong/error) | lint bersih; build sukses, 14 route `ƒ (Dynamic)` |
| 2026-11-03 | `bash scripts/e2e-manual.sh` (T-03, backend `QUEUE_CONNECTION=sync`, OCR fake) | **43 PASS, 0 FAIL** — register→approve→donasi→webhook→disburse→nota→review→refund; rincian `docs/e2e/gate5-run-2026-11-03.md` |
| 2026-11-04 | `php artisan test --compact tests/Feature/RetentionTest.php` (T-13) | **4 passed, 15 assertions** — log >90 jam, audit >5 tahun, gambar nota terminal >24 jam, dan `--dry-run` |
| 2026-11-04 | `php artisan test --compact` (T-13, setelah ReceiptPolicy scoped) | **198 passed, 811 assertions** |
| 2026-11-04 | `ocr-service\.venv\Scripts\python.exe -m pytest -q` | **8 passed** |
| 2026-11-04 | validasi YAML `.github/workflows/ci.yml` dengan PyYAML | `yaml ok` (eksekusi workflow menunggu push ke GitHub) |
| 2026-11-04 | `npx playwright test tests/e2e/a11y.spec.ts` (T-14, `@axe-core/playwright` 4.14.0) | **4 passed**; `/`, `/login`, `/register`, `/dashboard` → **0 violations** WCAG 2.1 A/AA |
| 2026-11-04 | drill backup/restore MySQL (T-14) | dump 93.956 byte; restore exit 0; baris `users/campaigns/transactions/ledger_entries/audit_logs` = 8/1/52/104/50 (identik); `ledger:verify` exit 0; delete ledger ditolak trigger (ERROR 1644) |
| 2026-11-04 | validasi YAML `docker-compose.yml` (T-12) dengan PyYAML | `compose yaml ok`; service `api/mysql/ocr/queue/scheduler/web`; volume `mysql-data`/`backend-storage`; eksekusi compose belum dilakukan |
| 2026-11-04 | GitHub Actions run #5 (`8c87eaa`, push) | **success** — job Backend, Frontend, dan OCR semuanya lulus (pint, 198 test, composer audit; lint/build/npm audit; 8 pytest) |
| 2026-11-04 | penyebab CI run #1–#4 gagal | `backend/.env.example` berisi baris tidak valid `[TEMPLATE]` sehingga `php artisan key:generate` gagal; `pytest` tanpa `pythonpath` tidak bisa `import app`. Diperbaiki di `8c87eaa` (+ `ocr-service/pytest.ini`) |
| 2026-11-04 | demo settlement donor, notifikasi, dan loading state UI | backend `DonationSimulationTest` 3 passed / 11 assertions; API donor: donation 11 `settled`, saldo kampanye 734.952 -> 832.952 (+98.000 net); notifikasi `donation_settled` unread; `npm run lint` + `npx tsc --noEmit` bersih; E2E `donation-demo.spec.ts` 1 passed |
| 2026-11-04 | persetujuan GATE 7/8 oleh manusia | **disetujui dengan catatan** — T-09 (perf target) dan T-12 (eksekusi Docker) tetap tertunda; dicatat sebagai D-028 |
| 2026-11-04 | P1 functional UX v5.0 | `Sheet`, `Dialog`, `AlertDialog`, `Skeleton`, Sonner, `Progress` terpasang dengan token v4.0; `UX_DECISIONS.md` UX-01…UX-06; lint/typecheck/build bersih; E2E `primitives.spec.ts` 1 passed; commit `ff7864f` |
| 2026-11-04 | P2 loading v5.0 | skeleton L04/L09/L19 mengikuti DOM akhir; CLS L04 **0.0006**, L09/L19 **0.0001** (target <0.02); viewport 390 tanpa overflow horizontal; lint/typecheck/build bersih; L10 ditunda karena belum ada route/endpoint detail (UX-07) |
| 2026-11-04 | P6 mobile secondary v5.0 (L11/L12/L16/L17/L19 @390) | `npx playwright test tests/e2e/p6-secondary.spec.ts` → **7 passed**; dasbor (statistik, kartu limit read-only, riwayat), form draf (simpan + error inline), form pencairan (hasil `captured` dan penolakan MCC), serta pagination riwayat pemakaian berjalan di 390 tanpa overflow; L17 kini route `/dashboard/simulasi` yang memanggil `POST /disbursements/simulate` (dry-run read-only, UX-09); 5 screenshot 390 di `docs/e2e/screenshots/`; backend `DisbursementApiTest` **24 passed, 89 assertions**; `npm run lint` + `npx tsc --noEmit` bersih |
| 2026-11-06 | P4/P5 defect fixes + P6 audit | `npm run lint` dan `npx tsc --noEmit --pretty false` **lulus**; perbaikan sesi berakhir, rollback/filter notifikasi, replay DLQ, empty state, numeric cells, error mapping, upload timeout, dan reduced-motion dicatat di `docs/design/P6-audit.md`; targeted P4/P5 E2E belum dapat ditutup karena Docker tidak tersedia, backend lokal mengarah ke MySQL, dan SQLite snapshot tertinggal dari migration terbaru |
| 2026-11-04 | P7 admin v5.0 (/admin, campaigns, receipts, audit-logs, webhooks @768/1440) | `npx playwright test tests/e2e/p7-admin.spec.ts` → **2 passed**; nav admin sebelumnya meluber **217px** di 768 karena semua tautan dipaksa satu baris, diperbaiki dengan `flex-wrap` + nama pengguna disembunyikan di bawah `lg` (UX-10); kedua viewport tanpa overflow |
| 2026-11-04 | P3 ketahanan v5.0 (L04/L09/L19) | `npx playwright test tests/e2e/resilience.spec.ts` → **7 passed**; 50 baris + judul 60 karakter tanpa spasi + Rp999.999.999 tanpa overflow di 320/384/390/768 (sebelum perbaikan judul meluber 592px pada 320); semua tab stop punya ring **2px offset 2px** warna ink; wordmark nav `sr-only` di bawah 360; `npm run lint` + `npx tsc --noEmit` bersih |
| 2026-11-03 | `npm run lint` + `npm run build` (P2 type specimen) | lint bersih; build sukses, 15 route termasuk `ƒ /design/type`; CSS memuat 2 `@font-face` Geist |
| 2026-11-03 | Chrome headless `/design/type` (P2) | tangkapan 512 dan 1440; `innerWidth=512` saat diminta 390 (batas tool dicatat di `P2-type-specimen.md` §5) |
| 2026-11-02 | `vendor/bin/pint --format agent <file yang diubah>` | bersih |
| 2026-11-05 | verifikasi batch UX ketahanan (error boundary, `/offline`+`/maintenance`, komponen bersama) | `php artisan test --compact` **206 passed, 846 assertions**; `ledger:verify` (MySQL `amanahlink`) exit 0 — 62 transaksi, 4 saldo kampanye; frontend lint/tsc/build bersih (19 route termasuk `/offline` & `/maintenance`); pytest OCR **8 passed**; satu type error `ordered-table.tsx` (prop `align` dikirim ke `TdNumeric` yang bertipe `HTMLAttributes`) diperbaiki dengan `className` |
| 2026-11-05 | pembersihan artefak backend | 4 migration stub kosong `2026_11_04_*` (duplikat migration `0001_01_01_*` / `2026_11_01_*` yang sudah ada) serta `create_databases.php` + `test_db.php` (syntax rusak `\$pdo`, kredensial hardcoded) dihapus; `start_backend.bat` dipertahankan sebagai helper dev |
| 2026-11-05 | P3 form/overlay v5.0 | `npx playwright test tests/e2e/forms-p3.spec.ts tests/e2e/donation-demo.spec.ts tests/e2e/p6-secondary.spec.ts tests/e2e/p7-admin.spec.ts` -> **17 passed**; `DonationSheet` terpasang di detail kampanye, form limit/pencairan/upload nota dan aksi alasan admin memakai `FormOverlay`; `FormOverlay` memiliki tombol tutup sendiri agar dirty guard tidak terlewati; `window.confirm` di admin diganti `ConfirmDialog`; `npm run lint` + `npx tsc --noEmit` + `npm run build` bersih; UX-11 dicatat |

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
| G-01 | Verifikasi email (FR-03, US-04) tidak ada: `MustVerifyEmail` dikomentari, tanpa route/resend/test | **ditutup T-04** — `User` kini `MustVerifyEmail`, signed verify + resend tersedia, guard dan test aktif | — | ✅ T-04 |
| G-02 | PRD §8 membolehkan campaigner menerbitkan limit; kode admin-only | **ditutup T-11** — PRD/README membedakan admin PUT dan owner/admin GET | — | ✅ T-11 |
| G-03 | Backlog menyebut `POST /disbursement/scan` dan `Idempotency-Key` wajib pada create campaign; kode memakai `/disbursements` dan tidak mewajibkan key di campaign | **ditutup T-11** — backlog/README mengikuti route aktual; key hanya wajib pada donation/disbursement | — | ✅ T-11 |
| G-04 | Kode webhook memakai `INVALID_SIGNATURE`; PRD §9 menulis `UNAUTHENTICATED` | **ditutup T-11** — katalog PRD/backlog mengikuti `INVALID_SIGNATURE` aktual | — | ✅ T-11 |
| G-05 | Tidak ada penjadwal `expired` / auto-close + refund window | **ditutup T-05** — `amanah:campaign-cycle` menandai `active/funded → expired`, auto-refund setelah 7 hari, dan mencatat audit | — | ✅ T-05 |
| G-06 | Tidak ada `/healthz` dan `/readyz`; hanya `/up` bawaan Laravel | **ditutup T-06** — liveness `/healthz`; readiness `/readyz` memeriksa database, queue, dan OCR dengan HTTP `503` saat dependency gagal | — | ✅ T-06 |
| G-07 | NFR-08 retensi (log 90 jam, nota 24 jam, audit 5 tahun) belum diimplementasikan | **ditutup T-13** — `amanah:retention` (jadwal harian 02:15, `--dry-run`) menghapus log >90 jam, audit >5 tahun, dan gambar nota terminal >24 jam; `RetentionTest` 4 passed | — | ✅ T-13 |
| G-08 | NFR-06 (WCAG 2.1 AA) belum diuji; tidak ada axe-core | **ditutup T-14** — `@axe-core/playwright` 4.14.0 memindai `/`, `/login`, `/register`, `/dashboard`; 4 test lulus dengan **0 violations**; batas bukti di `docs/a11y.md` | — | ✅ T-14 |
| G-09 | NFR-01 (p95 < 500 ms @200 rps) belum terukur pada full workload | **ditutup sebagian T-09** — k6 script + query-count instrumentation + reproducible runbook tersedia; full 200 rps × 2 menit masih pending | target performa belum terbukti | T-09 |
| G-10 | Artefak yang dirujuk PRD belum lengkap: `docs/runbook.md`, `docs/a11y.md`, `docs/perf/scan-p95.md`, `IdempotencyTest.php`, `RetentionTest.php`, `tests/Concurrency/` | **ditutup** — semua artefak ada; referensi NFR-02/NFR-07 di PRD diselaraskan ke `DisbursementConcurrencyTest.php` dan test replay di `DonationApiTest`/`DisbursementApiTest` | — | ✅ T-14 |
| G-11 | Q-01…Q-04 di PRD masih "terbuka" padahal sudah diputuskan di `DECISIONS.md` | **ditutup T-11** — pertanyaan diberi keputusan eksplisit dan dirujuk D-025 | — | ✅ T-11 |
| G-12 | FR-08 menyebut VA **dan QRIS**; `PaymentInstruction` hanya VA | **ditutup T-11** — PRD/README menyatakan fake saat ini VA; QRIS nyata menunggu adapter | — | ✅ T-11 |
| G-13 | Token Sanctum disimpan di `localStorage`; CSP nonce sudah aktif tetapi risiko XSS residual tetap ada | **ditutup T-07** — token browser kini in-memory; reload meminta login ulang, API bearer tetap kompatibel | — | ✅ T-07 |
| G-14 | A-05 single-tenant masih asumsi, bukan keputusan eksplisit | **ditutup T-11** — PRD Q-04 dan README menyatakan single-tenant v1.0 | — | ✅ T-11 |
| G-15 | Registry merchant tidak punya API/UI; campaigner harus mengetik ID merchant (seed saja) | `routes/api.php` tidak punya route merchant; `dashboard/page.tsx:537` | demo & pemakaian nyata rapuh; PRD §8 "kelola merchant" tak terpenuhi | ✅ T-02a/T-02b |
| G-16 | Form limit disbursement tampil di dashboard campaigner, tetapi API `manageLimits` admin-only | `dashboard/page.tsx`, `CampaignPolicy::manageLimits` | campaigner mendapat 403 dari UI sendiri | ✅ T-02c (form admin-only + GET read-only) |

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
| T-03 | Skrip E2E manual (langkah + data seed) dan jalankan sekali dari UI ke backend: register → campaign → donate → webhook fake → disburse → receipt → review → close/refund | 2h | ✅ **selesai 2026-11-03** — `scripts/e2e-manual.sh` (14 langkah, endpoint yang sama dengan UI), hasil 43 PASS/0 FAIL di `docs/e2e/gate5-run-2026-11-03.md`; klik UI manual belum dijalankan (tanpa browser driver), dicatat sebagai batas |

### Fase 6 — security & kepatuhan (GATE 6)

| ID | Task | Estimasi | Bukti/DoD |
|---|---|---|---|
| T-04 | Verifikasi email end-to-end (G-01): aktifkan `MustVerifyEmail`, route signed verify + resend, gate aksi sensitif (`EMAIL_UNVERIFIED`), test 3 skenario, banner UI | 4h | test baru di `AuthApiTest` + `CampaignApiTest`; FR-03 ✅ |
| T-05 | Penjadwal siklus: tandai `expired` saat deadline lewat, buka refund window, auto-close + refund, retensi `request_metrics` (G-05) | 4h | ✅ **selesai 2026-11-03** — `amanah:campaign-cycle`, hourly scheduler, 7-day refund window, retention prune, dan `CampaignCycleTest` |
| T-06 | `/healthz` (liveness) dan `/readyz` (DB + queue + OCR reachability) (G-06) | 2h | ✅ **selesai 2026-11-03** — `HealthController`, route probes, 4 feature test, dan contoh output README |
| T-07 | `docs/security/asvs.md`: checklist ASVS L2 subset dengan status + bukti per item; perbaiki temuan (CORS, rate limit per route, redaksi log, validasi upload, kebijakan token G-13) | 6h | ✅ **selesai 2026-11-03** — ASVS subset, CORS allowlist, named route limiters, log processor, MIME-content validation, in-memory browser token, dan test |
| T-11 | Sinkronisasi kontrak: PRD §8/§9/§12, backlog endpoint & AC, `DECISIONS.md` D-024… (G-02, G-03, G-04, G-11, G-12, G-14), buat `docs/erd.md` (G-10) | 3h | ✅ **selesai 2026-11-03** — PRD/backlog/README/decisions mengikuti route + test aktual; `docs/erd.md` tersedia |

### Fase 7 — test suite (GATE 7)

| ID | Task | Estimasi | Bukti/DoD |
|---|---|---|---|
| T-08 | Playwright: alur kritis end-to-end terhadap stack lokal (butuh browser Chrome) | 8h | ✅ **selesai 2026-11-04** — `npm run e2e` 2 passed; fixture seeder, webServer backend/frontend, report HTML, screenshot/trace policy |
| T-09 | k6 authorize: 2 menit, target 200 rps, hitung query per request; tulis `docs/perf/scan-p95.md` (G-09) | 🟡 **instrumentasi selesai 2026-11-04** — `scripts/perf/authorize.js`, query header opt-in, dan runbook tersedia; full target belum dijalankan. **GATE 7 disetujui dengan bukti ini tertunda (D-028)** |
| T-10 | Perluas uji konkurensi (di luar 5 proses) atau dokumentasikan batas bukti saat ini | 2h | ✅ **selesai 2026-11-04** — harness diperluas menjadi 20 proses PHP independen; 3 payout sukses, saldo dan ledger invariant tetap konsisten; target PRD 200 VU × 50 iterasi masih belum diklaim |

### Fase 8 — DevOps (GATE 8)

| ID | Task | Estimasi | Bukti/DoD |
|---|---|---|---|
| T-12 | `docker-compose.yml`: mysql, api, queue, scheduler, ocr, web + healthcheck + volume | 5h | 🟡 **ditulis 2026-11-04** — compose 6 service + `backend/Dockerfile`, `frontend/Dockerfile`, `.env.docker.example`, healthcheck, volume `mysql-data`/`backend-storage`; YAML valid. `docker compose up --build` belum dijalankan (Docker tidak ada di mesin ini); **bukti tertunda disetujui di GATE 8 (D-028)** |
| T-13 | CI GitHub Actions: php test + pint + `composer audit`, es lint/build/audit, pytest, (opsional) k6 smoke; retensi sesuai NFR-08 | 4h | ✅ **selesai 2026-11-04** — `.github/workflows/ci.yml` (backend MySQL 8.4, frontend Node 24, OCR pytest) dan `amanah:retention` + `RetentionTest` (4 passed); GitHub Actions run #5/#6 **success** setelah `8c87eaa` memperbaiki `.env.example` dan `pythonpath` pytest |
| T-14 | Observability + `docs/runbook.md` + drill backup/restore + axe-core (G-08, G-10) | 6h | ✅ **selesai 2026-11-04** — `docs/runbook.md` (health, 3 alert, retensi, RTO/RPO) + drill restore MySQL (52 transaksi, `ledger:verify` exit 0, trigger immutability terbukti); `@axe-core/playwright` 4.14.0 + 4 test WCAG 2.1 AA (0 violations) di `docs/a11y.md` |

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
| Status nota milik sendiri | `GET /receipts` (scoped) | panel di `/dashboard` | ✅ T-02d |
| Notifikasi | `/notifications*` | `/notifications` | ✅ |
| Audit log | `GET /audit-logs` | `/admin/audit-logs` | ✅ |
| Webhook events + replay | `/admin/webhook-events*` | `/admin/webhooks` | ✅ |
| Dashboard admin | `GET /admin/dashboard` | `/admin` | ✅ |
| Registry merchant | — (tidak ada route) | — | ❌ G-15 |
| Verifikasi email | `GET /auth/email/verify/{id}/{hash}`, `POST /auth/email/resend` | `/dashboard` banner + resend action | ✅ T-04 |

**Rincian T-02 (urutan kerja):**

1. **T-02a — Registry merchant (backend):** ✅ **selesai 2026-11-03** —
   `MerchantController` (`GET/POST /merchants`, `PUT /merchants/{id}`,
   `PATCH /merchants/{id}/verify`), `MerchantPolicy`, `MerchantResource`
   (field internal `mid`/`verified_at` hanya admin), validasi MCC aktif &
   tidak diblokir, audit `merchant.created/updated/verified`, 10 test di
   `tests/Feature/Api/MerchantApiTest.php`. Lanjut ke T-02b.
2. **T-02b — Pemilih merchant di UI:** ✅ **selesai 2026-11-03** —
   `api.merchants()`, dashboard memuat daftar merchant terverifikasi dan
   memfilternya berdasarkan `allowed_mcc` kampanye yang dipilih; input ID manual
   diganti `<select>` (nama · kategori · kota) dengan empty/error state.
3. **T-02c — Guard limit (D-024):** ✅ **selesai 2026-11-03** —
   `GET /campaigns/{id}/disbursement-limit` (pemilik + admin,
   `CampaignPolicy::viewLimits`), payload `data: null` bila limit belum ada;
   dashboard admin tetap memakai form edit, sedangkan campaigner hanya melihat
   limit harian/bulanan + pemakaian + masa berlaku (read-only). Test: pemilik
   GET 200, campaigner lain GET 403 `FORBIDDEN`, admin GET 200, limit kosong →
   `data: null`, PUT campaigner 403 (total 18 test / 62 assertions di
   `DisbursementApiTest`).
4. **T-02d — Status nota campaigner:** ✅ **selesai 2026-11-03** — `GET /receipts`
   kini boleh diakses campaigner dan otomatis di-scope ke kampanye miliknya
   (`ReceiptPolicy::viewAny` + `whereHas('transaction.campaign')`), donor tetap
   `403`. `ReceiptResource` menyertakan `transaction` (nominal, status, judul
   kampanye) bila di-eager-load. Dashboard punya panel **Status nota** dengan
   status OCR, keyakinan, catatan penolakan, pagination, empty/error state, dan
   tombol muat ulang (memakai `api.myReceipts`). Bukti: `ReceiptReviewApiTest`
   (campaigner hanya melihat nota kampanyenya, donor `403`), 11 test/53
   assertions hijau, `pint --test` bersih, `npm run lint`/`build` bersih.
5. **T-02e — State kosong/error:** ✅ **selesai 2026-11-03** — komponen bersama
   `ErrorState` (alert + tombol “Coba lagi”) dipakai di beranda, detail kampanye,
   dasbor, edit kampanye, notifikasi, dan seluruh layar admin (dashboard,
   kampanye, nota, audit log, webhook). Setiap layar membedakan “data kosong”
   dari “gagal memuat”, sehingga empty state tidak lagi muncul saat request
   gagal dan pengguna selalu punya jalan untuk memuat ulang. Bukti:
   `npm run lint` bersih, `npm run build` sukses (14 route `ƒ (Dynamic)`).

## Langkah berikutnya (ringkas)

1. **Bukti tertunda T-12 (Docker):** di mesin ber-Docker jalankan
   `docker compose up --build`, cek 6 service sehat, login demo, lalu ubah T-12
   menjadi ✅ dengan output perintah.
2. **Bukti tertunda T-09 (performa):** jalankan `k6 run scripts/perf/authorize.js`
   dengan `RATE=200`, `DURATION=2m` pada PHP-FPM/Apache Linux atau staging
   (bukan `artisan serve`), lalu isi bagian Result di `docs/perf/scan-p95.md`.
3. **Fase 5:** bukti screenshot 390/1440 sudah ada di `docs/e2e/screenshots/`
   (spec `screenshots.spec.ts`); menunggu persetujuan GATE 5.
4. **GATE 7/8 sudah disetujui (D-028)** dengan catatan; jangan klaim NFR-01,
   NFR-03, atau NFR-10 sebelum bukti staging tersedia.
