import http from 'k6/http';
import { ENDPOINTS, TEST_USER, TEST_ADMIN, jsonHeaders } from '../config.js';
import { checkAuthResponse } from './checks.js';

/**
 * Logs in a user via POST /api/v1/users/login.
 *
 * Note: The backend enforces an authAttemptLimiter (6 requests per 15 minutes per IP).
 * For load tests, call this inside k6's setup() lifecycle hook and pass the returned
 * token to the default VU function to avoid hitting rate limits.
 *
 * @param {string} email
 * @param {string} password
 * @returns {{ token: string|null, user: object|null, response: object }}
 */
export function login(email, password) {
  const payload = JSON.stringify({ email, password });
  const res = http.post(`${ENDPOINTS.USERS}/login`, payload, {
    headers: jsonHeaders,
    tags: { name: 'POST /api/v1/users/login' },
  });

  checkAuthResponse(res, 'login');

  let token = null;
  let user = null;

  try {
    const data = res.json();
    if (data && data.token) {
      token = data.token;
      user = data.data && data.data.user ? data.data.user : null;
    }
  } catch (_) {
    // handled by checks
  }

  return { token, user, response: res };
}

/**
 * Registers a new user via POST /api/v1/users/signup.
 *
 * Requires: { name, email, password, passwordConfirm, phoneNumber }
 * Note: Public signups are strictly role: "user".
 *
 * @param {object} userData
 * @returns {{ token: string|null, user: object|null, response: object }}
 */
export function signup(userData) {
  const payload = JSON.stringify(userData);
  const res = http.post(`${ENDPOINTS.USERS}/signup`, payload, {
    headers: jsonHeaders,
    tags: { name: 'POST /api/v1/users/signup' },
  });

  checkAuthResponse(res, 'signup');

  let token = null;
  let user = null;

  try {
    const data = res.json();
    if (data && data.token) {
      token = data.token;
      user = data.data && data.data.user ? data.data.user : null;
    }
  } catch (_) {
    // handled by checks
  }

  return { token, user, response: res };
}

/**
 * Authenticates using the configured standard test user credentials.
 *
 * @returns {{ token: string|null, user: object|null, response: object }}
 */
export function loginTestUser() {
  return login(TEST_USER.email, TEST_USER.password);
}

/**
 * Authenticates using the configured admin user credentials.
 *
 * @returns {{ token: string|null, user: object|null, response: object }}
 */
export function loginAdminUser() {
  return login(TEST_ADMIN.email, TEST_ADMIN.password);
}

/**
 * Generates headers for authenticated requests using Bearer token.
 *
 * @param {string} token - JWT token string
 * @param {object} [extraHeaders={}] - Additional headers to merge
 * @returns {object} Headers dictionary with Authorization header
 */
export function getAuthHeaders(token, extraHeaders = {}) {
  const headers = {
    ...jsonHeaders,
    ...extraHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
