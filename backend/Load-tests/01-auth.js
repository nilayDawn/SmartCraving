import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ENDPOINTS, jsonHeaders } from './config.js';
import { getAuthHeaders } from './helpers/auth.js';

// Environment variable overrides
const env = typeof __ENV !== 'undefined' ? __ENV : {};
const isQuick = env.QUICK === 'true' || env.FAST === 'true';

/**
 * Load Test Options & Realistic Staging:
 * Default: 10 VUs -> 30 VUs -> 50 VUs -> ramp down
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
        { duration: '40s', target: 10 }, // Sustained load at 10 VUs
        { duration: '20s', target: 30 }, // Ramp-up to 30 VUs
        { duration: '40s', target: 30 }, // Sustained load at 30 VUs
        { duration: '20s', target: 50 }, // Ramp-up to 50 VUs
        { duration: '40s', target: 50 }, // Peak load at 50 VUs
        { duration: '20s', target: 0 },  // Graceful ramp-down to 0
      ],
  thresholds: {
    // Global SLAs (account for bcrypt rounds: 12 CPU time + remote MongoDB Atlas TLS roundtrips)
    http_req_failed: ['rate<0.05'],                  // HTTP error rate under 5%
    http_req_duration: ['p(95)<1500', 'p(99)<2500'], // 95% of requests < 1.5s, 99% < 2.5s

    // Granular Per-Endpoint SLAs
    'http_req_duration{endpoint:signup}': ['p(95)<1600'], // Bcrypt 12 hashing overhead + remote DB insert
    'http_req_duration{endpoint:login}': ['p(95)<1300'],  // Bcrypt password comparison + JWT sign
    'http_req_duration{endpoint:me}': ['p(95)<400'],      // DB user document query
    'http_req_duration{endpoint:logout}': ['p(95)<150'],  // In-memory cookie invalidation
  },
};

/**
 * Setup lifecycle hook: verifies backend health before beginning load test
 */
export function setup() {
  const healthRes = http.get(ENDPOINTS.HEALTH, {
    tags: { name: 'GET /health (pre-check)' },
  });

  if (healthRes.status !== 200) {
    console.warn(`[Setup Warning] Health check at ${ENDPOINTS.HEALTH} returned ${healthRes.status}. Verify the backend is running.`);
  }

  return {
    targetUrl: BASE_URL,
    startedAt: new Date().toISOString(),
  };
}

/**
 * Default Virtual User Iteration Scenario
 * Simulates full customer authentication lifecycle:
 *   1. POST /api/v1/users/signup  -> Register unique account
 *   2. GET  /api/v1/users/me      -> Verify session profile
 *   3. GET  /api/v1/users/logout  -> Invalidate session
 *   4. POST /api/v1/users/login   -> Re-authenticate
 *   5. GET  /api/v1/users/me      -> Verify re-authenticated session
 */
