#!/usr/bin/env bash
# AmanahLink — GATE 5 manual E2E walkthrough (T-03).
#
# Alur: register → campaign → donate → webhook fake → disburse → receipt →
# review → close/refund. Setiap langkah memanggil endpoint yang sama dengan
# yang dipakai layar frontend, lalu hasilnya di-assert.
#
# Prasyarat:
#   cd backend
#   AMANAH_PAYMENT_WEBHOOK_SECRET=e2e-secret QUEUE_CONNECTION=sync \
#   AMANAH_OCR_DRIVER=fake php artisan serve --host=127.0.0.1 --port=8000
#
# Jalankan dari root repo:
#   bash scripts/e2e-manual.sh
#
# Variabel opsional: API, FRONTEND, AMANAH_PAYMENT_WEBHOOK_SECRET.

set -uo pipefail

API="${API:-http://127.0.0.1:8000/api/v1}"
FRONTEND="${FRONTEND:-http://127.0.0.1:3000}"
SECRET="${AMANAH_PAYMENT_WEBHOOK_SECRET:-e2e-secret}"
RUN="$(date +%s)"

# Direktori sementara relatif terhadap root repo: path absolut /tmp tidak dapat
# dibaca konsisten oleh curl dan Python di Windows (Git Bash).
TMP="$(mktemp -d .e2e-tmp.XXXXXX)"
export TMP SECRET
BODY="$TMP/body.json"
trap 'rm -rf "$TMP"' EXIT

PASS=0
FAIL=0

step() { printf '\n== %s ==\n' "$1"; }
pass() { PASS=$((PASS + 1)); printf 'PASS  %-38s %s\n' "$1" "$2"; }
fail() { FAIL=$((FAIL + 1)); printf 'FAIL  %-38s expected=%s actual=%s\n' "$1" "$2" "$3"; }
check() { if [ "$2" = "$3" ]; then pass "$1" "$3"; else fail "$1" "$2" "$3"; fi; }
check2xx() {
  case "$2" in
    2??) pass "$1" "$2" ;;
    *) fail "$1" "2xx" "$2" ;;
  esac
}
check_one_of() { # label value allowed...
  local label="$1" value="$2" candidate
  shift 2
  for candidate in "$@"; do
    if [ "$value" = "$candidate" ]; then
      pass "$label" "$value"
      return
    fi
  done
  fail "$label" "$*" "$value"
}

# Terima beberapa nilai yang sama-sama sah (mis. queue sync langsung menjalankan OCR).
check_one_of() {
  local label="$1" actual="$2"
  shift 2
  for expected in "$@"; do
    if [ "$actual" = "$expected" ]; then pass "$label" "$actual"; return; fi
  done
  fail "$label" "$*" "$actual"
}

# Read a dotted path from the response body on stdin (lists use numeric parts).
jget() {
  python -c '
import json, sys
path = sys.argv[1].strip(".")
cur = json.load(sys.stdin)
for part in (path.split(".") if path else []):
    if isinstance(cur, list):
        cur = cur[int(part)]
    elif isinstance(cur, dict):
        cur = cur.get(part)
    else:
        cur = None
    if cur is None:
        break
print("" if cur is None else cur)
' "$1"
}

req() { # method path token data
  local method="$1" path="$2" token="${3:-}" data="${4:-}"
  local args=(-s -o "$BODY" -w '%{http_code}' -X "$method" "$API$path"
    -H 'Accept: application/json')
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data" ] && args+=(-H 'Content-Type: application/json' -d "$data")
  curl "${args[@]}"
}

iso_in_days() { python -c "import sys,datetime;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=int(sys.argv[1]))).isoformat())" "$1"; }

step "1. Registrasi donatur (POST /auth/register)"
EMAIL="e2e.donor.${RUN}@amanahlink.test"
code=$(req POST /auth/register "" "{\"name\":\"E2E Donor\",\"email\":\"$EMAIL\",\"password\":\"Rahasia123!\",\"password_confirmation\":\"Rahasia123!\"}")
check "registrasi" 201 "$code"
check "role dipaksa donor" "donor" "$(jget data.user.role < "$BODY")"
DONOR_TOKEN=$(jget data.token < "$BODY")
[ -n "$DONOR_TOKEN" ] && pass "token donatur diterima" "ada" || fail "token donatur diterima" "ada" "kosong"

