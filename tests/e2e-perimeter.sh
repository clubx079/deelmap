#!/usr/bin/env bash
# DeelMap API auth-perimeter e2e check. Dev server on :3007, TEST DB only.
# Mint a valid dm_session with: SESSION_SECRET=<secret> node -e "import('../lib/session.js').then(m=>console.log(m.signSession({userId:'<uuid>'})))"
set -uo pipefail
b=${1:-http://localhost:3007}
echo "== anonymous gated -> 401 =="
for r in buyer/offers buyer/billing/payment-methods favorites financing referral contracts/drafts property-images deals/map; do
  printf "  %-30s %s\n" "$r" "$(curl -s -o /dev/null -w '%{http_code}' "$b/api/$r")"
done
echo "== anti-spoof (forged header, no cookie) -> 401 =="
curl -s -o /dev/null -w "  x-user-id: %{http_code}\n" -H "x-user-id: victim" "$b/api/buyer/offers"
echo "== public/curated -> 200 =="
for r in health properties deals; do printf "  %-12s %s\n" "$r" "$(curl -s -o /dev/null -w '%{http_code}' "$b/api/$r")"; done
echo "== with valid dm_session ($2) -> not 401 =="
for r in buyer/offers favorites/list deals/map; do
  printf "  %-16s %s\n" "$r" "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: dm_session=$2" "$b/api/$r")"
done
