import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ENDPOINTS, jsonHeaders } from './config.js';
import { getAuthHeaders } from './helpers/auth.js';

// Environment variable overrides
const env = typeof __ENV !== 'undefined' ? __ENV : {};
const isQuick = env.QUICK === 'true' || env.FAST === 'true';

// Fallback IDs from verified project seed dataset
const FALLBACK_CACHED_STORE_ID = env.TEST_STORE_ID || '6671719fe1a78e67dc8c8dce'; // Mani's Dum Biryani (has cached summary)
const FALLBACK_CACHED_FOOD_ID = env.TEST_FOOD_ID || '6671720fe1a78e67dc8c8dd8';   // Fish Kabab (has cached summary)
const FALLBACK_UNCACHED_FOOD_ID = env.TEST_UNCACHED_ID || '66716430bd4249c429fee76b'; // KFC Chicken Bucket

/**
 * Load Test Options & Dual-Scenario Architecture for AI Endpoints:
 *
 * Backend AI Implementation Analysis:
 * 1. POST /api/v1/ai/stores/:id/summary & POST /api/v1/ai/items/:id/summary:
 *    - Middleware: aiLimiter (10 req/15 min per IP), protect, validateObjectId("id")
 *    - Database lookup: fetches Restaurant / FoodItem by ObjectId.
 *    - Caching layer:
 *      * Database cache: checks if restaurant.reviewSentiment / food.reviewSentiment exists.
 *      * In-memory cache: Map keyed by subject:reviewHash with 1-hour TTL.
 *      * When CACHE HITS: returns immediately ({ success: true, cached: true, aiData: ... }).
 *        Zero external LLM API calls, very low latency (~50-150ms).
 *    - LLM Generation (Cache Miss):
 *      * Calls Groq Cloud API (https://api.groq.com/openai/v1/chat/completions) using GroqProvider
 *        with model openai/gpt-oss-20b (8s timeout, with fallback heuristics).
 *      * Updates document in MongoDB (restaurant.save() / food.save()) and returns { cached: false, aiData }.
 *
 * 2. SAFETY & RATE-LIMIT CONSTRAINTS:
 *    - Blasting uncached AI endpoints at high concurrency would exhaust Groq API rate limits,
 *      incur external API costs, and trigger Express aiLimiter (10 req/15 min).
 *    - Admin endpoints (/generate-food, /admin/.../analyze) are kept out of high-load tests.
 *    - Dual-Scenario Separation:
 *      * Scenario 1: Cached AI Response Load Test (Higher Staged Load)
 *      * Scenario 2: Limited Uncached AI Generation Test (1 VU, 1-2 controlled iterations)
 */
export const options = {
  scenarios: {
    // Scenario 1: High-throughput cached AI summary performance
    cached_ai_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: isQuick
        ? [
            { duration: '5s', target: 5 },
            { duration: '10s', target: 10 },
            { duration: '5s', target: 0 },
          ]
        : [
            { duration: '20s', target: 10 }, // Ramp-up to 10 VUs
            { duration: '40s', target: 10 }, // Steady load at 10 VUs
            { duration: '20s', target: 25 }, // Ramp-up to 25 VUs
            { duration: '40s', target: 25 }, // Steady load at 25 VUs
            { duration: '20s', target: 50 }, // Ramp-up to 50 VUs (peak load)
            { duration: '40s', target: 50 }, // Sustained peak load
            { duration: '20s', target: 0 },  // Graceful ramp-down to 0
          ],
      exec: 'cachedAiScenario',
    },
    // Scenario 2: Strictly limited uncached AI generation performance (1 VU, 1-2 iterations)
    limited_uncached_ai: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: isQuick ? 1 : 2,
      maxDuration: '30s',
      startTime: '2s', // Stagger slightly after cached load commences
      exec: 'uncachedAiScenario',
    },
  },
  thresholds: {
    // Global SLAs
    http_req_failed: ['rate<0.02'],                  // Error rate under 2%
    http_req_duration: ['p(95)<1500', 'p(99)<3000'], // Global latency SLAs

    // Granular Per-Mode SLAs
    'http_req_duration{endpoint:cached_store_summary}': ['p(95)<300'], // In-memory / document cached store summary
    'http_req_duration{endpoint:cached_item_summary}': ['p(95)<300'],  // In-memory / document cached item summary
    'http_req_duration{endpoint:uncached_ai_summary}': ['p(95)<4000'], // External Groq LLM inference roundtrip
  },
};

/**
 * Setup lifecycle hook:
 * 1. Verifies backend connectivity
 * 2. Confirms active cached and uncached target identifiers
 */
