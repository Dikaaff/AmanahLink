# Runbook Operasional — AmanahLink

Terakhir diperbarui: **2026-11-04**. Dokumen ini menutup NFR-09 (observability)
dan NFR-10 (backup/restore) untuk lingkungan staging/produksi. Angka drill di
bawah dijalankan di mesin pengembangan Windows 11 dengan MySQL Laragon 8.4.3.

## 1. Topologi dan port

| Komponen | Lokal | Produksi (target) | Catatan |
|---|---|---|---|
| API Laravel | `127.0.0.1:8000` | `api.<domain>` (PHP-FPM + web server) | `artisan serve` hanya untuk lokal; **bukan** target benchmark |
| Web Next.js | `127.0.0.1:3000` (`3104` untuk Playwright) | `app.<domain>` | CSP nonce per request (D-023) |
| MySQL | `127.0.0.1:3306` | managed MySQL 8.4 | money `DECIMAL(15,2)`, ledger immutable |
| OCR Flask | `127.0.0.1:5001` | service internal | `ocr_driver=fake` bila tidak tersedia |
| Queue worker | `php artisan queue:work` | supervisor/systemd | wajib untuk OCR + notifikasi |
| Scheduler | `php artisan schedule:work` | cron `* * * * * php artisan schedule:run` | lihat §3 |

## 2. Health check

| Endpoint | Arti | Aksi bila gagal |
|---|---|---|
| `GET /healthz` | proses hidup | restart container/process |
| `GET /readyz` | DB + queue + OCR reachable | cek dependency yang disebut di respons `503` |
| `GET /up` | health bawaan Laravel | abaikan bila `/healthz` sudah dipakai |

Query manual cepat:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/healthz
Invoke-RestMethod http://127.0.0.1:8000/readyz
php artisan ledger:verify   # exit 0 = invariant ledger utuh
```

## 3. Job terjadwal

| Command | Jadwal | Fungsi |
|---|---|---|
| `webhooks:retry` | setiap menit | retry webhook + pindah ke dead letter setelah 3 percobaan |
| `amanah:campaign-cycle` | setiap jam | expire kampanye, auto-close + refund setelah 7 hari, prune request metrics 90 jam |
| `amanah:retention` | harian 02:15 | log >90 jam, audit >5 tahun, gambar nota terminal >24 jam (D-026); `--dry-run` tersedia |

## 4. Alert (NFR-09)

Tiga alert minimum yang harus aktif di staging/produksi:

| Alert | Deteksi | Ambang | Respons awal |
|---|---|---|---|
| Ledger mismatch | job `ledger:verify` exit ≠ 0 atau metrik selisih > 0 | 1 kejadian | hentikan disbursement (freeze kampanye terkait), simpan snapshot DB, eskalasi admin |
| Webhook DLQ menumpuk | `SELECT COUNT(*) FROM webhook_events WHERE status='dead_letter'` atau metrik `webhook_dlq_depth` | ≥ `AMANAH_WEBHOOK_DLQ_ALERT_DEPTH` (default 1000) | cek signature/secret, replay setelah provider sehat |
| Readiness gagal | `/readyz` 503 > 2 menit | 2 menit | cek DB/queue/OCR sesuai komponen yang gagal; alert ke on-call |

Tambahan yang disarankan: p95 `POST /disbursements` (header
`X-Perf-Query-Count` saat profiling), error rate 5xx API, dan disk usage
`storage/`.

## 5. Backup dan restore (NFR-10: RTO 1 jam, RPO 15 menit)

### Backup rutin

- Binlog/point-in-time recovery aktif pada MySQL terkelola; snapshot penuh tiap
  jam, binlog tiap 15 menit → RPO 15 menit.
- Backup logis tambahan:

```powershell
& "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe" -u root `
  --single-transaction --routines --triggers amanahlink > amanahlink-$(Get-Date -Format yyyyMMdd-HHmm).sql
```

`--triggers` wajib: trigger immutability ledger harus ikut pulih.

### Drill restore — 2026-11-04

