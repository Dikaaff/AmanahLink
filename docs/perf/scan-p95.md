# Authorize performance — T-09

## Workload

- **Endpoint:** `POST /api/v1/disbursements`
- **Scenario:** authenticated campaigner, verified merchant `MCC 5912`, unique
  `Idempotency-Key`, amount `1.00` IDR per request
- **Fixture:** local `MccCodeSeeder` + `DemoSeeder`; demo campaign has a funded
  ledger balance and an active disbursement limit
- **Target:** constant arrival rate **200 requests/second for 2 minutes**
- **Success criteria:** HTTP failure rate `<1%`, p95 `<500 ms`
- **Query measurement:** backend `AMANAH_PROFILE_QUERIES=true` exposes the
  local-only `X-Perf-Query-Count` response header and k6 records the
  `authorize_query_count` trend. This flag is false by default and must not be
  enabled in production.

## Reproducible command

From the repository root, start a dedicated local API port with query profiling:

```powershell
cd backend
$env:AMANAH_PROFILE_QUERIES="true"
php artisan serve --host=127.0.0.1 --port=8010
```

In another terminal, from the repository root:

```powershell
php artisan db:seed --class=Database\Seeders\MccCodeSeeder --no-interaction
php artisan db:seed --class=Database\Seeders\DemoSeeder --no-interaction

$env:API_URL="http://127.0.0.1:8010/api/v1"
k6 run scripts/perf/authorize.js --summary-export docs/perf/authorize-summary.json
```

The script supports bounded local runs without changing the test:

```powershell
$env:RATE="5"; $env:DURATION="10s"; k6 run scripts/perf/authorize.js
```

## Result

### Bounded smoke — 2026-11-04

Command: `RATE=5`, `DURATION=10s`, PHP `artisan serve` on Windows, MySQL
native, `AMANAH_PROFILE_QUERIES=true`.

- HTTP requests: **46**, successful: **100%**
- Actual throughput: **1.51 req/s**; **8 iterations dropped**
- HTTP duration p95: **17.32 s**
- Query count trend: **29 queries/request** (p95)
- Result: **threshold failed**, as expected for the single-process local
  server under queued arrival pressure

The full 200 rps × 2 minute run is **not yet verified in this workspace**.
k6 was installed locally on 2026-11-04, and the script plus query-count
instrumentation are ready. Run the exact command above on the intended API
runtime (preferably PHP-FPM/Apache or the staging deployment, not the
single-process `artisan serve`) and replace this section with the generated
p95, failure rate, and query trend before marking NFR-01 complete.

This distinction is intentional: a short smoke run or a single-process local
server cannot prove the PRD target of 200 rps for two minutes.
