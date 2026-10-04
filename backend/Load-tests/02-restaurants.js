import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ENDPOINTS, jsonHeaders } from './config.js';

// Environment variable overrides
const env = typeof __ENV !== 'undefined' ? __ENV : {};
const isQuick = env.QUICK === 'true' || env.FAST === 'true';

// Fallback IDs from verified project seed dataset (Internship.restaurants_560_reviews.json & Internship.fooditems.json)
const FALLBACK_STORE_ID = env.TEST_STORE_ID || '66716cb0e1a78e67dc8c8dbf';
const FALLBACK_FOOD_ID = env.TEST_FOOD_ID || '6671545ce1a78e67dc8c8d9e';

/**
 * Load Test Options & Realistic Staging for Public Read Endpoints:
 * Default: 10 VUs -> 30 VUs -> 50 VUs -> 100 VUs -> ramp down
 * Quick mode (QUICK=true): 5s (5 VUs) -> 10s (10 VUs) -> 5s (0 VUs)
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
        { duration: '30s', target: 100 }, // Ramp-up to 100 VUs (peak load)
        { duration: '1m', target: 100 },  // Sustained peak load at 100 VUs
        { duration: '30s', target: 0 },   // Graceful ramp-down to 0 VUs
      ],
  thresholds: {
    // Read-heavy public endpoints are fast and cached in-memory by the backend (cacheResponse)
    http_req_failed: ['rate<0.01'],                  // HTTP failure rate under 1%
    http_req_duration: ['p(95)<300', 'p(99)<600'],   // Global latency: 95% < 300ms, 99% < 600ms

    // Granular Per-Endpoint SLAs
    'http_req_duration{endpoint:count}': ['p(95)<200'],        // Cached aggregate count
    'http_req_duration{endpoint:stores}': ['p(95)<350'],       // Cached store catalog
    'http_req_duration{endpoint:store_detail}': ['p(95)<250'], // Store by ID
    'http_req_duration{endpoint:store_menus}': ['p(95)<250'],  // Menus by store ID
    'http_req_duration{endpoint:store_items}': ['p(95)<250'],  // Items by store ID
    'http_req_duration{endpoint:item_detail}': ['p(95)<200'],  // Dish item by ID
    'http_req_duration{endpoint:coupons}': ['p(95)<200'],      // Active promo coupons
  },
};

/**
 * Setup lifecycle hook:
 * 1. Verifies backend connectivity
 * 2. Dynamically discovers real store and dish ObjectIds from the live database
 * 3. Falls back gracefully to verified seed IDs or TEST_STORE_ID / TEST_FOOD_ID
 */
export function setup() {
  const healthRes = http.get(ENDPOINTS.HEALTH, {
    tags: { name: 'GET /health (pre-check)' },
  });

  if (healthRes.status !== 200) {
    console.warn(`[Setup Warning] Health check at ${ENDPOINTS.HEALTH} returned ${healthRes.status}. Verify backend is running.`);
  }

  let storeIds = [];
  let foodIds = [];

  // Query live stores list to extract real database IDs
  const storesRes = http.get(`${ENDPOINTS.EATS}/stores`, {
    headers: jsonHeaders,
    tags: { name: 'GET /api/v1/eats/stores (setup discovery)' },
  });

  if (storesRes.status === 200) {
    try {
      const body = storesRes.json();
      const list = body.restaurants || (body.data && body.data.restaurants) || [];
      storeIds = list.map((s) => s._id).filter(Boolean);

      if (Array.isArray(body.foodItems) && body.foodItems.length > 0) {
        foodIds = body.foodItems.map((f) => f._id).filter(Boolean);
      }
    } catch (_) {}
  }

  // Ensure we have store IDs (prepend explicit env var if provided)
  if (env.TEST_STORE_ID && !storeIds.includes(env.TEST_STORE_ID)) {
    storeIds.unshift(env.TEST_STORE_ID);
  }
  if (storeIds.length === 0) {
    storeIds.push(FALLBACK_STORE_ID);
  }

  // Discover real food item IDs for the discovered store if none were returned in /stores
  if (foodIds.length === 0 && storeIds.length > 0) {
    const itemsRes = http.get(`${ENDPOINTS.EATS}/items/${storeIds[0]}`, {
      headers: jsonHeaders,
      tags: { name: 'GET /api/v1/eats/items/:storeId (setup discovery)' },
    });

    if (itemsRes.status === 200) {
      try {
        const body = itemsRes.json();
        const list = Array.isArray(body.data) ? body.data : (body.foodItems || []);
        foodIds = list.map((f) => f._id).filter(Boolean);
      } catch (_) {}
    }
  }

  // Ensure we have food IDs (prepend explicit env var if provided)
  if (env.TEST_FOOD_ID && !foodIds.includes(env.TEST_FOOD_ID)) {
    foodIds.unshift(env.TEST_FOOD_ID);
  }
  if (foodIds.length === 0) {
    foodIds.push(FALLBACK_FOOD_ID);
  }

  return {
    storeIds,
    foodIds,
    targetUrl: BASE_URL,
    discoveredStoresCount: storeIds.length,
    discoveredFoodsCount: foodIds.length,
  };
}