export function setup() {
  const healthRes = http.get(ENDPOINTS.HEALTH, {
    tags: { name: 'GET /health (pre-check)' },
  });

  if (healthRes.status !== 200) {
    console.warn(`[Setup Warning] Health check at ${ENDPOINTS.HEALTH} returned ${healthRes.status}. Verify backend is running.`);
  }

  return {
    targetUrl: BASE_URL,
    cachedStoreId: env.TEST_CACHED_STORE_ID || FALLBACK_CACHED_STORE_ID,
    cachedFoodId: env.TEST_CACHED_FOOD_ID || FALLBACK_CACHED_FOOD_ID,
    uncachedFoodId: env.TEST_UNCACHED_FOOD_ID || FALLBACK_UNCACHED_FOOD_ID,
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

  const email = `ai_user_vu${vuId}_${Date.now()}@loadtest.local`;
  const password = 'Password123!';
  const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000);
  const phoneNumber = `98${phoneSuffix}`.slice(0, 10);

  const signupRes = http.post(
    `${ENDPOINTS.USERS}/signup`,
    JSON.stringify({
      name: `AI User ${vuId}`,
      email,
      password,
      passwordConfirm: password,
      phoneNumber,
    }),
    {
      headers: { ...jsonHeaders, ...extraHeaders },
      tags: { name: 'POST /api/v1/users/signup (ai auth)', endpoint: 'auth' },
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
        tags: { name: 'POST /api/v1/users/login (ai auth fallback)', endpoint: 'auth' },
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
 * Scenario 1: High-Throughput Cached AI Response Load Test
 * Tests reading pre-computed AI summaries for restaurants and food items.
 * Endpoints tested:
 *   - POST /api/v1/ai/stores/:id/summary (cached)
 *   - POST /api/v1/ai/items/:id/summary (cached)
 */
export function cachedAiScenario(data) {
  // Distributed IP simulation to avoid rate limiter bottlenecks
  const clientIp = `10.${(__VU % 250) + 1}.${((__ITER || 0) % 250) + 1}.1`;
  const extraHeaders = {
    'X-Forwarded-For': clientIp,
  };

  // 1. Authenticate virtual customer
  const { token } = ensureAuthenticatedUser(__VU, extraHeaders);
  if (!token) {
    console.error(`[VU ${__VU}] Failed to authenticate AI customer.`);
    sleep(1);
    return;
  }

  const authHeaders = getAuthHeaders(token, extraHeaders);

  // =========================================================================
  // 2. POST /api/v1/ai/stores/:id/summary (Cached Store Review Summary)
  // =========================================================================
  const storeRes = http.post(
    `${ENDPOINTS.AI}/stores/${data.cachedStoreId}/summary`,
    JSON.stringify({}),
    {
      headers: authHeaders,
      tags: { name: 'POST /api/v1/ai/stores/:id/summary', endpoint: 'cached_store_summary', mode: 'cached' },
    },
  );

  check(storeRes, {
    'cached store summary status is 200': (r) => r.status === 200,
    'cached store summary success is true': (r) => {
      try { return r.json('success') === true; } catch (_) { return false; }
    },
    'cached store summary cached flag is true': (r) => {
      try { return r.json('cached') === true; } catch (_) { return false; }
    },
    'cached store summary contains sentiment and bullets': (r) => {
      try {
        const aiData = r.json('aiData');
        return aiData && typeof aiData.sentiment === 'string' && Array.isArray(aiData.summaryBullets);
      } catch (_) {
        return false;
      }
    },
  });

  // Short pause between interactions
  sleep(0.3);

  // =========================================================================
  // 3. POST /api/v1/ai/items/:id/summary (Cached Food Item Review Summary)
  // =========================================================================
  const itemRes = http.post(
    `${ENDPOINTS.AI}/items/${data.cachedFoodId}/summary`,
    JSON.stringify({}),
    {
      headers: authHeaders,
      tags: { name: 'POST /api/v1/ai/items/:id/summary', endpoint: 'cached_item_summary', mode: 'cached' },
    },
  );

  check(itemRes, {
    'cached item summary status is 200': (r) => r.status === 200,
    'cached item summary success is true': (r) => {
      try { return r.json('success') === true; } catch (_) { return false; }
    },
    'cached item summary cached flag is true': (r) => {
      try { return r.json('cached') === true; } catch (_) { return false; }
    },
    'cached item summary contains sentiment and bullets': (r) => {
      try {
        const aiData = r.json('aiData');
        return aiData && typeof aiData.sentiment === 'string' && Array.isArray(aiData.summaryBullets);
      } catch (_) {
        return false;
      }
    },
  });

  // Pacing pause before next iteration
  sleep(0.5);
}

/**
 * Scenario 2: Limited Uncached AI Generation Performance
 * Strictly limited iterations (1 VU, 1-2 iters) measuring real LLM inference time
 * without overloading the external Groq API or triggering rate limits.
 */
export function uncachedAiScenario(data) {
  // Use dedicated IP for uncached AI generation (valid 4-octet IPv4)
  const clientIp = `10.205.${(__VU % 50) + 1}.${((__ITER || 0) % 250) + 1}`;
  const extraHeaders = {
    'X-Forwarded-For': clientIp,
  };

  const { token } = ensureAuthenticatedUser(997, extraHeaders);
  if (!token) {
    console.error('[Uncached AI] Authentication failed.');
    sleep(1);
    return;
  }

  const authHeaders = getAuthHeaders(token, extraHeaders);

  // POST /api/v1/ai/items/:id/summary (Triggers external Groq LLM inference on first call)
  const uncachedRes = http.post(
    `${ENDPOINTS.AI}/items/${data.uncachedFoodId}/summary`,
    JSON.stringify({}),
    {
      headers: authHeaders,
      tags: { name: 'POST /api/v1/ai/items/:id/summary (uncached)', endpoint: 'uncached_ai_summary', mode: 'uncached' },
    },
  );

  check(uncachedRes, {
    'uncached AI summary status is 200': (r) => r.status === 200,
    'uncached AI summary success is true': (r) => {
      try { return r.json('success') === true; } catch (_) { return false; }
    },
    'uncached AI summary contains valid aiData': (r) => {
      try {
        const aiData = r.json('aiData');
        return aiData && typeof aiData.sentiment === 'string' && Array.isArray(aiData.summaryBullets);
      } catch (_) {
        return false;
      }
    },
    'uncached AI within rate limits (not 429)': (r) => r.status !== 429,
  });

  // Generous sleep to respect external provider rate limits
  sleep(1.5);
}

/**
 * Resolves destination path for ai.json depending on execution directory
 */
function getSummaryFilePath() {
  if (env.SUMMARY_PATH) return env.SUMMARY_PATH;
  const pwd = env.PWD || '';
  if (pwd.endsWith('Load-tests') || pwd.endsWith('Load-tests/')) {
    return 'results/ai.json';
  }
  return 'Load-tests/results/ai.json';
}

/**
 * Custom readable terminal summary formatter with Cached vs Uncached latency breakdown
 */
function formatTerminalSummary(data, summaryPath) {
  const m = data.metrics;
  const httpReqs = m.http_reqs ? m.http_reqs.values.count : 0;
  const httpFailed = m.http_req_failed ? (m.http_req_failed.values.rate * 100).toFixed(2) : '0.00';
  const duration = m.http_req_duration ? m.http_req_duration.values : {};
  const checks = m.checks ? m.checks.values : { passes: 0, fails: 0 };
  const totalChecks = checks.passes + checks.fails;
  const checkRate = totalChecks > 0 ? ((checks.passes / totalChecks) * 100).toFixed(2) : '100.00';

  let out = '\n' + '='.repeat(74) + '\n';
  out += '         SMARTCRAVING - AI REVIEW SUMMARIES LOAD TEST RESULTS             \n';
  out += '                 (CACHED VS UNCACHED LLM BENCHMARK)                       \n';
  out += '='.repeat(74) + '\n\n';

  out += `  Target API URL     : ${BASE_URL}\n`;
  out += '  LLM Provider       : Groq Cloud API (openai/gpt-oss-20b)\n';
  out += `  Total HTTP Reqs    : ${httpReqs}\n`;
  out += `  Check Pass Rate    : ${checkRate}% (${checks.passes}/${totalChecks} checks passed)\n`;
  out += `  Failure Rate       : ${httpFailed}%\n\n`;

  out += '  Overall Latency Overview (ms):\n';
  out += `    Average          : ${duration.avg ? duration.avg.toFixed(2) : '-'} ms\n`;
  out += `    Median (p50)     : ${duration.med ? duration.med.toFixed(2) : '-'} ms\n`;
  out += `    90th Percentile  : ${duration['p(90)'] ? duration['p(90)'].toFixed(2) : '-'} ms\n`;
  out += `    95th Percentile  : ${duration['p(95)'] ? duration['p(95)'].toFixed(2) : '-'} ms\n`;
  out += `    99th Percentile  : ${duration['p(99)'] ? duration['p(99)'].toFixed(2) : '-'} ms\n`;
  out += `    Maximum          : ${duration.max ? duration.max.toFixed(2) : '-'} ms\n\n`;

  out += '  Cached vs Uncached Latency Breakdown (p95):\n';
  const endpoints = [
    { key: 'cached_store_summary', label: 'POST /stores/:id/summary (Cached)', expected: '< 300 ms' },
    { key: 'cached_item_summary', label: 'POST /items/:id/summary  (Cached)', expected: '< 300 ms' },
    { key: 'uncached_ai_summary', label: 'POST /items/:id/summary  (Uncached LLM)', expected: '< 4000 ms' },
  ];

  for (const ep of endpoints) {
    const metricKey = `http_req_duration{endpoint:${ep.key}}`;
    const epMetric = m[metricKey];
    const epP95 = epMetric && epMetric.values ? epMetric.values['p(95)'].toFixed(2) + ' ms' : 'N/A';
    out += `    - ${ep.label.padEnd(38)} : p(95) = ${epP95.padEnd(12)} (Target: ${ep.expected})\n`;
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
    out += '    ✓ All AI SLA performance thresholds were satisfied.\n';
  }

  out += `\n  Summary JSON saved to : ${summaryPath}\n`;
  out += '='.repeat(74) + '\n';
  return out;
}

/**
 * k6 handleSummary hook: formats terminal output and writes JSON summary to ai.json
 */
export function handleSummary(data) {
  const summaryPath = getSummaryFilePath();
  return {
    stdout: formatTerminalSummary(data, summaryPath),
    [summaryPath]: JSON.stringify(data, null, 2),
  };
}
