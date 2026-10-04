import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ENDPOINTS, jsonHeaders } from './config.js';
import { getAuthHeaders } from './helpers/auth.js';

// Environment variable overrides
const env = typeof __ENV !== 'undefined' ? __ENV : {};
const isQuick = env.QUICK === 'true' || env.FAST === 'true';

// Fallback coupon configuration from verified database test seed
const FALLBACK_COUPON_CODE = env.TEST_COUPON_CODE || 'TEST20';
const DEFAULT_CART_TOTAL = 250;

/**
 * Load Test Options & Realistic Staging for Promotional Coupons:
 *
 * Backend Promotion Implementation Analysis:
 * 1. GET /api/v1/coupon/ (Public Read Endpoint):
 *    - Middleware: cacheResponse(300) (In-memory caching with 300s TTL)
 *    - Queries Coupon collection and sets Cache-Control: public, max-age=180, stale-while-revalidate=600
 *    - High-throughput catalogue read operation.
 *
 * 2. POST /api/v1/coupon/validate (Authenticated Coupon Validation):
 *    - Middleware: couponValidationLimiter (30 requests per 15 min per IP), protect, validateCoupon
 *    - Schema requirement: { couponCode: string (2-30 chars, alphanumeric), cartItemsTotalAmount: number }
 *    - Service logic: looks up active coupon in MongoDB ({ couponName, expire: { $gt: now } }),
 *      verifies cart subtotal meets minAmount, calculates percentage discount capped at maxDiscount,
 *      and returns calculated { discount, finalTotal }.
 *    - SAFETY GUARANTEES:
 *      * Purely read and mathematical computation: does NOT create, mutate, or delete database coupons.
 *      * Does NOT alter coupon expiration or modify production data.
 *      * Protects against rate limits via distributed client IP headers (X-Forwarded-For).
 *
 * Realistic Staging:
 * 10 VUs -> 30 VUs -> 50 VUs -> 100 VUs -> ramp down
 */
export const options = {
  stages: isQuick
    ? [
        { duration: '5s', target: 5 },
        { duration: '10s', target: 10 },
        { duration: '5s', target: 0 },
      ]
    : [
        { duration: '20s', target: 10 },  // Ramp-up to 10 VUs
        { duration: '40s', target: 10 },  // Steady load at 10 VUs
        { duration: '20s', target: 30 },  // Ramp-up to 30 VUs
        { duration: '40s', target: 30 },  // Steady load at 30 VUs
        { duration: '20s', target: 50 },  // Ramp-up to 50 VUs
        { duration: '40s', target: 50 },  // Steady load at 50 VUs
        { duration: '20s', target: 100 }, // Peak load at 100 VUs
        { duration: '40s', target: 100 }, // Sustained peak load
        { duration: '20s', target: 0 },   // Graceful ramp-down to 0
      ],
  thresholds: {
    // Global SLAs
    http_req_failed: ['rate<0.02'],                 // Error rate under 2%
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // Global latency SLAs

    // Granular Per-Endpoint SLAs
    'http_req_duration{endpoint:get_coupons}': ['p(95)<200'],     // In-memory / cached public list
    'http_req_duration{endpoint:validate_coupon}': ['p(95)<400'], // Authenticated DB lookup + discount math
  },
};

/**
 * Setup lifecycle hook:
 * 1. Verifies backend connectivity
 * 2. Dynamically discovers an existing active coupon from GET /api/v1/coupon/
 * 3. Prepares a qualifying cartTotal amount based on coupon minAmount
 */
export function setup() {
  const healthRes = http.get(ENDPOINTS.HEALTH, {
    tags: { name: 'GET /health (pre-check)' },
  });

  if (healthRes.status !== 200) {
    console.warn(`[Setup Warning] Health check at ${ENDPOINTS.HEALTH} returned ${healthRes.status}. Verify backend is running.`);
  }

  let couponCode = env.TEST_COUPON_CODE || null;
  let cartTotal = DEFAULT_CART_TOTAL;

  // 1. Discover active coupons from catalogue endpoint
  const couponsRes = http.get(`${ENDPOINTS.COUPONS}/`, {
    headers: jsonHeaders,
    tags: { name: 'GET /api/v1/coupon/ (setup discovery)' },
  });

  if (couponsRes.status === 200) {
    try {
      const body = couponsRes.json();
      const list = body.data || [];
      if (list.length > 0) {
        // Find an active non-expired coupon
        const now = new Date().toISOString();
        const valid = list.find((c) => !c.expire || c.expire > now) || list[0];
        if (valid && valid.couponName) {
          couponCode = valid.couponName;
          if (valid.minAmount && valid.minAmount > 0) {
            cartTotal = Number(valid.minAmount) + 100; // Guarantee subtotal exceeds minAmount
          }
        }
      }
    } catch (_) {}
  }

  if (!couponCode) {
    couponCode = FALLBACK_COUPON_CODE;
  }

  return {
    targetUrl: BASE_URL,
    couponCode,
    cartTotal,
  };
}

