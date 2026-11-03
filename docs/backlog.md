# BACKLOG — AmanahLink v1.0

| Field | Nilai |
|---|---|
| Versi | 1.0 |
| Tanggal | 2026-11-01 |
| Fase | Fase 1 — PRD & Backlog |
| Rujukan | `docs/prd.md` |
| Status | Fase 1 disetujui. Status eksekusi per story: lihat `docs/progress.md` |

## Konvensi

- **US-xx** user story, **TC-USxx-n** test case yang membuktikan AC ke-n.
- Prioritas MoSCoW. Estimasi dalam **jam kerja** (bukan story point abstrak) agar cocok dengan alokasi 4 jam/hari.
- Setiap AC harus dapat dibuktikan oleh satu test otomatis. AC tanpa test = belum dikerjakan (§15).
- Urutan pengerjaan mengikuti dependensi, bukan selera.

**Total: 29 story, ±73 jam (≈18 sesi 4 jam).**

---

## Epic 1 — Auth & RBAC (FR-01, FR-02, FR-03) — 9 jam

### US-01 — Registrasi akun donatur `M` `2h`
*Sebagai* pengunjung, *saya ingin* mendaftar, *agar* dapat berdonasi dan memantau dana.
```gherkin
Scenario: Registrasi valid
  When POST /api/v1/auth/register dengan name, email unik, password "Rahasia123!"
  Then status 201
  And role = "donor"
  And response tidak mengandung password

Scenario: Eskalasi role ditolak
  When payload menyertakan "role": "admin"
  Then status 422 dengan error.code = VALIDATION_ERROR
  And error.details.fields.role ada

Scenario: Email duplikat
  When email sudah terdaftar
  Then status 422 dengan error.code = VALIDATION_ERROR
```
Depends: —

### US-02 — Login, token, dan lockout `M` `2h`
```gherkin
Scenario: Login berhasil
  Then status 200 dengan access_token dan abilities sesuai role

Scenario: Password salah
  Then status 401 dengan error.code = UNAUTHENTICATED
  And pesan tidak mengungkap apakah email terdaftar

Scenario: Lima kegagalan beruntun
  When percobaan gagal ke-6
  Then status 429 dengan error.code = RATE_LIMITED
  And header Retry-After ada
```
Depends: US-01

### US-03 — Penjagaan RBAC & kepemilikan `M` `2h`
```gherkin
Scenario: Role tidak berhak
  When donor POST /api/v1/campaigns
  Then status 403 dengan error.code = FORBIDDEN_ROLE

Scenario: Bukan pemilik resource
  When campaigner A mengedit kampanye milik campaigner B
  Then status 403 dengan error.code = FORBIDDEN_ROLE
  And tidak ada perubahan data
```
Depends: US-02

### US-04 — Verifikasi email `S` `2h`
```gherkin
Scenario: Aksi sensitif sebelum verifikasi
  When campaigner belum verifikasi membuat kampanye
  Then status 403 dengan error.code = EMAIL_UNVERIFIED
```
Depends: US-01

---

## Epic 2 — Siklus Kampanye (FR-04, FR-05, FR-06, FR-11) — 12 jam

### US-05 — Buat kampanye draft `M` `3h`
```gherkin
Scenario: Draft valid
  When campaigner POST /api/v1/campaigns dengan target 10.000.000, deadline +30 hari, allowed_mcc ["5912","8062"]
  Then status 201, status = "draft", slug unik, current_amount = "0.00"

Scenario: MCC tidak terdaftar di registry
  When allowed_mcc memuat "9999"
  Then status 422 VALIDATION_ERROR dengan details.fields.allowed_mcc_array

Scenario: MCC terlarang
  When allowed_mcc memuat "5732"
  Then status 422 VALIDATION_ERROR

```
Depends: US-03

### US-06 — Ajukan review `M` `2h`
```gherkin
Scenario: Guard terpenuhi
  Then status 200, status = "pending_review"
  And audit_logs bertambah tepat 1 baris action = "campaign.submitted"

Scenario: Deadline terlalu dekat (< 7 hari)
  Then status 409 CONFLICT_STATE

Scenario: allowed_mcc kosong
  Then status 422 VALIDATION_ERROR
```
Depends: US-05

