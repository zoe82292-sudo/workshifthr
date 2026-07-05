#!/usr/bin/env bash
# Automated production smoke checks (no payment — checkout URL only).
set -euo pipefail

BASE="${1:-https://shiftworkshr.com}"

echo "=== ShiftWorksHR smoke test: $BASE ==="
echo

echo "1. Health"
health="$(curl -s "$BASE/api/health")"
echo "$health" | python3 -m json.tool
email_ok="$(echo "$health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('credential_email_configured', False))")"
disk_ok="$(echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data_dir',{}); print(d.get('using_persistent_disk') and d.get('path')=='/var/data/shiftworkshr')")"
echo

echo "2. Billing status"
curl -s "$BASE/api/billing/status" | python3 -m json.tool
echo

echo "3. Checkout session (does not charge)"
checkout="$(curl -s -X POST "$BASE/api/billing/checkout" \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"cycle"}')"
url="$(echo "$checkout" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null || true)"
if [[ -n "$url" && "$url" == https://checkout.stripe.com/* ]]; then
  echo "OK — Stripe checkout URL created"
  echo "$url" | head -c 80
  echo "..."
else
  echo "FAIL — checkout:"
  echo "$checkout"
  exit 1
fi
echo

echo "4. Demo analysis"
demo_code="$(curl -s -o /tmp/demo.json -w "%{http_code}" "$BASE/api/demo-analysis")"
echo "GET /api/demo-analysis → HTTP $demo_code"
if [[ "$demo_code" != "200" ]]; then
  echo "FAIL — demo analysis unavailable"
  cat /tmp/demo.json
  exit 1
fi
python3 -c "import json; d=json.load(open('/tmp/demo.json')); assert d['summary']['total_rows']>0, d"
echo "OK — demo analysis returned $(python3 -c "import json; print(json.load(open('/tmp/demo.json'))['summary']['total_rows'])") rows"
echo

echo "=== Summary ==="
if [[ "$email_ok" == "True" ]]; then
  echo "✓ Credential email configured"
else
  echo "✗ Credential email NOT configured — add RESEND_API_KEY or SMTP_* in Render"
fi
if [[ "$disk_ok" == "True" ]]; then
  echo "✓ Persistent disk"
else
  echo "✗ Persistent disk check failed"
fi
echo "→ Complete payment manually: open checkout URL in browser, then login → upload → export"
echo "  Live Stripe uses real charges. Use Cycle Pass only if you intend to pay."