// Module-level state per Virtual User (persists across iterations of each VU)
let vuToken = null;
let vuUser = null;

/**
 * Ensures the Virtual User has an active, authenticated customer account.
 * Reuses credentials across iterations to avoid repeated bcrypt password hashing.
 */
function ensureAuthenticatedUser(vuId, extraHeaders) {
  if (vuToken) return { token: vuToken, user: vuUser };

  const email = `coupon_user_vu${vuId}_${Date.now()}@loadtest.local`;
  const password = 'Password123!';
  const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000);
  const phoneNumber = `98${phoneSuffix}`.slice(0, 10);

  const signupRes = http.post(
    `${ENDPOINTS.USERS}/signup`,
    JSON.stringify({
      name: `Coupon User ${vuId}`,
      email,
      password,
      passwordConfirm: password,
      phoneNumber,
    }),
    {
      headers: { ...jsonHeaders, ...extraHeaders },
      tags: { name: 'POST /api/v1/users/signup (coupon auth)', endpoint: 'auth' },
    },
  );

  if (signupRes.status === 200) {
    try {
      const data = signupRes.json();
      vuToken = data.token;
      vuUser = data.data && data.data.user ? data.data.user : null;
    } catch (_) {}
  }

  // Fallback to configured standard test user login if signup failed
  if (!vuToken && env.TEST_USER_EMAIL && env.TEST_USER_PASSWORD) {
    const loginRes = http.post(
      `${ENDPOINTS.USERS}/login`,
      JSON.stringify({
        email: env.TEST_USER_EMAIL,
        password: env.TEST_USER_PASSWORD,
      }),
      {
        headers: { ...jsonHeaders, ...extraHeaders },
        tags: { name: 'POST /api/v1/users/login (coupon auth fallback)', endpoint: 'auth' },
      },
    );

    if (loginRes.status === 200) {
      try {
        const data = loginRes.json();
        vuToken = data.token;
        vuUser = data.data && data.data.user ? data.data.user : null;
      } catch (_) {}
    }
  }

  return { token: vuToken, user: vuUser };
}

/**
 * Default Virtual User Iteration Loop
 * 1. Customer browses available promotional coupons (GET /api/v1/coupon/)
 * 2. Authenticated customer validates selected coupon for current cart subtotal (POST /api/v1/coupon/validate)
 */
export default function (data) {
  const couponCode = data.couponCode || FALLBACK_COUPON_CODE;
  const cartTotal = data.cartTotal || DEFAULT_CART_TOTAL;

  // Distributed IP simulation to avoid rate limiter bottlenecks
  const clientIp = `10.${(__VU % 250) + 1}.${((__ITER || 0) % 250) + 1}.1`;
  const extraHeaders = {
    'X-Forwarded-For': clientIp,
  };

  // =========================================================================
  // 1. GET /api/v1/coupon/ (Public active coupons catalogue)
  // =========================================================================
  const getRes = http.get(
    `${ENDPOINTS.COUPONS}/`,
    {
      headers: { ...jsonHeaders, ...extraHeaders },
      tags: { name: 'GET /api/v1/coupon/', endpoint: 'get_coupons' },
    },
  );

  check(getRes, {
    'get-coupons status is 200': (r) => r.status === 200,
    'get-coupons status is success': (r) => {
      try { return r.json('status') === 'success'; } catch (_) { return false; }
    },
    'get-coupons returns data array': (r) => {
      try { return Array.isArray(r.json('data')); } catch (_) { return false; }
    },
  });

  // Short pause before user applies coupon
  sleep(0.3);

  // =========================================================================
  // 2. Authenticate Virtual User for Protected Validation Endpoint
  // =========================================================================
  const { token } = ensureAuthenticatedUser(__VU, extraHeaders);
  if (!token) {
    console.error(`[VU ${__VU}] Failed to authenticate coupon customer.`);
    sleep(1);
    return;
  }

  const authHeaders = getAuthHeaders(token, extraHeaders);

  // =========================================================================
  // 3. POST /api/v1/coupon/validate (Calculate discount on valid cart total)
  // =========================================================================
  const validatePayload = JSON.stringify({
    couponCode,
    cartItemsTotalAmount: cartTotal,
  });

  const validateRes = http.post(
    `${ENDPOINTS.COUPONS}/validate`,
    validatePayload,
    {
      headers: authHeaders,
      tags: { name: 'POST /api/v1/coupon/validate', endpoint: 'validate_coupon' },
    },
  );

  check(validateRes, {
    'validate-coupon status is 200': (r) => r.status === 200,
    'validate-coupon status is success': (r) => {
      try { return r.json('status') === 'success'; } catch (_) { return false; }
    },
    'validate-coupon returned discount calculation': (r) => {
      try {
        const body = r.json('data');
        return (
          body &&
          typeof body.discount === 'number' &&
          typeof body.finalTotal === 'number' &&
          body.finalTotal <= cartTotal
        );
      } catch (_) {
        return false;
      }
    },
    'validate-coupon couponName matches target': (r) => {
      try {
        return (r.json('data.couponName') || '').toUpperCase() === couponCode.toUpperCase();
      } catch (_) {
        return false;
      }
    },
  });

  // Pacing pause between user iterations
  sleep(0.5);
}