/**
 * Default Virtual User Iteration Scenario
 * Simulates read-heavy customer browsing patterns:
 *   1. GET /api/v1/eats/restaurants/count
 *   2. GET /api/v1/eats/stores
 *   3. GET /api/v1/eats/stores/:storeId
 *   4. GET /api/v1/eats/stores/:storeId/menus
 *   5. GET /api/v1/eats/items/:storeId
 *   6. GET /api/v1/eats/item/:foodId
 *   7. GET /api/v1/coupon/
 */
export default function (data) {
  const storeIds = (data && data.storeIds && data.storeIds.length > 0) ? data.storeIds : [FALLBACK_STORE_ID];
  const foodIds = (data && data.foodIds && data.foodIds.length > 0) ? data.foodIds : [FALLBACK_FOOD_ID];

  // Pick deterministic/round-robin store and food item per VU to distribute cache keys across real entities
  const storeId = storeIds[__VU % storeIds.length];
  const foodId = foodIds[__VU % foodIds.length];

  // Optional query params to simulate realistic customer keyword searches
  const searchQueries = ['', '?keyword=pizza', '?keyword=burger', '?keyword=biryani', '?ratings[gte]=4'];
  const searchParam = searchQueries[(__ITER || 0) % searchQueries.length];

  // =========================================================================
  // 1. GET /api/v1/eats/restaurants/count
  // =========================================================================
  const countRes = http.get(`${ENDPOINTS.EATS}/restaurants/count`, {
    headers: jsonHeaders,
    tags: { name: 'GET /api/v1/eats/restaurants/count', endpoint: 'count' },
  });

  check(countRes, {
    'count status is 200': (r) => r.status === 200,
    'count success is true': (r) => {
      try { return r.json('success') === true; } catch (_) { return false; }
    },
    'count returns numeric total': (r) => {
      try {
        const val = r.json('count');
        return typeof val === 'number' && val >= 0;
      } catch (_) { return false; }
    },
  });

  // =========================================================================
  // 2. GET /api/v1/eats/stores (Catalog browsing with search/filters)
  // =========================================================================
  const storesRes = http.get(`${ENDPOINTS.EATS}/stores${searchParam}`, {
    headers: jsonHeaders,
    tags: { name: 'GET /api/v1/eats/stores', endpoint: 'stores' },
  });

  check(storesRes, {
    'stores status is 200': (r) => r.status === 200,
    'stores status is success': (r) => {
      try { return r.json('status') === 'success'; } catch (_) { return false; }
    },
    'stores returns restaurant list': (r) => {
      try {
        const list = r.json('restaurants');
        return Array.isArray(list);
      } catch (_) { return false; }
    },
  });

  // =========================================================================
  // 3. GET /api/v1/eats/stores/:storeId (Restaurant profile detail)
  // =========================================================================
  const storeDetailRes = http.get(`${ENDPOINTS.EATS}/stores/${storeId}`, {
    headers: jsonHeaders,
    tags: { name: 'GET /api/v1/eats/stores/:storeId', endpoint: 'store_detail' },
  });

  check(storeDetailRes, {
    'store detail status is 200': (r) => r.status === 200,
    'store detail status is success': (r) => {
      try { return r.json('status') === 'success'; } catch (_) { return false; }
    },
    'store detail has valid data': (r) => {
      try {
        const doc = r.json('data');
        return doc && (doc._id === storeId || !!doc.name);
      } catch (_) { return false; }
    },
  });

  // =========================================================================
  // 4. GET /api/v1/eats/stores/:storeId/menus (Restaurant menus)
  // =========================================================================
  const menusRes = http.get(`${ENDPOINTS.EATS}/stores/${storeId}/menus`, {
    headers: jsonHeaders,
    tags: { name: 'GET /api/v1/eats/stores/:storeId/menus', endpoint: 'store_menus' },
  });

  check(menusRes, {
    'store menus status is 200': (r) => r.status === 200,
    'store menus status is success': (r) => {
      try { return r.json('status') === 'success'; } catch (_) { return false; }
    },
    'store menus data is array': (r) => {
      try { return Array.isArray(r.json('data')); } catch (_) { return false; }
    },
  });

  // =========================================================================
  // 5. GET /api/v1/eats/items/:storeId (Dishes/Items by store)
  // =========================================================================
  const storeItemsRes = http.get(`${ENDPOINTS.EATS}/items/${storeId}`, {
    headers: jsonHeaders,
    tags: { name: 'GET /api/v1/eats/items/:storeId', endpoint: 'store_items' },
  });

  check(storeItemsRes, {
    'store items status is 200': (r) => r.status === 200,
    'store items status is success': (r) => {
      try { return r.json('status') === 'success'; } catch (_) { return false; }
    },
    'store items data is array': (r) => {
      try { return Array.isArray(r.json('data')); } catch (_) { return false; }
    },
  });

  // =========================================================================
  // 6. GET /api/v1/eats/item/:foodId (Specific dish detail)
  // =========================================================================
  const itemDetailRes = http.get(`${ENDPOINTS.EATS}/item/${foodId}`, {
    headers: jsonHeaders,
    tags: { name: 'GET /api/v1/eats/item/:foodId', endpoint: 'item_detail' },
  });

  check(itemDetailRes, {
    'item detail status is 200': (r) => r.status === 200,
    'item detail status is success': (r) => {
      try { return r.json('status') === 'success'; } catch (_) { return false; }
    },
    'item detail has valid foodItem': (r) => {
      try {
        const doc = r.json('data');
        return doc && (doc._id === foodId || !!doc.name);
      } catch (_) { return false; }
    },
  });

  // =========================================================================
  // 7. GET /api/v1/coupon/ (Active promotional discounts)
  // =========================================================================
  const couponsRes = http.get(`${ENDPOINTS.COUPONS}/`, {
    headers: jsonHeaders,
    tags: { name: 'GET /api/v1/coupon/', endpoint: 'coupons' },
  });

  check(couponsRes, {
    'coupons status is 200': (r) => r.status === 200,
    'coupons status is success': (r) => {
      try { return r.json('status') === 'success'; } catch (_) { return false; }
    },
    'coupons returns data array': (r) => {
      try { return Array.isArray(r.json('data')); } catch (_) { return false; }
    },
  });

  // Realistic human reading/pacing pause
  sleep(1);
}

