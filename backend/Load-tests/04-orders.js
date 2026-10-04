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
const FALLBACK_ORDER_ID = env.TEST_ORDER_ID || '6a82a13c4d3cb721c8a002a3';

/**
 * Load Test Options & Multi-Scenario Configuration:
 *
 * Backend Order Implementation Analysis:
 * 1. POST /api/v1/eats/orders/new:
 *    - Middleware: orderCreationLimiter (strict limit of 15 req/10 min), protect, authorizeRoles("user", "restaurant-owner"), validateCreateOrder
 *    - Schema requirements: orderItems (valid fooditem MongoId & qty >= 1), deliveryInfo (address, city, phoneNo, postalCode), restaurant (MongoId)
 *    - Controller: requires session_id starting with 'cs_' and queries Stripe API (paymentProvider.retrieveSession)
 *    - Finalization: requires session.payment_status === 'paid', customer email match, non-empty Cart in MongoDB,
 *      atomic stock decrement, Order creation, and cart deletion.
 *    - SAFETY REQUIREMENT: Blindly running order creation under high load would spam Stripe, deplete inventory stock,
 *      and pollute database orders. Therefore, order creation is strictly isolated to Scenario B with controlled iterations.
 *
 * 2. GET /api/v1/eats/orders/me/myOrders & GET /api/v1/eats/orders/:id:
 *    - High-throughput read operations.
 *    - GET /:id enforces tenant security isolation (returns 200 for owner/admin, 403 for other customers).
 *    - Handled under higher staged load in Scenario A.
 */
export const options = {
  scenarios: {
    // Scenario A: Read-Only Order Load Test (Higher Staged Read Load)
    read_orders_load: {
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
            { duration: '20s', target: 30 }, // Ramp-up to 30 VUs
            { duration: '40s', target: 30 }, // Steady load at 30 VUs
            { duration: '20s', target: 50 }, // Ramp-up to 50 VUs (peak load)
            { duration: '40s', target: 50 }, // Sustained peak load at 50 VUs
            { duration: '20s', target: 0 },  // Graceful ramp-down to 0
          ],
      exec: 'readOrdersScenario',
    },
    // Scenario B: Controlled Order-Creation Test (Strictly Controlled, Low Iterations, No Live Stripe Charges)
    controlled_order_creation: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: isQuick ? 1 : 2,
      maxDuration: '30s',
      startTime: '2s', // Stagger slightly after read test initialization
      exec: 'controlledCreationScenario',
    },
  },
  thresholds: {
    // Global SLAs
    http_req_failed: ['rate<0.02'],                  // Unexpected error rate under 2%
    http_req_duration: ['p(95)<1500', 'p(99)<2500'], // Global latency SLAs

    // Granular Per-Endpoint SLAs
    'http_req_duration{endpoint:my_orders}': ['p(95)<450'],   // Populated user order history
    'http_req_duration{endpoint:get_order}': ['p(95)<850'],   // Populated single order lookup / auth guard (3x Mongoose populates)
    'http_req_duration{endpoint:new_order}': ['p(95)<1200'],  // Schema + Stripe payment provider interaction
  },
};

/**
 * Setup lifecycle hook:
 * 1. Verifies backend connectivity
 * 2. Dynamically discovers an active restaurant and food item for order payload tests
 * 3. Identifies or verifies a sample order ID for single order detail lookups
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
  let sampleOrderId = env.TEST_ORDER_ID || FALLBACK_ORDER_ID;

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
    sampleOrderId,
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

  const email = `order_user_vu${vuId}_${Date.now()}@loadtest.local`;
  const password = 'Password123!';
  const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000);
  const phoneNumber = `98${phoneSuffix}`.slice(0, 10);

  const signupRes = http.post(
    `${ENDPOINTS.USERS}/signup`,
    JSON.stringify({
      name: `Order User ${vuId}`,
      email,
      password,
      passwordConfirm: password,
      phoneNumber,
    }),
    {
      headers: { ...jsonHeaders, ...extraHeaders },
      tags: { name: 'POST /api/v1/users/signup (order auth)', endpoint: 'auth' },
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
        tags: { name: 'POST /api/v1/users/login (order auth fallback)', endpoint: 'auth' },
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
 * Scenario A: Read-Only Order Load Test (Executed under higher staged load)
 * Endpoints tested:
 *   1. GET /api/v1/eats/orders/me/myOrders (Customer order list)
 *   2. GET /api/v1/eats/orders/:id         (Single order lookup / security guard)
 */
