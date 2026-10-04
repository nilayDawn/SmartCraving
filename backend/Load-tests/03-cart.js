import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ENDPOINTS, jsonHeaders } from './config.js';
import { getAuthHeaders } from './helpers/auth.js';

// Environment variable overrides
const env = typeof __ENV !== 'undefined' ? __ENV : {};
const isQuick = env.QUICK === 'true' || env.FAST === 'true';

// Fallback IDs from verified project seed dataset
const FALLBACK_STORE_ID = env.TEST_STORE_ID || '6671719fe1a78e67dc8c8dce';
const FALLBACK_FOOD_ID = env.TEST_FOOD_ID || '6671720fe1a78e67dc8c8dd8';

/**
 * Load Test Options & Realistic Staging for Customer Cart Flow:
 * Default: 10 VUs -> 25 VUs -> 50 VUs -> ramp down
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
        { duration: '20s', target: 10 }, // Ramp-up to 10 VUs
        { duration: '40s', target: 10 }, // Steady load at 10 VUs
        { duration: '20s', target: 25 }, // Ramp-up to 25 VUs
        { duration: '40s', target: 25 }, // Steady load at 25 VUs
        { duration: '20s', target: 50 }, // Ramp-up to 50 VUs (peak load)
        { duration: '40s', target: 50 }, // Sustained peak load at 50 VUs
        { duration: '20s', target: 0 },  // Graceful ramp-down to 0
      ],
  thresholds: {
    // Global latency accounts for initial setup discovery + bcrypt signup + populated MongoDB writes
    http_req_failed: ['rate<0.02'],                  // Error rate under 2%
    http_req_duration: ['p(95)<1800', 'p(99)<2500'], // Global 95% < 1.8s, 99% < 2.5s

    // Granular Per-Endpoint SLAs
    'http_req_duration{endpoint:add_to_cart}': ['p(95)<750'],   // Item validation + cart upsert + population
    'http_req_duration{endpoint:get_cart}': ['p(95)<400'],      // Populated cart query
    'http_req_duration{endpoint:update_cart}': ['p(95)<500'],   // Quantity update + population
    'http_req_duration{endpoint:delete_cart}': ['p(95)<500'],   // Item deletion + cart document cleanup
  },
};

/**
 * Setup lifecycle hook:
 * 1. Verifies backend connectivity
 * 2. Dynamically discovers an active restaurant and its associated food item
 * 3. Enforces the single-restaurant cart rule by ensuring food item belongs to the restaurant
 */
export function setup() {
  const healthRes = http.get(ENDPOINTS.HEALTH, {
    tags: { name: 'GET /health (pre-check)' },
  });

  if (healthRes.status !== 200) {
    console.warn(`[Setup Warning] Health check at ${ENDPOINTS.HEALTH} returned ${healthRes.status}. Verify backend is running.`);
  }

  let storeId = env.TEST_STORE_ID || null;
  let foodItemId = env.TEST_FOOD_ID || null;

  // 1. Discover a valid active store if not provided via env
  if (!storeId) {
    const storesRes = http.get(`${ENDPOINTS.EATS}/stores`, {
      headers: jsonHeaders,
      tags: { name: 'GET /api/v1/eats/stores (setup discovery)' },
    });

    if (storesRes.status === 200) {
      try {
        const body = storesRes.json();
        const list = body.restaurants || (body.data && body.data.restaurants) || [];
        if (list.length > 0 && list[0]._id) {
          storeId = list[0]._id;
        }
      } catch (_) {}
    }
  }

  if (!storeId) {
    storeId = FALLBACK_STORE_ID;
  }

  // 2. Discover a valid food item belonging strictly to this store
  if (!foodItemId) {
    const itemsRes = http.get(`${ENDPOINTS.EATS}/items/${storeId}`, {
      headers: jsonHeaders,
      tags: { name: 'GET /api/v1/eats/items/:storeId (setup discovery)' },
    });

    if (itemsRes.status === 200) {
      try {
        const body = itemsRes.json();
        const list = Array.isArray(body.data) ? body.data : (body.foodItems || []);
        if (list.length > 0 && list[0]._id) {
          foodItemId = list[0]._id;
        }
      } catch (_) {}
    }
  }

  if (!foodItemId) {
    foodItemId = FALLBACK_FOOD_ID;
  }

  return {
    targetUrl: BASE_URL,
    storeId,
    foodItemId,
  };
}

// Module-level state per Virtual User (persists across iterations of this VU)
let vuToken = null;
let vuUser = null;