/**
 * Resolves destination path for restaurants.json depending on execution directory
 */
function getSummaryFilePath() {
  if (env.SUMMARY_PATH) return env.SUMMARY_PATH;
  const pwd = env.PWD || '';
  if (pwd.endsWith('Load-tests') || pwd.endsWith('Load-tests/')) {
    return 'results/restaurants.json';
  }
  return 'Load-tests/results/restaurants.json';
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

  let out = '\n' + '='.repeat(68) + '\n';
  out += '     SMARTCRAVING - RESTAURANTS & MENUS LOAD TEST RESULTS     \n';
  out += '='.repeat(68) + '\n\n';

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
    { key: 'count', label: 'restaurants/count' },
    { key: 'stores', label: 'eats/stores' },
    { key: 'store_detail', label: 'eats/stores/:id' },
    { key: 'store_menus', label: 'stores/:id/menus' },
    { key: 'store_items', label: 'items/:storeId' },
    { key: 'item_detail', label: 'eats/item/:foodId' },
    { key: 'coupons', label: 'coupon/' },
  ];

  for (const ep of endpoints) {
    const metricKey = `http_req_duration{endpoint:${ep.key}}`;
    const epMetric = m[metricKey];
    const epP95 = epMetric && epMetric.values ? epMetric.values['p(95)'].toFixed(2) + ' ms' : 'N/A';
    out += `    - ${ep.label.padEnd(20)} : p(95) = ${epP95}\n`;
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
    out += '    ✓ All performance thresholds were satisfied.\n';
  }

  out += `\n  Summary JSON saved to : ${summaryPath}\n`;
  out += '='.repeat(68) + '\n';
  return out;
}

/**
 * k6 handleSummary hook: formats terminal output and writes JSON summary to restaurants.json
 */
export function handleSummary(data) {
  const summaryPath = getSummaryFilePath();
  return {
    stdout: formatTerminalSummary(data, summaryPath),
    [summaryPath]: JSON.stringify(data, null, 2),
  };
}
