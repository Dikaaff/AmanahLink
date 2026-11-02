# PRD — AmanahLink v1.0

| Field | Nilai |
|---|---|
| Produk | AmanahLink — Purpose-Bound Donation Platform |
| Versi PRD | 1.0 |
| Tanggal | 2026-11-01 |
| Fase | Fase 1 — PRD & Backlog |
| Pemilik | Lead PM (virtual team) |
| Status | Menunggu approval GATE Fase 1 |
| Rujukan | `DECISIONS.md`, master prompt v2.0 |

---

## 1. Masalah & Solusi

**Masalah.** Platform donasi konvensional mencairkan dana menjadi uang tunai ke rekening penggalang. Setelah dana berpindah, platform kehilangan kendali atas penggunaannya. Muncul *moral hazard*: dana medis dipakai membeli barang elektronik, dana pendidikan dipakai konsumsi pribadi. Donatur hanya punya laporan manual yang tidak dapat diverifikasi.

**Solusi.** *Purpose-Bound Money* — dana donasi tidak pernah cair sebagai cash. Dana menjadi **limit pembayaran terikat kategori** yang hanya dapat dipakai pada merchant terverifikasi dengan MCC linier dengan tujuan kampanye. Setiap rupiah punya jejak: `donation → ledger → disbursement → receipt → reconciliation`.

**Pembeda yang wajib tercermin di UI, API, dan skema:**
1. Dana terikat **kategori**, bukan orang.
2. Setiap rupiah **berjejak** dan dapat direkonsiliasi ulang dari ledger.
3. Ada **refund otomatis** untuk dana yang tidak terserap sebelum kampanye ditutup.

**Batas kejujuran klaim (D-002).** Pada mode MVP `allowlist`, MCC ditegakkan lewat (a) registrasi merchant terverifikasi dan (b) validasi `allowed_mcc_array` saat authorize. Sistem **tidak** mengklaim kontrol MCC di level jaringan. Semua materi demo dan UI harus memakai frasa "merchant terverifikasi + kategori transaksi", bukan "diblokir oleh jaringan".

---

## 2. Persona & Jobs To Be Done

| Persona | Role sistem | Tujuan utama | Rasa sakit | Fitur kunci |
|---|---|---|---|---|
| Donatur | `donor` | Yakin dana tepat sasaran | Takut dana diselewengkan | Feed transparansi, bukti kategori, refund |
| Penggalang | `campaigner` | Mencairkan dana cepat untuk kebutuhan riil | Verifikasi berbelit | Limit terikat kategori, upload nota via OCR |
| Verifikator | `verifier` | Meninjau nota & kampanye | Volume manual tinggi | Review queue, confidence score, audit log |
| Admin | `admin` | Menjaga kepatuhan & menindak penyalahgunaan | Butuh visibilitas real-time | Dashboard monitoring, freeze, audit log |
| Merchant | — (eksternal) | Menerima pembayaran aman | Ragu terhadap dana "aneh" | Settlement jelas, status transparan |

Merchant bukan pengguna aplikasi pada MVP: mereka entitas di registry yang dikelola admin/verifikator.

---

## 3. Ruang Lingkup

### 3.1 In scope (MVP, v1.0)
Autentikasi + RBAC, siklus kampanye, donasi via VA/QRIS, webhook settlement idempoten, limit disbursement terikat MCC, ledger double-entry, upload nota + OCR dengan human review, dashboard admin, audit log, notifikasi, refund sisa dana.

### 3.2 Out of scope (v1.0) — eksplisit
Pinjaman, investasi, multi-currency, crypto, klaim pajak otomatis, donasi berulang/subscription, multi-tenant, aplikasi mobile native, penerbitan kartu virtual ber-MCC (hanya disiapkan slot adapter), mesin dispute otomatis, KYC otomatis pihak ketiga.

Bila salah satu item di atas diminta, itu **perubahan lingkup**, bukan penambahan diam-diam.

---

## 4. Functional Requirements

Prioritas: **M** = must (MVP), **S** = should (v1.0 bila waktu cukup), **C** = could (v1.1).