step "2. Login penggalang & admin (POST /auth/login)"
code=$(req POST /auth/login "" '{"email":"budi@amanahlink.test","password":"password"}')
check "login campaigner" 200 "$code"
CAMPAIGNER_TOKEN=$(jget data.token < "$BODY")

code=$(req POST /auth/login "" '{"email":"admin@amanahlink.test","password":"password"}')
check "login admin" 200 "$code"
ADMIN_TOKEN=$(jget data.token < "$BODY")

step "3. Buat kampanye draf (POST /campaigns)"
TITLE="E2E Operasi Klinik $RUN"
DESCRIPTION="Dana dipakai hanya untuk obat dan biaya klinik mitra terverifikasi pada kampanye uji end-to-end ini."
DEADLINE=$(iso_in_days 30)
code=$(req POST /campaigns "$CAMPAIGNER_TOKEN" "{\"title\":\"$TITLE\",\"description\":\"$DESCRIPTION\",\"target_amount\":\"1000000\",\"deadline_at\":\"$DEADLINE\",\"allowed_mcc_array\":[\"5912\"]}")
check "draft dibuat" 201 "$code"
CAMPAIGN_ID=$(jget data.id < "$BODY")
CAMPAIGN_SLUG=$(jget data.slug < "$BODY")
check "status draf" "draft" "$(jget data.status < "$BODY")"
check "saldo awal" "0.00" "$(jget data.current_amount < "$BODY")"

step "4. Ajukan review + approve (POST /campaigns/{id}/submit, /review)"
code=$(req POST "/campaigns/$CAMPAIGN_ID/submit" "$CAMPAIGNER_TOKEN" "")
check "submit review" 200 "$code"
check "status pending_review" "pending_review" "$(jget data.status < "$BODY")"

code=$(req POST "/campaigns/$CAMPAIGN_ID/review" "$ADMIN_TOKEN" '{"decision":"approve"}')
check "approve kampanye" 200 "$code"
check "status active" "active" "$(jget data.status < "$BODY")"

step "5. Terbitkan limit pencairan (PUT /campaigns/{id}/disbursement-limit)"
LIMIT_EXPIRY=$(iso_in_days 30)
code=$(req PUT "/campaigns/$CAMPAIGN_ID/disbursement-limit" "$ADMIN_TOKEN" "{\"daily_limit\":\"1000000\",\"monthly_limit\":\"5000000\",\"expires_at\":\"$LIMIT_EXPIRY\"}")
check2xx "limit terbit" "$code"
check "limit harian" "1000000.00" "$(jget data.daily_limit < "$BODY")"

step "6. Pilih merchant terverifikasi (GET /merchants)"
code=$(req GET "/merchants?mcc=5912" "$ADMIN_TOKEN" "")
check "daftar merchant" 200 "$code"
MERCHANT_ID=$(jget data.0.id < "$BODY")
MERCHANT_NAME=$(jget data.0.name < "$BODY")
pass "merchant terpilih" "$MERCHANT_NAME (#$MERCHANT_ID)"

