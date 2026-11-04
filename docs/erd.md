# Entity Relationship Diagram — AmanahLink

**Sumber kebenaran:** migration di `backend/database/migrations/` dan model
Eloquent. Dokumen ini menjelaskan schema yang benar-benar berjalan.

## Diagram inti

```mermaid
erDiagram
    users ||--o{ campaigns : owns
    users ||--o{ donations : makes
    users ||--o{ transactions : creates
    users ||--o{ merchants : verifies
    users ||--o{ receipts : reviews
    users ||--o{ audit_logs : acts
    mcc_codes ||--o{ merchants : classifies
    mcc_codes ||--o{ transactions : records
    campaigns ||--o{ donations : receives
    campaigns ||--o{ transactions : scopes
    campaigns ||--o| disbursement_limits : controls
    donations ||--o{ transactions : settles
    merchants ||--o{ transactions : serves
    transactions ||--o{ ledger_entries : posts
    transactions ||--o| receipts : documents
    ledger_accounts ||--o{ ledger_entries : contains

    users { bigint id PK string email UK string role timestamp email_verified_at }
    mcc_codes { char code PK string title string category boolean is_active boolean is_blocked }
    merchants { bigint id PK char mcc FK string mid UK string status bigint verified_by FK }
    campaigns { bigint id PK bigint user_id FK string slug UK decimal target_amount decimal current_amount json allowed_mcc_array string status timestamp deadline_at }
    donations { bigint id PK bigint campaign_id FK bigint donor_id FK string payment_ref UK decimal amount string status }
    transactions { bigint id PK bigint campaign_id FK bigint user_id FK bigint donation_id FK bigint merchant_id FK char mcc_used FK string type decimal amount string status string idempotency_key UK }
    disbursement_limits { bigint id PK bigint campaign_id FK decimal daily_limit decimal monthly_limit timestamp expires_at }
    receipts { bigint id PK bigint transaction_id FK bigint reviewed_by FK string file_path json ocr_payload decimal confidence string status }
    ledger_accounts { bigint id PK string code string owner_type bigint owner_id string currency }
    ledger_entries { bigint id PK bigint transaction_id FK bigint account_id FK string direction decimal amount decimal balance_after }
    audit_logs { bigint id PK bigint actor_id FK string action string subject_type bigint subject_id json before json after string trace_id }
```

## Supporting tables

| Table | Peran | Relasi penting |
|---|---|---|
| `webhook_events` | Payload payment, status retry, dan DLQ | `external_id` unik; dapat diterima sebelum settlement |
| `idempotency_keys` | Lock, request hash, dan response replay | key unik; scope pengguna diterapkan service |
| `personal_access_tokens` | Token Sanctum | polymorphic `tokenable` → `users` |
| `notifications` | Inbox in-app | polymorphic `notifiable` → `users` |
| `request_metrics` | Durasi/status authorize untuk p95 | dipangkas berdasarkan `created_at` |
| `password_reset_tokens`, `sessions` | Infrastruktur Laravel | email/session terkait user |
| `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs` | Cache, lock, dan queue database | tabel infrastruktur tanpa FK domain |

## Invariants dan penghapusan

- Nominal disimpan sebagai `DECIMAL(15,2)`; amount positif ditegakkan check
  constraint pada tabel finansial.
- `ledger_entries` immutable di level model dan trigger MySQL. Koreksi dibuat
  sebagai transaksi pembalik, bukan update/delete.
- `campaigns.current_amount` harus sama dengan saldo akun restricted `2200`.
- FK finansial memakai restrict-on-delete; actor/verifier memakai null-on-delete.
- `ledger_accounts` memakai `(owner_type, owner_id)`, bukan FK polymorphic.
- Audit, metrics, dan webhook events bersifat append-oriented.

## Route-to-entity contract

| Flow | Endpoint aktual | Entity utama |
|---|---|---|
| Campaign draft | `POST /api/v1/campaigns` | `campaigns`, `mcc_codes` |
| Donation pay-in | `POST /api/v1/donations` | `donations`, `idempotency_keys`, `transactions` |
| Payment settlement | `POST /api/v1/webhooks/payments/{provider}` | `webhook_events`, `donations`, `ledger_entries` |
| Disbursement authorize | `POST /api/v1/disbursements` | `transactions`, `merchants`, `disbursement_limits`, `ledger_entries` |
| Disbursement dry-run | `POST /api/v1/disbursements/simulate` | `campaigns`, `merchants`, `disbursement_limits` (baca saja) |
| Receipt upload | `POST /api/v1/disbursements/{transaction}/receipts` | `receipts`, `transactions`, `jobs` |
| Campaign close/refund | `POST /api/v1/campaigns/{campaign}/close` | `campaigns`, `donations`, `ledger_entries` |