| ID | Epic | Requirement | Pri | Error code terkait |
|---|---|---|---|---|
| FR-01 | Auth | Register & login dengan Sanctum token | M | VALIDATION_ERROR, UNAUTHENTICATED |
| FR-02 | Auth | RBAC 4 role: donor, campaigner, verifier, admin | M | FORBIDDEN_ROLE |
| FR-03 | Auth | Verifikasi email sebelum aksi sensitif | M | EMAIL_UNVERIFIED |
| FR-04 | Campaign | Buat kampanye draft + `allowed_mcc_array` tervalidasi | M | VALIDATION_ERROR |
| FR-05 | Campaign | Review & approve/reject kampanye oleh admin | M | CONFLICT_STATE, FORBIDDEN_ROLE |
| FR-06 | Campaign | Edit terbatas hanya sebelum donasi pertama settle | M | CAMPAIGN_LOCKED |
| FR-07 | Campaign | Tutup kampanye & refund sisa dana | M | CONFLICT_STATE, INSUFFICIENT_FUNDS |
| FR-08 | Donation | Generate VA/QRIS pay-in + `expires_at` | M | CAMPAIGN_NOT_ACTIVE |
| FR-09 | Donation | Webhook settlement idempoten + signature | M | UNAUTHENTICATED, IDEMPOTENCY_MISMATCH |
| FR-10 | Donation | Riwayat donasi donatur (cursor pagination) | M | — |
| FR-11 | Campaign | Halaman publik kampanye + progress | M | NOT_FOUND |
| FR-12 | Disburse | Terbitkan limit per kampanye (harian/bulanan/expiry) | M | CONFLICT_STATE |
| FR-13 | Disburse | Validasi MCC saat authorize | M | MCC_NOT_ALLOWED |
| FR-14 | Disburse | Tolak transaksi di luar MCC dengan pesan spesifik | M | MCC_NOT_ALLOWED |
| FR-15 | Disburse | Ledger double-entry untuk setiap mutasi | M | — (invariant) |
| FR-16 | Disburse | Batas harian & bulanan | M | LIMIT_EXCEEDED |
| FR-17 | Disburse | Auto-expire limit | M | LIMIT_EXPIRED |
| FR-18 | Disburse | Refund sisa dana | S | CONFLICT_STATE |
| FR-19 | OCR | Upload nota (multipart) → job OCR | M | VALIDATION_ERROR |
| FR-20 | OCR | Ekstraksi merchant, nominal, tanggal | M | UPSTREAM_TIMEOUT |
| FR-21 | OCR | Confidence score tersimpan & ditampilkan | M | — |
| FR-22 | OCR | Review manual bila confidence < 0.75 | M | OCR_LOW_CONFIDENCE |
| FR-23 | Admin | Dashboard monitoring (saldo, mismatch, queue) | M | — |
| FR-24 | Admin | Freeze kampanye seketika | M | CONFLICT_STATE |
| FR-25 | Admin | Audit log viewer berfilter | M | — |
| FR-26 | Notif | Notifikasi in-app + email pada perubahan state | S | — |
| FR-27 | Notif | Webhook retry + dead-letter queue | M | UPSTREAM_TIMEOUT |

---

## 5. Non-Functional Requirements

Setiap NFR punya **cara verifikasi** dan **artefak bukti**. Klaim tanpa artefak dianggap belum terpenuhi (R9, §18).

| ID | Requirement | Target | Cara verifikasi | Artefak |
|---|---|---|---|---|
| NFR-01 | Latensi authorize disbursement | p95 < 500 ms @ 200 rps | k6 2 menit + hitung query per request | `docs/perf/scan-p95.md` |
| NFR-02 | Integritas saldo | 0 selisih | 200 VU × 50 iterasi (10.000 operasi) + invariant SQL | `tests/Concurrency/` |
| NFR-03 | Ketersediaan | 99.5% / bulan | probe `/healthz` & `/readyz` 60 dtk | dashboard staging |
| NFR-04 | Keamanan | 0 critical/high | OWASP ASVS L2 subset + `composer audit` + `npm audit` | `docs/security/asvs.md` |
| NFR-05 | Auditabilitas | 100% mutasi berjejak | query invariant audit coverage | `docs/erd.md` §invariant |
| NFR-06 | Aksesibilitas | WCAG 2.1 AA | axe-core di CI + uji keyboard manual | `docs/a11y.md` |
| NFR-07 | Idempotensi | 100% POST mutasi uang | replay test: kirim 2× payload identik | `tests/Feature/IdempotencyTest.php` |
| NFR-08 | Retensi data | log 90h, audit 5 thn, nota 24 jam | scheduled command + test | `tests/Feature/RetentionTest.php` |
| NFR-09 | Observability | 3 alert aktif | uji picu alert di staging | `docs/runbook.md` |
| NFR-10 | Backup | RTO 1 jam, RPO 15 menit | drill restore terdokumentasi | `docs/runbook.md` |

Catatan kejujuran: NFR-03 dan NFR-10 baru dapat dibuktikan setelah ada lingkungan staging (Fase 8). Sampai saat itu statusnya **belum terverifikasi**, bukan "selesai".