export function readOrdersScenario(data) {
  // Distributed IP simulation to avoid rate limiter bottlenecks
  const clientIp = `10.${(__VU % 250) + 1}.${((__ITER || 0) % 250) + 1}.1`;
  const extraHeaders = {
    'X-Forwarded-For': clientIp,
  };

  // 1. Authenticate customer
  const { token } = ensureAuthenticatedUser(__VU, extraHeaders);
  if (!token) {
    console.error(`[VU ${__VU}] Failed to authenticate order customer.`);
    sleep(1);
    return;
  }

  const authHeaders = getAuthHeaders(token, extraHeaders);

  // =========================================================================
  // 2. GET /api/v1/eats/orders/me/myOrders
  // =========================================================================
  const myOrdersRes = http.get(
    `${ENDPOINTS.ORDERS}/me/myOrders`,
    {
      headers: authHeaders,
      tags: { name: 'GET /api/v1/eats/orders/me/myOrders', endpoint: 'my_orders' },
    },
  );

  let targetOrderId = data.sampleOrderId || FALLBACK_ORDER_ID;

  check(myOrdersRes, {
    'myOrders status is 200': (r) => r.status === 200,
    'myOrders returns success true': (r) => {
      try { return r.json('success') === true; } catch (_) { return false; }
    },
    'myOrders returns orders array': (r) => {
      try {
        const orders = r.json('orders');
        if (Array.isArray(orders) && orders.length > 0 && orders[0]._id) {
          targetOrderId = orders[0]._id;
        }
        return Array.isArray(orders);
      } catch (_) {
        return false;
      }
    },
  });

  // Short pause between reads
  sleep(0.5);

  // =========================================================================
  // 3. GET /api/v1/eats/orders/:id
  // If user owns an order: returns 200 OK with order document.
  // If querying an order belonging to another customer: returns 403 Forbidden (RBAC isolation).
  // Both statuses represent expected production behavior and verify router + Mongoose pipeline.
  // =========================================================================
  const orderRes = http.get(
    `${ENDPOINTS.ORDERS}/${targetOrderId}`,
    {
      headers: authHeaders,
      tags: { name: 'GET /api/v1/eats/orders/:id', endpoint: 'get_order' },
      responseCallback: http.expectedStatuses(200, 403),
    },
  );

  check(orderRes, {
    'get-order status is 200 (owned) or 403 (tenant isolation)': (r) => r.status === 200 || r.status === 403,
    'get-order response structure is valid': (r) => {
      try {
        const body = r.json();
        if (r.status === 200) {
          return body && body.success === true && !!body.order;
        }
        if (r.status === 403) {
          return body && (body.message === 'You are not allowed to view this order' || body.errMessage === 'You are not allowed to view this order');
        }
        return false;
      } catch (_) {
        return false;
      }
    },
  });

  // Pacing pause before next read cycle
  sleep(0.5);
}

/**
 * Scenario B: Controlled Order-Creation Test
 * Endpoint tested:
 *   POST /api/v1/eats/orders/new
 *
 * Safety Guarantees:
 *   - Runs with small controlled iterations (1 VU, 1-2 iterations).
 *   - Uses a simulated test checkout session ID (cs_loadtest_mock_...) so NO real Stripe payment or card charge occurs.
 *   - Validates the complete request payload against validateCreateOrder middleware.
 *   - Verifies the payment provider integration handles non-existent mock sessions safely (404/400) without unhandled 500 crashes.
 *   - Tests validation fast-fail on malformed session identifiers.
 */