step "7. Donasi (POST /donations)"
code=$(curl -s -o "$BODY" -w '%{http_code}' -X POST "$API/donations" \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $DONOR_TOKEN" \
  -H "Idempotency-Key: e2e-donation-$RUN" \
  -d "{\"campaign_id\":$CAMPAIGN_ID,\"amount\":\"100000.00\"}")
check "donasi dibuat" 201 "$code"
PAY_REF=$(jget data.donation.payment_ref < "$BODY")
check "status donasi" "initiated" "$(jget data.donation.status < "$BODY")"
check "VA terbit" "ada" "$([ -n "$(jget data.payment.va_number < "$BODY")" ] && echo ada || echo kosong)"

step "8. Webhook settlement bertanda tangan (POST /webhooks/payments/fake)"
python - "$PAY_REF" <<'PY' > "$TMP/webhook.json"
import datetime, hashlib, hmac, json, os, sys
body = {
    "external_id": f"evt-e2e-{os.environ['TMP'].split('-')[-1]}-{sys.argv[1]}",
    "event": "payment.settled",
    "payment_ref": sys.argv[1],
    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
}
raw = json.dumps(body, separators=(",", ":"))
signature = hmac.new(os.environ["SECRET"].encode(), raw.encode(), hashlib.sha256).hexdigest()
with open(os.path.join(os.environ["TMP"], "webhook.sig"), "w", encoding="utf-8") as handle:
    handle.write(signature)
print(raw, end="")
PY
code=$(curl -s -o "$BODY" -w '%{http_code}' -X POST "$API/webhooks/payments/fake" \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -H "X-Callback-Signature: $(cat "$TMP/webhook.sig")" \
  --data-binary "@$TMP/webhook.json")
check "webhook diterima" 200 "$code"
check "event processed" "processed" "$(jget data.status < "$BODY")"

code=$(req GET /donations "$DONOR_TOKEN" "")
check "donasi settled" "settled" "$(jget data.0.status < "$BODY")"

code=$(req GET "/campaigns/$CAMPAIGN_SLUG" "" "")
check "saldo setelah fee 2%" "98000.00" "$(jget data.current_amount < "$BODY")"

step "9. Cairkan dana ke merchant (POST /disbursements)"
code=$(curl -s -o "$BODY" -w '%{http_code}' -X POST "$API/disbursements" \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $CAMPAIGNER_TOKEN" \
  -H "Idempotency-Key: e2e-disburse-$RUN" \
  -d "{\"campaign_id\":$CAMPAIGN_ID,\"merchant_id\":$MERCHANT_ID,\"amount\":\"50000.00\"}")
check "pencairan dicatat" 201 "$code"
TRANSACTION_ID=$(jget data.id < "$BODY")
check "status transaksi" "captured" "$(jget data.status < "$BODY")"
check "MCC terpakai" "5912" "$(jget data.mcc_used < "$BODY")"

step "10. Upload nota (POST /disbursements/{id}/receipts)"
python - "$TMP/nota.jpg" <<'PY'
import base64, sys
data = (
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a"
    "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA"
    "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=="
)
open(sys.argv[1], "wb").write(base64.b64decode(data))
PY
code=$(curl -s -o "$BODY" -w '%{http_code}' --show-error -X POST "$API/disbursements/$TRANSACTION_ID/receipts" \
  -H 'Accept: application/json' \
  -H "Authorization: Bearer $CAMPAIGNER_TOKEN" \
  -F "file=@$TMP/nota.jpg;type=image/jpeg" 2>&1) || echo "curl upload gagal (exit $?)"
check "nota diterima" 202 "$code"
RECEIPT_ID=$(jget data.id < "$BODY")
# Dengan QUEUE_CONNECTION=sync, job OCR sudah berjalan sebelum respons dikirim,
# jadi status bisa langsung needs_review (merchant hasil OCR tidak persis sama).
check_one_of "status nota setelah OCR" "$(jget data.status < "$BODY")" uploaded extracting needs_review auto_matched verified

step "11. Antrean review nota (GET /receipts?status=needs_review)"
code=$(req GET "/receipts?status=needs_review" "$ADMIN_TOKEN" "")
check "antrean terbaca" 200 "$code"
QUEUED_RECEIPT=$(jget data.0.id < "$BODY")
check "nota masuk review manual" "$RECEIPT_ID" "$QUEUED_RECEIPT"
check "status nota" "needs_review" "$(jget data.0.status < "$BODY")"
check "transaksi menunggu nota" "receipt_pending" "$(jget data.0.transaction.status < "$BODY")"

step "12. Verifikator menyetujui nota (POST /receipts/{id}/review)"
code=$(req POST "/receipts/$RECEIPT_ID/review" "$ADMIN_TOKEN" '{"decision":"approve"}')
check "approve nota" 200 "$code"
check "status nota" "approved" "$(jget data.status < "$BODY")"

code=$(req GET "/disbursements?campaign_id=$CAMPAIGN_ID" "$ADMIN_TOKEN" "")
check "transaksi reconciled" "reconciled" "$(jget data.0.status < "$BODY")"

step "13. Tutup kampanye & refund sisa (POST /campaigns/{id}/close)"
code=$(req POST "/campaigns/$CAMPAIGN_ID/close" "$ADMIN_TOKEN" "")
check "tutup kampanye" 200 "$code"
check "status refunded" "refunded" "$(jget data.status < "$BODY")"
check "refund proporsional" "48000.00" "$(jget refund.total < "$BODY")"
check "jumlah donatur" "1" "$(jget refund.donor_count < "$BODY")"

code=$(req GET "/campaigns/$CAMPAIGN_SLUG" "" "")
check "saldo terkunci nol" "0.00" "$(jget data.current_amount < "$BODY")"

step "14. Frontend menjawab (bukan klik UI otomatis)"
for path in / /login /register; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$FRONTEND$path")
  check "GET $path" 200 "$code"
done

printf '\n== RINGKASAN ==\n'
printf 'PASS: %s   FAIL: %s\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