---

## 6. Business Rules

| ID | Aturan | Titik penegakan |
|---|---|---|
| BR-01 | Satu kampanye hanya punya satu set MCC aktif pada satu waktu | Validasi `allowed_mcc_array` saat create & approve |
| BR-02 | Dana tidak dapat dicairkan bila status kampanye bukan `active` atau `funded` | `DisbursementService` sebelum insert |
| BR-03 | Total disbursement ≤ saldo tersedia (dari ledger, bukan hanya cache) | Lock + invariant check dalam transaksi |
| BR-04 | MCC deny-by-default: array kosong/null = tolak | `MccPolicy::allows()` |
| BR-05 | Refund hanya untuk sisa dana; fee platform diambil saat settlement, tidak dipotong ulang saat refund | `RefundService` |
| BR-06 | Setiap penolakan transaksi tercatat sebagai audit event, bukan error senyap | Semua jalur 4xx finansial |
| BR-07 | Merchant harus `verified` sebelum dapat menerima dana | Registry check di authorize |
| BR-08 | Satu `idempotency_key` tidak boleh dipakai untuk dua payload berbeda | Hash payload + unique index |
| BR-09 | Nominal donasi minimum Rp10.000, maksimum Rp1.000.000.000 per transaksi | FormRequest |
| BR-10 | Perubahan status kampanye hanya lewat service + wajib menulis audit log & domain event | State machine |

---

## 7. State Machine

Transisi hanya boleh lewat method service. Transisi terlarang melempar `InvalidStateTransitionException` → HTTP 409 `CONFLICT_STATE`.

### 7.1 Campaign
```
draft → pending_review → active → funded
              ↑            │  │
              └── reject ──┘  ├→ frozen → active|funded (unfreeze)
                              ├→ expired
                              └→ closed → refunded
```
| Dari | Ke | Guard | Efek samping |
|---|---|---|---|
| draft | pending_review | target > 0, deadline ≥ now+7d, ≥1 MCC valid & merchant kategori cocok | audit + event `CampaignSubmitted` |
| pending_review | active | aktor admin/verifier | audit + event + notifikasi campaigner |
| pending_review | draft | alasan reject wajib | audit + notifikasi |
| active | funded | `current_amount ≥ target_amount` (otomatis, tidak memblokir donasi) | audit + notifikasi |
| active/funded | frozen | aktor admin, alasan wajib | audit + blok donasi & disbursement baru |
| frozen | active/funded | aktor admin | audit + notifikasi |
| active/funded | expired | `deadline_at < now` (scheduler) | audit, refund window dibuka |
| expired/funded | closed | aktor admin atau auto setelah refund window | audit |
| closed | refunded | seluruh refund selesai | audit + notifikasi donatur |

### 7.2 Donation
```
initiated → pending → settled → refunded
                 └→ failed | expired
```

### 7.3 Disbursement
```
requested → mcc_validated → authorized → captured → receipt_pending
                                                       → verified → reconciled
                                                       → disputed
```
Aturan: `authorized` wajib punya 2 ledger entry sebelum `commit`. `captured` tanpa ledger entry = bug kritis (invariant test gagal).

### 7.4 Receipt
```
uploaded → extracting → auto_matched → verified → reconciled
                     └→ needs_review → approved | rejected → disputed
```

---

## 8. Matriks Izin

| Aksi | donor | campaigner | verifier | admin |
|---|---|---|---|---|
| Lihat kampanye publik | ✓ | ✓ | ✓ | ✓ |
| Buat/edit kampanye | — | ✓ (milik sendiri) | — | — |
| Submit review | — | ✓ (milik sendiri) | — | — |
| Approve/reject kampanye | — | — | ✓ | ✓ |
| Donasi | ✓ | ✓ | — | — |
| Lihat riwayat donasi sendiri | ✓ | — | — | — |
| Terbitkan limit & authorize disbursement | — | ✓ (milik sendiri) | — | — |
| Upload nota | — | ✓ (milik sendiri) | — | — |
| Review nota | — | — | ✓ | ✓ |
| Freeze kampanye | — | — | — | ✓ |
| Lihat audit log | — | — | ✓ (read) | ✓ |
| Kelola merchant registry | — | — | — | ✓ |

Kepemilikan diverifikasi lewat Policy, bukan lewat filter query di controller.

---

## 9. Katalog Error Code

Envelope wajib (§7 master prompt): `{ "error": { "code", "message", "details", "trace_id" } }`.

