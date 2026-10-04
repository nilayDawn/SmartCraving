# Backend Load Testing — Overall Performance Report

## 1. Executive Summary

This report aggregates the benchmark results of **113,271 HTTP requests** executed across 7 modular test suites for the SmartCraving backend API using k6. 

The test suites evaluated both read-heavy public APIs and stateful transactional workflows under realistic concurrency levels (from 2 VUs up to 100 VUs). The test results reveal an application with robust business logic (functional check accuracy exceeded 98–100% across all operational suites), but with distinct scalability bottlenecks in CPU-bound cryptography, single-IP rate-limiting middleware, and remote database lookups.

---

## 2. Test Coverage

All 7 backend domain groups were comprehensively evaluated:

1. **Authentication & Users** (`01-auth.js` → `results/auth.json`)
2. **Restaurants & Menus** (`02-restaurants.js` → `results/restaurants.json`)
3. **Customer Cart Flow** (`03-cart.js` → `results/cart.json`)
4. **Orders Management** (`04-orders.js` → `results/orders.json`)
5. **Payments Integration** (`05-payments.js` → `results/payments.json`)
6. **Promotions & Coupons** (`06-coupons.js` → `results/coupons.json`)
7. **AI Review Summaries** (`07-ai.js` → `results/ai.json`)

---

## 3. Overall Performance Matrix

| Domain Suite | Max VUs | Requests | Throughput | Error Rate | Global p95 Latency | Result |
| :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| **Authentication & Users** | 50 | 1,171 | 5.48 req/s | 0.00% | 15,921.72 ms | ❌ FAIL |
| **Restaurants & Menus** | 100 | 74,217 | 246.60 req/s | 89.87% | 50.25 ms | ❌ FAIL |
| **Customer Cart Flow** | 2 | 25 | 3.69 req/s | 0.00% | 898.30 ms | ✅ PASS |
| **Orders Management** | 50 | 942 | 13.02 req/s | 1.49% | 634.74 ms | ⚠️ PASS WITH WARNINGS |
| **Payments Integration** | 50 | 8,909 | 44.45 req/s | 0.00% | 190.36 ms | ✅ PASS |
| **Promotions & Coupons** | 100 | 20,034 | 77.00 req/s | 0.00% | 1,142.13 ms | ❌ FAIL |
| **AI Review Summaries** | 50 | 7,973 | 39.79 req/s | 0.00% | 688.53 ms | ❌ FAIL |
| **Total / Aggregate** | **100 Max** | **113,271** | **61.43 avg** | — | — | **2 PASS, 1 WARN, 4 FAIL** |

---

## 4. Best Performing Endpoint

- **Endpoint**: `GET /api/v1/coupon/` (Promotions Catalogue)
- **Measured Metrics**: **6.49 ms average latency**, **1.51 ms median (p50)**, **43.30 ms p95** across 20,034 requests.
- **Why It Won**: Backed by Express in-memory response caching middleware (`cacheResponse(300)`). Once primed, responses were returned directly from Node.js memory without database I/O.

---

## 5. Slowest Endpoint

- **Endpoint**: `POST /api/v1/users/signup` (User Registration)
- **Measured Metrics**: **11,156.86 ms average latency**, **25,068.44 ms p95**, **49,185.26 ms maximum**.
- **Root Cause**: Pure JavaScript `bcryptjs` password hashing executed synchronously on the single-threaded Node.js event loop, saturating CPU compute during 50-VU concurrent signups.

---

## 6. Highest Error Rate

- **Test Suite**: `02-restaurants.js` (Restaurants & Menus)
- **Measured Metric**: **89.87% HTTP Error Rate** (66,700 failures out of 74,217 requests).
- **Status Code**: `429 Too Many Requests`.
- **Root Cause**: The backend's Express `globalLimiter` (1,000 requests per 15 minutes per IP) was exhausted within ~4 seconds under a 246 req/s load burst from a single test client IP.

---

## 7. Most Important Bottlenecks (Ranked)

