/**
 * k6 Load Testing Configuration
 *
 * Configurable via k6 environment variables (-e VAR=value) or process env:
 *   - BASE_URL: Target host (default: http://localhost:4000)
 *   - TEST_USER_EMAIL: Standard customer test account email
 *   - TEST_USER_PASSWORD: Standard customer test account password
 *   - TEST_ADMIN_EMAIL: Admin test account email
 *   - TEST_ADMIN_PASSWORD: Admin test account password
 */

const env = typeof __ENV !== 'undefined' ? __ENV : {};

// Base URL configuration (strips trailing slashes)
export const BASE_URL = (env.BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
export const API_PREFIX = '/api/v1';
export const API_BASE_URL = `${BASE_URL}${API_PREFIX}`;

// Test user credentials
export const TEST_USER = {
  email: env.TEST_USER_EMAIL || 'testuser@example.com',
  password: env.TEST_USER_PASSWORD || 'Password123!',
};

// Admin user credentials
export const TEST_ADMIN = {
  email: env.TEST_ADMIN_EMAIL || 'admin@example.com',
  password: env.TEST_ADMIN_PASSWORD || 'AdminPass123!',
};

// Standard HTTP headers
export const jsonHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Common k6 thresholds that individual test suites can import and customize
export const defaultThresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests should complete within 500ms, 99% within 1000ms
  http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
};

// API Group Base Endpoints Dictionary
export const ENDPOINTS = {
  HEALTH: `${BASE_URL}/health`,
  USERS: `${API_BASE_URL}/users`,
  EATS: `${API_BASE_URL}/eats`,
  CART: `${API_BASE_URL}/eats/cart`,
  ORDERS: `${API_BASE_URL}/eats/orders`,
  PAYMENTS: `${API_BASE_URL}`,
  COUPONS: `${API_BASE_URL}/coupon`,
  AI: `${API_BASE_URL}/ai`,
};

// Helper to construct fully qualified URLs
export const getUrl = (path) => `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`; //it will ensure that the path starts with a single slash, regardless of how the user provides it.
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`; //it will ensure that the endpoint starts with a single slash, regardless of how the user provides it.