### US-07 — Approve/reject kampanye `M` `2h`
```gherkin
Scenario: Admin approve
  Then status 200, status = "active", audit + notifikasi ke campaigner

Scenario: Reject tanpa alasan
  Then status 422 VALIDATION_ERROR

Scenario: Transisi ilegal (draft → active)
  Then status 409 CONFLICT_STATE
```
Depends: US-06

### US-08 — Halaman publik kampanye `M` `3h`
```gherkin
Scenario: Kampanye aktif
  Then status 200 dengan title, target_amount, current_amount, progress_percent, label kategori MCC

Scenario: Tidak ada kebocoran PII
  Then response tidak memuat email/nama lengkap donatur

Scenario: Kampanye draft
  Then status 404 NOT_FOUND
```
Depends: US-07

### US-09 — Kunci edit setelah donasi pertama `M` `2h`
```gherkin
Scenario: Belum ada donasi settle
  Then PUT /api/v1/campaigns/{id} → status 200

Scenario: Sudah ada donasi settle
  Then status 409 CAMPAIGN_LOCKED
  And audit_logs mencatat penolakan
```
Depends: US-10

---

## Epic 3 — Donasi & Pay-in (FR-08, FR-09, FR-10) — 10 jam

### US-10 — Inisiasi donasi `M` `3h`
```gherkin
Scenario: Kampanye aktif
  When POST /api/v1/donations amount "100000.00" + Idempotency-Key
  Then status 201 dengan payment_url, va_number, expires_at, payment_ref unik
  And donations.status = "initiated"

Scenario: Di bawah minimum
  When amount "5000.00"
  Then status 422 VALIDATION_ERROR

Scenario: Kampanye frozen
  Then status 409 CAMPAIGN_NOT_ACTIVE
```
Depends: US-07

### US-11 — Webhook settlement idempoten `M` `4h`
```gherkin
Scenario: Settlement pertama
  Given signature valid, external_id baru
  Then status 200, donations.status = "settled"
  And tepat 2 ledger_entries dibuat
  And campaigns.current_amount bertambah sesuai nominal

Scenario: Replay identik
  When request sama dikirim ulang (key + payload hash sama)
  Then status 200 dengan body identik
  And jumlah ledger_entries tidak bertambah

Scenario: Key sama, payload berbeda
  Then status 422 IDEMPOTENCY_MISMATCH

Scenario: Dua request in-flight bersamaan
  Then tepat satu 200 dan satu 409 DUPLICATE_REQUEST
```
Depends: US-10

### US-12 — Tolak webhook tanpa signature sah `M` `1h`
```gherkin
Scenario: Signature salah
  Then status 401 INVALID_SIGNATURE, tidak ada mutasi, audit event tercatat

Scenario: Timestamp di luar toleransi 5 menit
  Then status 401 INVALID_SIGNATURE
```
Depends: US-11

### US-13 — Riwayat donasi donatur `M` `2h`
```gherkin
Scenario: Daftar milik sendiri
  Then status 200, cursor pagination, hanya donasi milik aktor

Scenario: limit > 100
  Then status 422 VALIDATION_ERROR
```
Depends: US-11

---

## Epic 4 — Disbursement & Ledger (FR-12…FR-18) — 20 jam

### US-14 — Terbitkan limit kampanye `M` `2h`
```gherkin
Scenario: Penerbitan pertama
  Then status 201 dengan daily_limit, monthly_limit, used_amount "0.00", expires_at

Scenario: Limit aktif sudah ada
  Then status 409 CONFLICT_STATE
```
Depends: US-07

### US-15 — Authorize disbursement (happy path) `M` `4h`
```gherkin
Scenario: Merchant terverifikasi, MCC cocok, saldo cukup
  When POST /api/v1/disbursements dengan campaign_id, merchant_id, amount "50000.00" + Idempotency-Key
  Then status 200, transactions.status = "captured"
  And tepat 2 ledger_entries (debit 2200, kredit 2100)
  And campaigns.current_amount berkurang 50.000
  And disbursement_limits.used_amount bertambah 50.000
  And Σ debit = Σ kredit untuk transaction_id tersebut
```
Depends: US-11, US-14

