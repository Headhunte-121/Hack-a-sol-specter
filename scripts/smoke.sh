#!/usr/bin/env bash
# Smoke test for Suraksha Reports API (Vercel + Supabase Postgres)
# Usage: ./scripts/smoke.sh <API_URL> <WEB_ORIGIN>
# Example: ./scripts/smoke.sh https://suraksha-api.vercel.app https://hack-a-sol-specter.vercel.app

set -euo pipefail

API_URL="${1:-}"
WEB_ORIGIN="${2:-}"

if [[ -z "$API_URL" || -z "$WEB_ORIGIN" ]]; then
  echo "Usage: $0 <API_URL> <WEB_ORIGIN>"
  echo "Example: $0 http://localhost:8000 http://localhost:5173"
  exit 1
fi

# Strip trailing slash
API_URL="${API_URL%/}"
WEB_ORIGIN="${WEB_ORIGIN%/}"

echo "=========================================================="
echo "Running Suraksha Reports API Smoke Tests"
echo "API URL:    $API_URL"
echo "WEB ORIGIN: $WEB_ORIGIN"
echo "=========================================================="

FAILED=0

check() {
  local desc="$1"
  shift
  echo -n "[ ] $desc... "
  if "$@"; then
    echo "PASS"
  else
    echo "FAIL"
    FAILED=$((FAILED + 1))
  fi
}

# 1. Health check
test_health() {
  local res
  res=$(curl -m 15 -sS -f "$API_URL/health")
  echo "$res" | grep -q '"status":"ok"'
}
check "GET /health status ok" test_health

# 2. CORS Preflight (OPTIONS /reports)
test_cors_preflight() {
  local headers
  headers=$(curl -m 15 -sS -i -X OPTIONS "$API_URL/reports" \
    -H "Origin: $WEB_ORIGIN" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,X-Client-Token")
  echo "$headers" | grep -iq "Access-Control-Allow-Origin: \($WEB_ORIGIN\|\*\)"
}
check "CORS OPTIONS preflight" test_cors_preflight

# 3. CORS on actual GET /regions
test_cors_actual() {
  local headers
  headers=$(curl -m 15 -sS -i "$API_URL/regions" -H "Origin: $WEB_ORIGIN")
  echo "$headers" | grep -iq "Access-Control-Allow-Origin: \($WEB_ORIGIN\|\*\)"
}
check "CORS GET /regions headers" test_cors_actual

# 4. Post anonymous report with unique batch id
BATCH_ID="smoke-$(date +%s)-$RANDOM"
test_post_report() {
  local res
  res=$(curl -m 15 -sS -f -X POST "$API_URL/reports" \
    -H "Content-Type: application/json" \
    -H "X-Client-Token: smoketesttokensmoketesttoken1234" \
    -d "{\"scam_category\":\"kyc_bank\",\"channel\":\"sms\",\"region_code\":\"raipur\",\"risk_band\":\"likely_scam\",\"client_batch_id\":\"$BATCH_ID\"}")
  echo "$res" | grep -q '"ok":true'
}
check "POST /reports with client_batch_id" test_post_report

# 5. Read trends overview (demo=0)
test_trends_overview() {
  local res
  res=$(curl -m 15 -sS -f "$API_URL/trends/overview?demo=0")
  echo "$res" | grep -q '"min_count"'
}
check "GET /trends/overview?demo=0" test_trends_overview

# 6. Verify raw-read routes are blocked (404/405)
test_raw_reads_blocked() {
  local c1 c2 c3
  c1=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/reports" || true)
  c2=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/reports/1" || true)
  c3=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/scam_reports" || true)

  [[ ("$c1" == "404" || "$c1" == "405") && \
     ("$c2" == "404" || "$c2" == "405") && \
     ("$c3" == "404" || "$c3" == "405") ]]
}
check "Raw row routes blocked (no GET /reports)" test_raw_reads_blocked

echo "=========================================================="
if [[ $FAILED -eq 0 ]]; then
  echo "ALL SMOKE TESTS PASSED! API IS HEALTHY AND READY."
  exit 0
else
  echo "$FAILED SMOKE TEST(S) FAILED."
  exit 1
fi