export default function () {
  // Generate unique test user data conforming strictly to User schema and validation rules:
  // - name: 2-30 chars
  // - email: unique lowercase email
  // - password & passwordConfirm: minlength 6, matching
  // - phoneNumber: exactly 10 digits (/^[0-9]{10}$/)
  const uniqueId = `${__VU}_${__ITER}_${Date.now()}`;
  const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000); // 8 random digits
  const testUser = {
    name: `User ${__VU}`,
    email: `loadtest_${uniqueId}@loadtest.local`,
    password: 'Password123!',
    passwordConfirm: 'Password123!',
    phoneNumber: `98${phoneSuffix}`.slice(0, 10),
  };

  // Simulate distributed client IPs via X-Forwarded-For so the backend's
  // 6-requests/15-min authAttemptLimiter accurately models independent client IPs
  const clientIp = `10.${(__VU % 250) + 1}.${((__ITER || 0) % 250) + 1}.1`;
  const extraHeaders = {
    'X-Forwarded-For': clientIp,
  };

  // =========================================================================
  // 1. POST /api/v1/users/signup
  // =========================================================================
  const signupRes = http.post(
    `${ENDPOINTS.USERS}/signup`,
    JSON.stringify(testUser),
    {
      headers: { ...jsonHeaders, ...extraHeaders },
      tags: { name: 'POST /api/v1/users/signup', endpoint: 'signup' },
    },
  );

  const signupPassed = check(signupRes, {
    'signup status is 200': (r) => r.status === 200,
    'signup success is true': (r) => {
      try {
        return r.json('success') === true;
      } catch (_) {
        return false;
      }
    },
    'signup returned token': (r) => {
      try {
        const token = r.json('token');
        return typeof token === 'string' && token.length > 20;
      } catch (_) {
        return false;
      }
    },
    'signup returned user object': (r) => {
      try {
        return !!(r.json('data.user._id') || r.json('data.user.email'));
      } catch (_) {
        return false;
      }
    },
  });

  if (!signupPassed) {
    sleep(1);
    return;
  }

  const token = signupRes.json('token'); // Extract JWT token from signup response
  const authHeaders = getAuthHeaders(token, extraHeaders);  // Generate headers for authenticated requests

  // =========================================================================
  // 2. GET /api/v1/users/me (Fetch profile with Bearer token & cookie)
  // =========================================================================
  const meRes = http.get(
    `${ENDPOINTS.USERS}/me`,
    {
      headers: authHeaders,
      tags: { name: 'GET /api/v1/users/me', endpoint: 'me' },
    },
  );

  check(meRes, {
    'me status is 200': (r) => r.status === 200,
    'me success is true': (r) => {
      try {
        return r.json('success') === true;
      } catch (_) {
        return false;
      }
    },
    'me returns correct user email': (r) => {
      try {
        const email = r.json('user.email') || r.json('data.user.email');
        return email === testUser.email;
      } catch (_) {
        return false;
      }
    },
  });

  // =========================================================================
  // 3. GET /api/v1/users/logout
  // =========================================================================
  const logoutRes = http.get(
    `${ENDPOINTS.USERS}/logout`,
    {
      headers: authHeaders,
      tags: { name: 'GET /api/v1/users/logout', endpoint: 'logout' },
    },
  );

  check(logoutRes, {
    'logout status is 200': (r) => r.status === 200,
    'logout success is true': (r) => {
      try {
        return r.json('success') === true;
      } catch (_) {
        return false;
      }
    },
    'logout message received': (r) => {
      try {
        const msg = r.json('message') || '';
        return msg.toLowerCase().includes('logged out');
      } catch (_) {
        return false;
      }
    },
  });

  // =========================================================================
  // 4. POST /api/v1/users/login (Re-authenticate with created user)
  // =========================================================================
  const loginRes = http.post(
    `${ENDPOINTS.USERS}/login`,
    JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }),
    {
      headers: { ...jsonHeaders, ...extraHeaders },
      tags: { name: 'POST /api/v1/users/login', endpoint: 'login' },
    },
  );

  const loginPassed = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login success is true': (r) => {
      try {
        return r.json('success') === true;
      } catch (_) {
        return false;
      }
    },
    'login returned new token': (r) => {
      try {
        const newToken = r.json('token');
        return typeof newToken === 'string' && newToken.length > 20;
      } catch (_) {
        return false;
      }
    },
  });

  // =========================================================================
  // 5. GET /api/v1/users/me (Verify session renewed after login)
  // =========================================================================
  if (loginPassed) {
    const freshToken = loginRes.json('token');
    const freshAuthHeaders = getAuthHeaders(freshToken, extraHeaders);

    const postLoginMeRes = http.get(
      `${ENDPOINTS.USERS}/me`,
      {
        headers: freshAuthHeaders,
        tags: { name: 'GET /api/v1/users/me', endpoint: 'me' },
      },
    );

    check(postLoginMeRes, {
      'post-login me status is 200': (r) => r.status === 200,
    });
  }

  // Realistic think time between iterations
  sleep(1);
}

/**
 * Resolves the destination file path for auth.json depending on working directory
 */
function getSummaryFilePath() {
  if (env.SUMMARY_PATH) return env.SUMMARY_PATH;
  const pwd = env.PWD || '';
  if (pwd.endsWith('Load-tests') || pwd.endsWith('Load-tests/')) {
    return 'results/auth.json';
  }
  return 'Load-tests/results/auth.json';
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
  out += '          SMARTCRAVING - AUTHENTICATION LOAD TEST RESULTS          \n';
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
  const endpoints = ['signup', 'login', 'me', 'logout'];
  for (const ep of endpoints) {
    const metricKey = `http_req_duration{endpoint:${ep}}`;
    const epMetric = m[metricKey];
    const epP95 = epMetric && epMetric.values ? epMetric.values['p(95)'].toFixed(2) + ' ms' : 'N/A';
    out += `    - ${ep.padEnd(8)} : p(95) = ${epP95}\n`;
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
 * k6 handleSummary hook: formats terminal output and writes JSON summary to auth.json
 */
export function handleSummary(data) {
  const summaryPath = getSummaryFilePath();
  return {
    stdout: formatTerminalSummary(data, summaryPath), // Custom terminal summary
    [summaryPath]: JSON.stringify(data, null, 2),  // Save full JSON summary for further analysis
  };
}