/**
 * Ensures the Virtual User has an active, authenticated customer account.
 * Reuses the VU's account across iterations to prevent unnecessary bcrypt compute overhead.
 */
function ensureAuthenticatedUser(vuId, extraHeaders) {
  if (vuToken) return { token: vuToken, user: vuUser };

  const email = `cart_user_vu${vuId}_${Date.now()}@loadtest.local`;
  const password = 'Password123!';
  const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000);
  const phoneNumber = `98${phoneSuffix}`.slice(0, 10);

  const signupRes = http.post(
    `${ENDPOINTS.USERS}/signup`,
    JSON.stringify({
      name: `Cart User ${vuId}`,
      email,
      password,
      passwordConfirm: password,
      phoneNumber,
    }),
    {
      headers: { ...jsonHeaders, ...extraHeaders },
      tags: { name: 'POST /api/v1/users/signup (cart auth)', endpoint: 'auth' },
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
        tags: { name: 'POST /api/v1/users/login (cart auth fallback)', endpoint: 'auth' },
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
 * Default Virtual User Iteration Scenario
 * Executes the complete customer cart lifecycle:
 *   1. Authenticate customer & obtain credentials
 *   2. POST   /api/v1/eats/cart/add-to-cart       (Add valid item with quantity 1)
 *   3. GET    /api/v1/eats/cart/get-cart           (Fetch & verify populated cart)
 *   4. POST   /api/v1/eats/cart/update-cart-item   (Update item quantity to 3)
 *   5. GET    /api/v1/eats/cart/get-cart           (Fetch & verify updated quantity)
 *   6. DELETE /api/v1/eats/cart/delete-cart-item   (Remove item & clean up database)
 */
export default function (data) {
  const storeId = data.storeId || FALLBACK_STORE_ID;
  const foodItemId = data.foodItemId || FALLBACK_FOOD_ID;

  // Distributed IP simulation to avoid rate limiter bottlenecks
  const clientIp = `10.${(__VU % 250) + 1}.${((__ITER || 0) % 250) + 1}.1`;
  const extraHeaders = {
    'X-Forwarded-For': clientIp,
  };

  // 1 & 2. Authenticate customer and obtain credentials
  const { token } = ensureAuthenticatedUser(__VU, extraHeaders);
  if (!token) {
    console.error(`[VU ${__VU}] Failed to authenticate cart customer.`);
    sleep(1);
    return;
  }

  const authHeaders = getAuthHeaders(token, extraHeaders);

  // =========================================================================
  // 3. POST /api/v1/eats/cart/add-to-cart
  // =========================================================================
  const addPayload = JSON.stringify({
    foodItemId,
    restaurantId: storeId,
    quantity: 1,
  });

  const addRes = http.post(
    `${ENDPOINTS.CART}/add-to-cart`,
    addPayload,
    {
      headers: authHeaders,
      tags: { name: 'POST /api/v1/eats/cart/add-to-cart', endpoint: 'add_to_cart' },
    },
  );

  const addPassed = check(addRes, {
    'add-to-cart status is 200': (r) => r.status === 200,
    'add-to-cart returned updated cart': (r) => {
      try {
        const body = r.json();
        return body && body.cart && Array.isArray(body.cart.items) && body.cart.items.length > 0;
      } catch (_) {
        return false;
      }
    },
    'add-to-cart has valid food item': (r) => {
      try {
        const items = r.json('cart.items');
        return items.some((item) => {
          const id = item.foodItem && item.foodItem._id ? item.foodItem._id : item.foodItem;
          return String(id) === String(foodItemId);
        });
      } catch (_) {
        return false;
      }
    },
  });

  if (!addPassed) {
    sleep(1);
    return;
  }

  // =========================================================================
  // 4. GET /api/v1/eats/cart/get-cart (Initial fetch)
  // =========================================================================
  const get1Res = http.get(
    `${ENDPOINTS.CART}/get-cart`,
    {
      headers: authHeaders,
      tags: { name: 'GET /api/v1/eats/cart/get-cart', endpoint: 'get_cart' },
    },
  );

  check(get1Res, {
    'get-cart status is 200': (r) => r.status === 200,
    'get-cart status is success': (r) => {
      try { return r.json('status') === 'success'; } catch (_) { return false; }
    },
    'get-cart contains food item': (r) => {
      try {
        const items = r.json('data.items');
        return Array.isArray(items) && items.length > 0;
      } catch (_) {
        return false;
      }
    },
  });

  // Short human pause between user interactions
  sleep(0.5);

  // =========================================================================
  // 5. POST /api/v1/eats/cart/update-cart-item (Update quantity to 3)
  // =========================================================================
  const updatePayload = JSON.stringify({
    foodItemId,
    quantity: 3,
  });

  const updateRes = http.post(
    `${ENDPOINTS.CART}/update-cart-item`,
    updatePayload,
    {
      headers: authHeaders,
      tags: { name: 'POST /api/v1/eats/cart/update-cart-item', endpoint: 'update_cart' },
    },
  );

  check(updateRes, {
    'update-cart status is 200': (r) => r.status === 200,
    'update-cart quantity updated to 3': (r) => {
      try {
        const items = r.json('cart.items');
        const target = items.find((item) => {
          const id = item.foodItem && item.foodItem._id ? item.foodItem._id : item.foodItem;
          return String(id) === String(foodItemId);
        });
        return target && target.quantity === 3;
      } catch (_) {
        return false;
      }
    },
  });

  // =========================================================================
  // 6. GET /api/v1/eats/cart/get-cart (Re-fetch to verify updated quantity)
  // =========================================================================
  const get2Res = http.get(
    `${ENDPOINTS.CART}/get-cart`,
    {
      headers: authHeaders,
      tags: { name: 'GET /api/v1/eats/cart/get-cart', endpoint: 'get_cart' },
    },
  );

  check(get2Res, {
    're-fetch cart status is 200': (r) => r.status === 200,
    're-fetch cart has quantity 3': (r) => {
      try {
        const items = r.json('data.items');
        const target = items.find((item) => {
          const id = item.foodItem && item.foodItem._id ? item.foodItem._id : item.foodItem;
          return String(id) === String(foodItemId);
        });
        return target && target.quantity === 3;
      } catch (_) {
        return false;
      }
    },
  });

  // =========================================================================
  // 7. DELETE /api/v1/eats/cart/delete-cart-item (Remove item & clean DB)
  // =========================================================================
  const deletePayload = JSON.stringify({
    foodItemId,
  });

  const deleteRes = http.del(
    `${ENDPOINTS.CART}/delete-cart-item`,
    deletePayload,
    {
      headers: authHeaders,
      tags: { name: 'DELETE /api/v1/eats/cart/delete-cart-item', endpoint: 'delete_cart' },
    },
  );

  check(deleteRes, {
    'delete-cart status is 200': (r) => r.status === 200,
    'delete-cart confirmed removal': (r) => {
      try {
        const msg = (r.json('message') || '').toLowerCase();
        return msg.includes('deleted');
      } catch (_) {
        return false;
      }
    },
  });

  // Pacing pause before next iteration
  sleep(1);
}

/**
 * Resolves destination path for cart.json depending on execution directory
 */
function getSummaryFilePath() {
  if (env.SUMMARY_PATH) return env.SUMMARY_PATH;
  const pwd = env.PWD || '';
  if (pwd.endsWith('Load-tests') || pwd.endsWith('Load-tests/')) {
    return 'results/cart.json';
  }
  return 'Load-tests/results/cart.json';
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
  out += '          SMARTCRAVING - CUSTOMER CART FLOW LOAD TEST RESULTS          \n';
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
    { key: 'add_to_cart', label: 'POST /add-to-cart' },
    { key: 'get_cart', label: 'GET /get-cart' },
    { key: 'update_cart', label: 'POST /update-cart-item' },
    { key: 'delete_cart', label: 'DELETE /delete-cart-item' },
  ];

  for (const ep of endpoints) {
    const metricKey = `http_req_duration{endpoint:${ep.key}}`;
    const epMetric = m[metricKey];
    const epP95 = epMetric && epMetric.values ? epMetric.values['p(95)'].toFixed(2) + ' ms' : 'N/A';
    out += `    - ${ep.label.padEnd(28)} : p(95) = ${epP95}\n`;
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
    out += '    ✓ All cart SLA performance thresholds were satisfied.\n';
  }

  out += `\n  Summary JSON saved to : ${summaryPath}\n`;
  out += '='.repeat(68) + '\n';
  return out;
}

/**
 * k6 handleSummary hook: formats terminal output and writes JSON summary to cart.json
 */
export function handleSummary(data) {
  const summaryPath = getSummaryFilePath();
  return {
    stdout: formatTerminalSummary(data, summaryPath),
    [summaryPath]: JSON.stringify(data, null, 2),
  };
}
