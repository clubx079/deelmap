# Scripts

## Load testing (k6)

Load tests hit the buyer portal pages and the `/api/deals` endpoint to simulate traffic.

### Install k6

- **macOS:** `brew install k6`
- **Windows:** `choco install k6`
- **Linux:** see [k6 install docs](https://k6.io/docs/get-started/installation/)

### Run locally

1. Start the app: `npm run dev` (e.g. `http://localhost:3000`).
2. In another terminal:

```bash
# Default: 10 VUs for 30s on buyer flow, ramped deals API
k6 run scripts/load-test.k6.js

# Custom base URL (e.g. staging)
k6 run -e BASE_URL=https://your-staging-url.com scripts/load-test.k6.js

# Shorter run
k6 run --vus 5 --duration 15s scripts/load-test.k6.js
```

(If you use `--vus` and `--duration`, k6 may override the script’s `options`; the script’s scenario options define the default load.)

### What to check

- **Summary:** No failed checks and HTTP success rate close to 100%.
- **Thresholds:** `http_req_failed` < 5%, `http_req_duration` p95 < 5s (configurable in the script).
- Use the printed metrics to see request rate, latency, and errors.

Manual load checks (many properties, filters, concurrent users) remain in the main **QA_Testing_Checklist.md** (Stress / Load Testing section).