| Code | HTTP | Kapan |
|---|---|---|
| VALIDATION_ERROR | 422 | Input gagal FormRequest; `details.fields` |
| UNAUTHENTICATED | 401 | Token tidak ada/invalid, signature webhook salah |
| EMAIL_UNVERIFIED | 403 | Aksi sensitif sebelum verifikasi |
| FORBIDDEN_ROLE | 403 | Role tidak berhak |
| MCC_NOT_ALLOWED | 403 | MCC di luar `allowed_mcc_array` atau merchant tidak terverifikasi |
| INSUFFICIENT_FUNDS | 409 | Saldo tersedia < nominal |
| LIMIT_EXCEEDED | 409 | Batas harian/bulanan terlampaui |
| LIMIT_EXPIRED | 409 | `expires_at` limit sudah lewat |
| CAMPAIGN_NOT_ACTIVE | 409 | Status bukan `active`/`funded` |
| CAMPAIGN_LOCKED | 409 | Edit setelah donasi pertama settle |
| CONFLICT_STATE | 409 | Transisi state terlarang |
| DUPLICATE_REQUEST | 409 | Request bersamaan dengan key sama masih diproses |
| IDEMPOTENCY_MISMATCH | 422 | Key sama, payload berbeda |
| OCR_LOW_CONFIDENCE | 422 | Ekstraksi gagal total; butuh input manual |
| RATE_LIMITED | 429 | Melebihi kuota; `Retry-After` wajib |
| NOT_FOUND | 404 | Resource tidak ada |
| UPSTREAM_TIMEOUT | 504 | Provider eksternal timeout |
| INTERNAL_ERROR | 500 | Fallback; tanpa stack trace di response |

`DUPLICATE_REQUEST` vs replay: key sama + payload hash sama → **200 dengan body identik** (idempoten, bukan error). `DUPLICATE_REQUEST` hanya bila key masih *in-flight*.

---

## 10. Blueprint Ledger

Akun (owner bisa per kampanye):

| Code | Nama | Tipe | Normal |
|---|---|---|---|
| 1000 | Platform Cash | asset | debit |
| 2050 | Refund Payable | liability | credit |
| 2100 | Merchant Clearing | liability | credit |
| 2200 | Campaign Restricted Funds (`campaign:{id}`) | liability | credit |
| 4000 | Platform Fee Revenue | revenue | credit |

Alur (semua dalam satu DB transaction):

| Kejadian | Debit | Kredit |
|---|---|---|
| Donasi settle Rp100.000 | 1000 Cash 100.000 | 2200 Restricted 100.000 |
| Fee platform 2% | 2200 Restricted 2.000 | 4000 Fee Revenue 2.000 |
| Disburse Rp50.000 | 2200 Restricted 50.000 | 2100 Merchant Clearing 50.000 |
| Settlement merchant | 2100 Merchant Clearing 50.000 | 1000 Cash 50.000 |
| Refund sisa | 2200 Restricted | 2050 Refund Payable → 1000 Cash |

Invariant (diuji, bukan diklaim):
1. `Σ debit = Σ credit` untuk setiap `transaction_id`.
2. `campaigns.current_amount = Σ settled donations − Σ fee − Σ captured disbursements − Σ refunded`.
3. Tidak ada `disbursement` berstatus `captured` tanpa tepat 2 ledger entry.

---

## 11. KPI & Cara Mengukur

| KPI | Target | Pengukuran |
|---|---|---|
| Disbursement lolos MCC check | ≥ 90% | rasio `mcc_validated` / `requested` per minggu |
| Selisih ledger | 0 | invariant query harian; alert bila > 0 |
| Waktu pencairan | < 5 menit | `authorized.created_at → captured.created_at`; pada rail `fake` dan sandbox issuer. Settlement bank nyata bisa T+1 dan dicatat terpisah |
| Nota ter-OCR otomatis | ≥ 80% | rasio `auto_matched` / total receipt |
| NPS donatur | ≥ 50 | survei setelah donasi settle |

---

## 12. Pertanyaan Terbuka (perlu keputusan sebelum Fase 2)

| ID | Pertanyaan | Default bila tidak dijawab |
|---|---|---|
| Q-01 | Kebijakan fee: 2% flat? | Pakai 2%, konstanta di config, dicatat di DECISIONS.md |
| Q-02 | Refund pro-rata ke donatur atau ke kampanye? | Pro-rata ke donatur, tanpa potongan tambahan |
| Q-03 | Overfunding: batas 150% target lalu auto-close? | Tanpa batas, tetap buka sampai deadline |
| Q-04 | Single-tenant (A-05) dikonfirmasi? | Single-tenant |
