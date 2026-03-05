/**
 * Load test for DeelMap Buyer Portal
 * Run with: k6 run scripts/load-test.k6.js
 * Override base URL: k6 run -e BASE_URL=https://staging.example.com scripts/load-test.k6.js
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 * e.g. macOS: brew install k6
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    // Simulate users hitting the main pages and API
    buyer_flow: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      startTime: '0s',
      exec: 'buyerFlow',
    },
    // Ramp up API calls (marketplace list) to stress the deals endpoint
    api_deals: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 15 },
        { duration: '20s', target: 15 },
      ],
      startTime: '10s',
      exec: 'dealsApi',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],   // <5% errors
    http_req_duration: ['p(95)<5000'], // 95% of requests under 5s
  },
};

export function buyerFlow() {
  // Homepage
  let res = http.get(`${BASE_URL}/`);
  check(res, { 'homepage status 200': (r) => r.status === 200 });
  sleep(0.5 + Math.random() * 1);

  // Marketplace page (HTML)
  res = http.get(`${BASE_URL}/marketplace`);
  check(res, { 'marketplace status 200': (r) => r.status === 200 });
  sleep(0.5 + Math.random() * 1);

  // Deals API (what the marketplace list uses)
  res = http.get(`${BASE_URL}/api/deals?page=1&limit=20&sortBy=newest`);
  check(res, { 'deals API status 200': (r) => r.status === 200 });
  sleep(0.3 + Math.random() * 0.5);
}

export function dealsApi() {
  const page = Math.floor(Math.random() * 5) + 1;
  const limit = [20, 50, 100][Math.floor(Math.random() * 3)];
  const sortBy = ['newest', 'price-low', 'price-high'][Math.floor(Math.random() * 3)];

  const res = http.get(
    `${BASE_URL}/api/deals?page=${page}&limit=${limit}&sortBy=${sortBy}`
  );
  check(res, { 'deals API ok': (r) => r.status === 200 });
  sleep(0.2 + Math.random() * 0.3);
}