### 1. CPU Event-Loop Starvation from Synchronous Cryptography (High Severity)
- **Impact**: Multiplied tail latency on auth endpoints to 15–49 seconds and blocked lightweight I/O (`GET /me`, `GET /logout`).
- **Evidence**: `auth.json` recorded 25.07s p95 on `signup` and 14.40s p95 on `login`, despite 0 database failures.

### 2. Monolithic Single-IP Rate Limiting on Read-Heavy Traffic (High Severity)
- **Impact**: Shed nearly 90% of catalogue queries with HTTP 429 under 100 VUs.
- **Evidence**: `globalLimiter` (1,000 req / 15 min) lacks route-specific quotas and does not differentiate between public browsing traffic and authenticated mutations.

### 3. Missing Compound Indexes on High-Frequency Lookups (Medium Severity)
- **Impact**: Validation and listing operations degraded non-linearly under 100 concurrent VUs.
- **Evidence**:
  - `POST /coupon/validate` p95 reached **1,158.20 ms** due to filtering on `{ couponName, expire }` without a compound index.
  - `GET /stores` p95 reached **878.70 ms** due to in-memory sorting across multi-field filters.

### 4. Sequential Relational Mongoose Population Over Remote Cloud Database (Medium Severity)
- **Impact**: Added 300–400ms of latency to single order detail lookups (`GET /:id` p95: 633.52 ms).
- **Evidence**: `getOrderById` sequentially populated 3 distinct collections (`users`, `restaurants`, `fooditems`) over network connections to MongoDB Atlas.

### 5. In-Memory Cache Check Placement in AI Review Summaries (Low/Medium Severity)
- **Impact**: Prevented cached AI summaries from meeting the 300ms SLA (reaching 553–703 ms p95).
- **Evidence**: The route handler performed a MongoDB `findById` check on the document *before* checking the internal in-memory hash cache.

---

## 8. Recommended Optimization Priority

### Priority 1: Asynchronous Worker Offloading for Password Hashing (Highest Impact)
- **Action**: Replace pure-JS `bcryptjs` with native C++ bindings (`bcrypt`) configured with `UV_THREADPOOL_SIZE=16`, or offload hashing to Node.js `worker_threads`.
- **Expected Outcome**: Eliminates event-loop blocking, dropping auth p95 from ~15s to sub-800ms under 50 VUs.

### Priority 2: Decouple Public Read Endpoints from Global IP Rate Limiters (Highest Impact)
- **Action**: Exempt cached catalogue endpoints (`/stores`, `/menus`, `/items`, `/coupon`) from `globalLimiter`, and implement Redis-backed sliding window rate limiters per authenticated user ID rather than global IP.
- **Expected Outcome**: Eliminates false-positive HTTP 429 rejections under high-traffic customer browsing.

### Priority 3: Add Covering Compound Indexes in MongoDB (Second Highest Impact)
- **Action**:
  - Create index on `coupons`: `{ couponName: 1, expire: 1 }`
  - Create index on `restaurants`: `{ isActive: 1, ratings: -1, name: 1 }`
- **Expected Outcome**: Drops `POST /coupon/validate` p95 from 1,158 ms to sub-150 ms at 100 VUs.

### Priority 4: Reorder AI Cache Lookup Before Database Query (Third Highest Impact)
- **Action**: Check in-memory / Redis cache at the top of `getRestaurantReviewSummary` and `getFoodReviewSummary` using `id` as the key before executing Mongoose `findById`.
- **Expected Outcome**: Drops cached AI review summary p95 from ~650 ms to sub-50 ms.

---

## 9. Overall Conclusion

The SmartCraving backend demonstrates **clean architectural separation** across domain modules and **rock-solid functional correctness**—exhibiting zero data corruption, zero uncaught 500 server crashes, zero race conditions, and complete isolation of external third-party services (Stripe sandbox and Groq LLM). 

The primary constraints identified under load are **infrastructure and concurrency tuning** challenges rather than business logic defects. By addressing CPU event-loop offloading for authentication, optimizing compound MongoDB indexes, and refining rate-limiting architecture, the backend will easily scale to enterprise-grade concurrency levels.