### US-16 — Tolak MCC tidak diizinkan `M` `2h`
```gherkin
Scenario: MCC elektronik pada kampanye medis
  When mcc "5732" sedangkan allowed ["5912","8062"]
  Then status 403 MCC_NOT_ALLOWED
  And error.details = { mcc_used: "5732", allowed: ["5912","8062"], reason: "mcc_not_allowed" }
  And tidak ada ledger entry
  And audit_logs mencatat action = "disbursement.rejected"

Scenario: Merchant belum terverifikasi
  Then status 403 MCC_NOT_ALLOWED dengan details.reason = "merchant_unverified"

Scenario: allowed_mcc null
  Then status 403 MCC_NOT_ALLOWED (deny-by-default)
```
Depends: US-15

### US-17 — Tolak saldo tidak cukup `M` `2h`
```gherkin
Scenario: Nominal melebihi saldo
  Then status 409 INSUFFICIENT_FUNDS dengan details.available
  And tidak ada ledger entry
```
Depends: US-15

### US-18 — Tolak batas harian/bulanan `M` `2h`
```gherkin
Scenario: Batas harian terlampaui
  Then status 409 LIMIT_EXCEEDED dengan details { period: "daily", remaining }

Scenario: Batas bulanan terlampaui
  Then status 409 LIMIT_EXCEEDED dengan details { period: "monthly", remaining }
```
Depends: US-15

### US-19 — Tolak kampanye tidak aktif / limit kedaluwarsa `M` `1h`
```gherkin
Scenario: Kampanye frozen
  Then status 409 CAMPAIGN_NOT_ACTIVE

Scenario: Limit expired
  Then status 409 LIMIT_EXPIRED
```
Depends: US-15

### US-20 — Anti double-spend konkuren `M` `3h`
```gherkin
Scenario: Dua scan paralel pada saldo yang hanya cukup untuk satu
  When 2 request dikirim serentak
  Then tepat satu 200 dan satu 409
  And saldo akhir konsisten dengan ledger
  And tidak ada ledger entry yatim
```
Depends: US-15

### US-21 — Tutup kampanye & refund sisa `S` `4h`
```gherkin
Scenario: Tutup dengan sisa dana
  Then status 200, status kampanye = "refunded"
  And refund pro-rata per donatur tercatat di ledger
  And saldo akun 2200 kampanye = "0.00"

Scenario: Refund diulang
  Then status 409 CONFLICT_STATE (tidak ada refund ganda)
```
Depends: US-15

---

## Epic 5 — Nota & OCR (FR-19…FR-22) — 9 jam

### US-22 — Upload nota `M` `3h`
```gherkin
Scenario: JPEG 2 MB milik transaksi sendiri
  Then status 202, receipts.status = "uploaded", job OCR ter-queue

Scenario: MIME tidak didukung
  Then status 422 VALIDATION_ERROR

Scenario: Bukan pemilik transaksi
  Then status 403 FORBIDDEN_ROLE
```
Depends: US-15

### US-23 — Auto-match hasil OCR `M` `3h`
```gherkin
Scenario: Confidence 0.91, nominal dalam toleransi 1%, merchant MCC cocok
  Then receipts.status = "auto_matched" lalu "verified"
  And disbursement → "reconciled"

Scenario: OCR service timeout
  Then receipts.status = "needs_review", bukan 500
  And audit event "ocr.timeout" tercatat
```
Depends: US-22, Fase 4

### US-24 — Review manual & keputusan verifikator `M` `3h`
```gherkin
Scenario: Confidence 0.52
  Then receipts.status = "needs_review" dan muncul di queue admin

Scenario: Verifikator approve
  Then status 200, disbursement.status = "reconciled", audit tercatat

Scenario: Reject tanpa alasan
  Then status 422 VALIDATION_ERROR

Scenario: Campaigner mencoba approve
  Then status 403 FORBIDDEN_ROLE
```
Depends: US-23

---

## Epic 6 — Admin & Audit (FR-23…FR-25) — 7 jam

### US-25 — Dashboard monitoring `M` `3h`
```gherkin
Scenario: Angka dashboard
  Then menampilkan total settled, jumlah mismatch ledger, queue depth OCR, p95 authorize
  And angka saldo dihitung dari ledger_entries, bukan hanya kolom cache
```
Depends: US-15