/**
 * Resolves destination path for coupons.json depending on execution directory
 */
function getSummaryFilePath() {
  if (env.SUMMARY_PATH) return env.SUMMARY_PATH;
  const pwd = env.PWD || '';
  if (pwd.endsWith('Load-tests') || pwd.endsWith('Load-tests/')) {
    return 'results/coupons.json';
  }
  return 'Load-tests/results/coupons.json';
}

/**
 * Custom readable terminal summary formatter
 */
function formatTerminalSummary(data, summaryPath) {
  const m = data.metrics;
  const httpReqs = m.http_reqs ? m.http_reqs.values.count : 0;
  const httpFailed = m.http_req_failed ? (m.http_req_failed.values.rate * 100).toFixed(2) : '0.00';
  const duration = m.http_req_duration ? m.http_req_duration.values : {};
  const checks = m.checks ? m.checks.values : { passes: 0, fails: 0 };
  const totalChecks = checks.passes + checks.fails;
  const checkRate = totalChecks > 0 ? ((checks.passes / totalChecks) * 100).toFixed(2) : '100.00';

  let out = '\n' + '='.repeat(70) + '\n';
  out += '         SMARTCRAVING - PROMOTIONS & COUPONS LOAD TEST RESULTS           \n';
  out += '='.repeat(70) + '\n\n';

  out += `  Target API URL     : ${BASE_URL}\n`;
  out += `  Total HTTP Reqs    : ${httpReqs}\n`;
  out += `  Check Pass Rate    : ${checkRate}% (${checks.passes}/${totalChecks} checks passed)\n`;
  out += `  Failure Rate       : ${httpFailed}%\n\n`;

  out += '  Latency Overview (ms):\n';
  out += `    Average          : ${duration.avg ? duration.avg.toFixed(2) : '-'} ms\n`;
  out += `    Median (p50)     : ${duration.med ? duration.med.toFixed(2) : '-'} ms\n`;
  out += `    90th Percentile  : ${duration['p(90)'] ? duration['p(90)'].toFixed(2) : '-'} ms\n`;
  out += `    95th Percentile  : ${duration['p(95)'] ? duration['p(95)'].toFixed(2) : '-'} ms\n`;
  out += `    99th Percentile  : ${duration['p(99)'] ? duration['p(99)'].toFixed(2) : '-'} ms\n`;
  out += `    Maximum          : ${duration.max ? duration.max.toFixed(2) : '-'} ms\n\n`;

  out += '  Per-Endpoint p(95) Latency:\n';
  const endpoints = [
    { key: 'get_coupons', label: 'GET /api/v1/coupon/' },
    { key: 'validate_coupon', label: 'POST /api/v1/coupon/validate' },
  ];

  for (const ep of endpoints) {
    const metricKey = `http_req_duration{endpoint:${ep.key}}`;
    const epMetric = m[metricKey];
    const epP95 = epMetric && epMetric.values ? epMetric.values['p(95)'].toFixed(2) + ' ms' : 'N/A';
    out += `    - ${ep.label.padEnd(30)} : p(95) = ${epP95}\n`;
  }

  out += '\n  Threshold Evaluation:\n';
  let allPassed = true;
  for (const [key, metric] of Object.entries(m)) {
    if (metric.thresholds) {
      for (const [tName, tResult] of Object.entries(metric.thresholds)) {
        const passed = tResult.ok;
        if (!passed) allPassed = false;
        const icon = passed ? '✓ PASS' : '✗ FAIL';
        out += `    [${icon}] ${key} (${tName})\n`;
      }
    }
  }
  if (allPassed) {
    out += '    ✓ All coupon SLA performance thresholds were satisfied.\n';
  }

  out += `\n  Summary JSON saved to : ${summaryPath}\n`;
  out += '='.repeat(70) + '\n';
  return out;
}

/**
 * k6 handleSummary hook: formats terminal output and writes JSON summary to coupons.json
 */
export function handleSummary(data) {
  const summaryPath = getSummaryFilePath();
  return {
    stdout: formatTerminalSummary(data, summaryPath),
    [summaryPath]: JSON.stringify(data, null, 2),
  };
}