| Langkah | Hasil |
|---|---|
| Dump `amanahlink` (single transaction + routines + triggers) | 93.956 byte, exit 0 |
| Restore ke database baru `amanahlink_restore_drill` | exit 0 |
| Bandingkan jumlah baris `users/campaigns/transactions/ledger_entries/audit_logs` | 8 / 1 / 52 / 104 / 50 — identik dengan sumber |
| `DB_DATABASE=amanahlink_restore_drill php artisan ledger:verify` | `Transactions inspected: 52`; `All financial invariants hold.`; exit 0 |
| Uji trigger immutability di DB hasil restore (`DELETE FROM ledger_entries WHERE id=1`) | ditolak: `ledger_entries are immutable: delete is forbidden` (ERROR 1644) |
| Bersihkan artefak drill | database drill dan file dump dihapus |

**Waktu drill:** ±2 menit (jauh di bawah RTO 1 jam) pada dataset demo 52
transaksi. Ukur ulang pada volume produksi.

### Prosedur restore produksi

1. Hentikan API dan queue worker (cegah mutasi selama restore).
2. Restore snapshot terakhir, lalu apply binlog sampai titik waktu insiden.
3. Jalankan `php artisan migrate --force` bila skema berubah setelah snapshot.
4. `php artisan ledger:verify` harus exit 0.
5. Cek `/readyz`, jalankan `php artisan amanah:campaign-cycle` bila perlu.
6. Nyalakan queue worker, lalu API. Catat waktu RTO aktual di tiket insiden.

## 6. Insiden umum

| Gejala | Penyebab lazim | Tindakan |
|---|---|---|
| `497`/`503` dari API | MySQL mati | cek service MySQL, `/readyz`, restart DB lalu worker |
| Disbursement 500 berulang | deadlock/row lock | cek log `ledger` + transaksi lambat; jangan retry manual tanpa `Idempotency-Key` baru |
| Nota stuck `extracting` | queue worker mati / OCR down | jalankan worker, cek `ocr_driver`, replay job |
| Webhook `dead_letter` | secret salah / provider berubah | verifikasi `AMANAH_PAYMENT_WEBHOOK_SECRET`, replay lewat admin |
| `/readyz` 503 pada OCR | service Flask mati | restart OCR atau set `AMANAH_OCR_DRIVER=fake` hanya untuk demo |
| Ledger mismatch | bug mutasi saldo | **jangan** menambal saldo manual; freeze kampanye, simpan bukti, eskalasi |

## 7. Release dan rollback

1. CI wajib hijau (`.github/workflows/ci.yml`: backend, frontend, OCR).
2. `php artisan migrate --force` sebelum menyalakan versi baru.
3. Rollback kode satu versi + restore DB hanya bila migrasi tidak kompatibel.
4. Setelah deploy: `/healthz`, `/readyz`, `ledger:verify`, dan smoke login.

## 8. Docker Compose (demo/lokal)

```powershell
Copy-Item .env.docker.example .env   # isi APP_KEY + MYSQL_ROOT_PASSWORD
cd backend; php artisan key:generate --show   # tempel hasilnya ke APP_KEY
docker compose up --build
```

| Service | Port | Keterangan |
|---|---|---|
| `mysql` | 3306 | volume `mysql-data`, healthcheck `mysqladmin ping` |
| `api` | 8000 | migrate otomatis lalu `artisan serve`; healthcheck `/healthz` |
| `queue` | - | `queue:work --tries=3` untuk OCR + notifikasi |
| `scheduler` | - | `schedule:work` (webhook retry, campaign cycle, retensi) |
| `ocr` | 5001 | `OCR_PROVIDER=fake`; ganti ke `openai` bila key tersedia |
| `web` | 3000 | Next.js production build + healthcheck `/login` |

Catatan:

- Compose ini **belum dijalankan** di mesin ini (Docker Desktop tidak tersedia);
  validasi yang dilakukan hanya parsing YAML. Jalankan `docker compose up
  --build` di mesin/CI ber-Docker sebelum mengklaim T-12 selesai penuh.
- `api` memakai `artisan serve` di dalam container (satu proses). Untuk beban
  produksi ganti dengan PHP-FPM + web server dan ulangi benchmark NFR-01.
- `NEXT_PUBLIC_API_URL` di-bake saat build frontend; ubah lalu rebuild `web`
  bila URL API berubah.