### US-26 — Freeze kampanye `M` `2h`
```gherkin
Scenario: Admin freeze dengan alasan
  Then status 200, campaign.status = "frozen"
  And donasi baru → 409 CAMPAIGN_NOT_ACTIVE
  And scan baru → 409 CAMPAIGN_NOT_ACTIVE
  And disbursement yang sudah authorized tidak dibatalkan

Scenario: Non-admin
  Then status 403 FORBIDDEN_ROLE
```
Depends: US-15

### US-27 — Audit log viewer `M` `2h`
```gherkin
Scenario: Filter
  Then status 200 dengan pagination cursor, filter actor/action/rentang tanggal

Scenario: Percobaan ubah audit
  Then PUT/DELETE /audit-logs/{id} → 405

Scenario: Campaigner mengakses
  Then status 403 FORBIDDEN_ROLE
```
Depends: US-03

---

## Epic 7 — Notifikasi & Reliabilitas Webhook (FR-26, FR-27) — 6 jam

### US-28 — Notifikasi perubahan state `S` `3h`
```gherkin
Scenario: Kampanye disetujui
  Then baris notifications dibuat dan email ter-queue
  And mark-as-read mengisi read_at
```
Depends: US-07

### US-29 — Retry & dead-letter queue `M` `3h`
```gherkin
Scenario: Provider gagal 3x
  Then retry backoff 1m / 5m / 30m lalu masuk DLQ
  And webhook_events.status = "dead_letter"

Scenario: DLQ kedalaman > 1000
  Then alert terpicu (Fase 8)

Scenario: Replay dari DLQ
  Then idempoten, tidak menggandakan ledger entry
```
Depends: US-11

---

## Traceability FR → US

| FR | Story | FR | Story |
|---|---|---|---|
| FR-01 | US-01, US-02 | FR-14 | US-16 |
| FR-02 | US-03 | FR-15 | US-11, US-15, US-20 |
| FR-03 | US-04 | FR-16 | US-18 |
| FR-04 | US-05 | FR-17 | US-19 |
| FR-05 | US-07 | FR-18 | US-21 |
| FR-06 | US-09 | FR-19 | US-22 |
| FR-07 | US-21 | FR-20 | US-23 |
| FR-08 | US-10 | FR-21 | US-23 |
| FR-09 | US-11, US-12 | FR-22 | US-24 |
| FR-10 | US-13 | FR-23 | US-25 |
| FR-11 | US-08 | FR-24 | US-26 |
| FR-12 | US-14 | FR-25 | US-27 |
| FR-13 | US-16 | FR-26 | US-28 |
| | | FR-27 | US-29 |

Tidak ada FR yatim. Tidak ada story tanpa FR.

---

## Pemetaan Story → Fase Eksekusi

| Fase | Story yang dibangun | Keluaran |
|---|---|---|
| 2 — Arsitektur & Data | (fondasi) | migration, enum, model, factory, seeder, invariant test |
| 3 — API & Ledger | US-01…US-21 | controller, service, form request, policy, feature test |
| 4 — OCR Service | US-22…US-24 (kontrak) | Flask + Dockerfile + contract test |
| 5 — Frontend | US-01, 02, 05–10, 13, 15–16, 25, 27 (UI) | Next.js per halaman |
| 6 — Security | semua | hardening + ASVS checklist |
| 7 — Test Suite | semua | k6, konkurensi, Selenium, Gherkin penuh |
| 8 — DevOps | US-28, US-29 (runtime) | compose, CI, observability, runbook |

---

## Definition of Ready (sebelum story masuk fase kode)

1. AC tertulis dalam Given/When/Then dengan status code + error code eksplisit.
2. Tabel & kolom yang disentuh sudah ada di desain Fase 2.
3. Error code tersedia di katalog `docs/prd.md` §9.
4. Dependensi story sudah selesai atau di-mock secara eksplisit.

## Definition of Done (per story)

1. Kode berjalan tanpa error; tidak ada TODO atau placeholder.
2. Test otomatis membuktikan **setiap** AC; semuanya hijau di run terakhir.
3. Audit log + domain event tertulis untuk setiap mutasi state.
4. `README`/`docs` diperbarui bila perilaku publik berubah.
5. Hasil test ditampilkan (bukan diklaim), lalu GATE disetujui.