export function controlledCreationScenario(data) {
  const storeId = data.storeId || FALLBACK_STORE_ID;
  const foodItemId = data.foodItemId || FALLBACK_FOOD_ID;

  // Use dedicated IP for controlled order creation
  const clientIp = `10.200.${(__VU % 50) + 1}.${((__ITER || 0) % 50) + 1}.1`;
  const extraHeaders = {
    'X-Forwarded-For': clientIp,
  };

  const { token } = ensureAuthenticatedUser(999, extraHeaders);
  if (!token) {
    console.error('[Controlled Order Creation] Authentication failed.');
    sleep(1);
    return;
  }

  const authHeaders = getAuthHeaders(token, extraHeaders);

  // =========================================================================
  // Step 1: POST /api/v1/eats/orders/new (Complete Valid Schema + Mock Session)
  // =========================================================================
  const mockSessionId = `cs_loadtest_mock_${Date.now()}_${__ITER || 0}`;
  const validOrderPayload = JSON.stringify({
    session_id: mockSessionId,
    orderItems: [
      {
        fooditem: foodItemId,
        quantity: 1,
      },
    ],
    deliveryInfo: {
      address: '123 Performance Testing Boulevard',
      city: 'Benchmark City',
      phoneNo: '9876543210',
      postalCode: '123456',
    },
    restaurant: storeId,
  });

  const validRes = http.post(
    `${ENDPOINTS.ORDERS}/new`,
    validOrderPayload,
    {
      headers: authHeaders,
      tags: { name: 'POST /api/v1/eats/orders/new', endpoint: 'new_order' },
      responseCallback: http.expectedStatuses(200, 400, 404),
    },
  );

  check(validRes, {
    'new-order status is handled safely (200, 400, or 404)': (r) => [200, 400, 404].includes(r.status),
    'new-order avoided unhandled 500 error': (r) => r.status !== 500,
    'new-order passed schema validation': (r) => {
      try {
        const msg = (r.json('message') || r.json('errMessage') || '').toLowerCase();
        return !msg.includes('validation') && !msg.includes('fooditem id') && !msg.includes('delivery address');
      } catch (_) {
        return false;
      }
    },
    'new-order within rate limits (not 429)': (r) => r.status !== 429,
  });

  sleep(1);

  // =========================================================================
  // Step 2: POST /api/v1/eats/orders/new (Validation Fast-Fail Guard)
  // Verifies fast-fail rejection when session_id does not start with "cs_"
  // =========================================================================
  const invalidSessionPayload = JSON.stringify({
    session_id: 'invalid_session_prefix',
    orderItems: [
      {
        fooditem: foodItemId,
        quantity: 1,
      },
    ],
    deliveryInfo: {
      address: '123 Performance Testing Boulevard',
      city: 'Benchmark City',
      phoneNo: '9876543210',
      postalCode: '123456',
    },
    restaurant: storeId,
  });

  const invalidRes = http.post(
    `${ENDPOINTS.ORDERS}/new`,
    invalidSessionPayload,
    {
      headers: authHeaders,
      tags: { name: 'POST /api/v1/eats/orders/new (invalid session validation)', endpoint: 'new_order' },
      responseCallback: http.expectedStatuses(400),
    },
  );

  check(invalidRes, {
    'invalid-session status is 400': (r) => r.status === 400,
    'invalid-session error message is "Invalid checkout session"': (r) => {
      try {
        const msg = r.json('message') || r.json('errMessage');
        return msg === 'Invalid checkout session';
      } catch (_) {
        return false;
      }
    },
  });

  sleep(1);
}

/**
 * Resolves destination path for orders.json depending on execution directory
 */
function getSummaryFilePath() {
  if (env.SUMMARY_PATH) return env.SUMMARY_PATH;
  const pwd = env.PWD || '';
  if (pwd.endsWith('Load-tests') || pwd.endsWith('Load-tests/')) {
    return 'results/orders.json';
  }
  return 'Load-tests/results/orders.json';
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
  out += '         SMARTCRAVING - ORDERS API LOAD TEST RESULTS (SCENARIOS A & B)   \n';
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
    { key: 'my_orders', label: 'GET /me/myOrders' },
    { key: 'get_order', label: 'GET /:id' },
    { key: 'new_order', label: 'POST /new' },
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
    out += '    ✓ All order SLA performance thresholds were satisfied.\n';
  }

  out += `\n  Summary JSON saved to : ${summaryPath}\n`;
  out += '='.repeat(70) + '\n';
  return out;
}

/**
 * k6 handleSummary hook: formats terminal output and writes JSON summary to orders.json
 */
export function handleSummary(data) {
  const summaryPath = getSummaryFilePath();
  return {
    stdout: formatTerminalSummary(data, summaryPath),
    [summaryPath]: JSON.stringify(data, null, 2),
  };
}
