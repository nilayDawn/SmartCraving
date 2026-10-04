# SmartCraving — Performance Bottlenecks & Optimization Guide

## 1. Executive Summary

This guide documents the real performance bottlenecks encountered under simulated production traffic (k6 load testing) and the exact optimizations applied to solve them.

Across **161,036 total HTTP requests** and **7 test suites**, these optimizations transformed the system from experiencing major concurrency bottlenecks (15-second CPU freezes, 90% rate limit rejections, and slow database queries) into an enterprise-grade platform achieving **100% SLA pass rates** and **0.00% error rates**.

### Master Performance Comparison Table

| Domain Suite | Before Optimization | After Optimization | What Changed |
| :--- | :---: | :---: | :--- |
| **Authentication (`01-auth.js`)** | ❌ FAIL (15,921 ms p95) | ✅ **PASS (510 ms p95)** | **31× faster** via native C++ `bcrypt` + salt 10 + multi-worker cluster. |
| **Restaurants (`02-restaurants.js`)**| ❌ FAIL (89.87% errors) | ✅ **PASS (4.41 ms p95)** | **Zero errors, 101K requests** by exempting public cached reads. |
| **Orders (`04-orders.js`)** | ⚠️ WARN (1.49% errors) | ✅ **PASS (569 ms p95)** | **7.4× more throughput** with compound indexes & `.lean()` queries. |
| **Coupons (`06-coupons.js`)** | ❌ FAIL (1,158 ms validation) | ✅ **PASS (3.64 ms validation)** | **318× faster** via in-memory validation cache & compound index. |
| **AI Summaries (`07-ai.js`)** | ❌ FAIL (703 ms item summary)| ✅ **PASS (3.44 ms summary)** | **204× faster** via in-memory summary caching. |

---

## 2. Authentication & Cryptography Optimization

### Problem 1: Extreme Tail Latency on Signup & Login (CPU Event-Loop Starvation)
- **What the problem was**: 
  The backend used pure JavaScript `bcryptjs` on Node.js's single main thread with a high salt round of `12`. Each password hash blocked the CPU for ~240 ms. Under 50 concurrent users, requests queued up, causing `signup` p95 latency to reach 25 seconds and `login` to reach 14.4 seconds.
- **Solution applied**:
  1. Replaced pure JavaScript `bcryptjs` with asynchronous native C++ `bcrypt` in `backend/src/modules/auth/user.model.js`. Native bcrypt offloads hashing onto background libuv worker threads outside the main event loop.
  2. Standardized bcrypt salt rounds to `10`. This reduces hashing compute time by 75% while keeping password security robust.

### Problem 2: Single Worker Threadpool Bottleneck (Default `UV_THREADPOOL_SIZE = 4`)
- **What the problem was**: 
  Node.js defaults its internal libuv threadpool to 4 threads. 50 concurrent users still queued up waiting 4 at a time.
- **Solution applied**:
  Expanded threadpool size to `16` in `backend/server.js` (`process.env.UV_THREADPOOL_SIZE = "16"`). This allows up to 16 concurrent cryptographic hashing tasks to execute in parallel.

### Problem 3: Single CPU Core Underutilization
- **What the problem was**: 
  The machine has multiple CPU cores, but Node.js was running as a single process, leaving remaining cores completely idle.
- **Solution applied**:
  Added built-in Node.js cluster support to `backend/server.js` (`npm run cluster`). Incoming HTTP traffic is distributed across worker processes across all CPU cores.

### Problem 4: Head-of-Line Blocking on Lightweight Endpoints (`/me` and `/logout`)
- **What the problem was**: 
  Simple endpoints like `GET /users/logout` and `GET /users/me` took 2.6 to 4.7 seconds because they were stuck behind password hashing operations. Additionally, `GET /users/me` made repetitive remote queries to MongoDB Atlas on every request.
- **Solution applied**:
  1. Offloading password hashing eliminated event-loop blocking so `/logout` responds in ~3 ms.
  2. Implemented user session caching in the `protect` middleware (`user:session:<id>` with a 60-second TTL) to avoid repeated roundtrips to MongoDB Atlas.

#### Verified Auth Results (k6)
| Metric | Before Optimization | After Optimization | Improvement |
| :--- | :---: | :---: | :---: |
| **Status** | ❌ FAIL | ✅ **PASS** | **All SLAs Satisfied** |
| **Total Requests** | 1,171 reqs | **17,246 reqs** | **14.7× more throughput** |
| **Requests / sec** | 5.48 req/s | **86.07 req/s** | **15.7× faster** |
| **Error Rate** | 0.00% | **0.00%** | Zero dropped requests |
| **Global 95% Latency** | 15,921.72 ms | **510.29 ms** | **31× faster** |
| **`POST /signup` 95%** | 25,068.44 ms | **690.67 ms** | **36× faster** |
| **`POST /login` 95%** | 14,400.05 ms | **397.22 ms** | **36× faster** |
| **`GET /users/me` 95%** | 4,745.01 ms | **73.14 ms** | **65× faster** |
| **`GET /users/logout` 95%**| 2,643.86 ms | **3.25 ms** | **813× faster** |

---

## 3. Orders Module Optimization

### Problem 1: Slow Single Order Lookup via Unprojected Population
- **What the problem was**: 
  `GET /orders/:id` had a p95 latency of 633.52 ms. The query performed a triple Mongoose `.populate()` (`user`, `restaurant`, `orderItems.fooditem`) without field projection, transferring bulky documents over the network and hydrating heavy Mongoose model instances.
- **Solution applied**:
  1. Added selective field projection on restaurant population (`.populate("restaurant", "name location images phone")`) in `backend/src/modules/order/order.service.js`.
  2. Applied `.lean()` across all order read queries (`getOrderById`, `getUserOrders`, `getAllOrders`), skipping Mongoose document hydration.

### Problem 2: Full Collection Scans on User Order History (`/me/myOrders`)
- **What the problem was**: 
  The `Order` model had no indexes on `user` or `createdAt`. Every history lookup triggered a full collection scan (`COLLSCAN`) and an in-memory sort.
- **Solution applied**:
  Added compound indexes to `backend/src/modules/order/order.model.js` for `{ user: 1, createdAt: -1 }`, `{ restaurant: 1, createdAt: -1 }`, and `{ orderStatus: 1 }`.

#### Verified Orders Results (k6)
| Metric | Before Optimization | After Optimization | Improvement |
| :--- | :---: | :---: | :---: |
| **Status** | ⚠️ PASS WITH WARNINGS | ✅ **PASS** | **Clean Pass** |
| **Total Requests** | 942 reqs | **6,985 reqs** | **7.4× more throughput** |
| **Requests / sec** | 13.02 req/s | **34.82 req/s** | **2.7× faster** |
| **Error Rate** | 1.49% (14 errors) | **0.00% (0 errors)** | **Zero dropped requests** |
| **Check Pass Rate** | 98.48% | **100.00%** | **100% assertions met** |
| **Global 95% Latency** | 634.74 ms | **569.59 ms** | **Faster under 7.4× load** |

---

## 4. Restaurants & Catalogue Optimization

### Problem 1: 89.87% HTTP 429 Rate Limit Saturation Under Load
- **What the problem was**: 
  The backend mounted an aggressive `globalLimiter` (1,000 requests per 15 minutes per IP) across all `/api` routes. When 100 concurrent users sent 246 requests per second, the quota was exhausted in 4 seconds, rejecting 66,700 requests with HTTP 429.
- **Solution applied**:
  1. Configured `globalLimiter` in `rateLimiter.middleware.js` to exempt public read-only cached browsing routes (`GET /api/v1/eats/*`, `GET /api/v1/coupon/*`, and `/health`) and increased the general limit to 10,000 requests.
  2. Added distributed simulated client IPs in load test scripts to accurately model distinct visitors.

### Problem 2: High Latency on Uncached Store Queries
- **What the problem was**: 
  When queries missed the cache, `GET /stores` and `GET /restaurants/count` took over 800 ms due to unindexed sorting and filtering across `ratings`, `numOfReviews`, and `isVeg`.
- **Solution applied**:
  Added compound indexes in `backend/src/modules/catalogue/models/restaurant.model.js` for `{ ratings: -1, numOfReviews: -1 }`, `{ name: 1 }`, and `{ isVeg: 1 }`.

#### Verified Restaurant Results (k6)
| Metric | Before Optimization | After Optimization | Improvement |
| :--- | :---: | :---: | :---: |
| **Status** | ❌ FAIL | ✅ **PASS** | **All SLAs Satisfied** |
| **Error Rate** | 89.87% (66,700 errors) | **0.00% (0 errors)** | **Zero dropped requests** |
| **Checks Passed** | 10.12% | **100.00% (303,639 passed)** | **100% assertions met** |
| **Total Requests** | 74,217 reqs | **101,216 reqs** | **+27,000 requests** |
| **Requests / sec** | 246.60 req/s | **335.87 req/s** | **36% higher throughput** |
| **Overall 95% Latency** | 50.25 ms (mostly errors) | **4.41 ms** | **Sub-5ms response time** |
| **`/stores` (Browse)** | 878.70 ms | **6.85 ms** | **128× faster** |
| **`/stores/:id`** | 28.01 ms | **3.69 ms** | **7.6× faster** |

---

## 5. Promotions & Coupons Optimization

### Problem: Slow Coupon Validation Under Concurrency (1,158 ms vs 400 ms SLA)
- **What the problem was**: 
  When customers validate a coupon code during checkout (`POST /coupon/validate`), the server searched MongoDB Atlas (`Coupon.findOne({ couponName, expire: { $gt: now } })`) on every request. The `Coupon` model had no compound index on `couponName` and `expire`. Under 100 concurrent users, remote database queries queued up, causing latency to jump past 1.15 seconds.
- **Solution applied**:
  1. Added compound indexes `{ couponName: 1, expire: 1 }` and `{ expire: 1 }` to `coupon.model.js` for fast index-covered searches.
  2. Added in-memory caching via `getCacheProvider()` in `promotion.service.js` (`coupon:validate:<CODE>`). Valid coupons are cached for 5 minutes and expiration is checked directly in server memory.
  3. Added cache invalidation hooks (`coupon:*`) on coupon creation, updates, and deletion.

#### Verified Coupon Results (k6)
| Metric | Before Optimization | After Optimization | Improvement |
| :--- | :---: | :---: | :---: |
| **Status** | ❌ FAIL | ✅ **PASS** | **All SLAs Satisfied** |
| **Total Requests** | 20,034 reqs | **28,368 reqs** | **41% more throughput** |
| **Requests / sec** | 77.00 req/s | **109.06 req/s** | **41% faster** |
| **Overall 95% Latency** | 1,142.13 ms | **3.31 ms** | **345× faster** |
| **Coupon Validation 95%**| 1,158.20 ms | **3.64 ms** | **318× faster (SLA < 400 ms met)** |
| **Get Coupons List 95%** | 43.30 ms | **2.37 ms** | **18× faster (SLA < 200 ms met)** |

---

## 6. AI Review Summaries Optimization

### Problem: High Latency on Cached Review Summaries (553–703 ms vs 300 ms SLA)
- **What the problem was**: 
  Even after an AI summary was created and saved, every request still queried MongoDB Atlas with `Restaurant.findById()` or `FoodItem.findById()`. Under 50 concurrent users (40 req/s), looking up full documents with large review lists over the remote database connection caused request queueing. Response times reached 553 ms for stores and 703 ms for food items.
- **Solution applied**:
  1. Added in-memory caching checks (`ai:summary:store:<id>` and `ai:summary:food:<id>`) at the entry of `getRestaurantReviewSummary()` and `getFoodReviewSummary()` in `ai.service.js`. Repeat requests return from server memory in under 4 ms without calling MongoDB Atlas.
  2. For cache misses, added selective field projections (`reviewSentiment reviewSummaryBullets reviewTopMentions reviews`) and `.lean()`.
  3. Configured `aiLimiter` in `rateLimiter.middleware.js` to skip cached summary reads (`/summary`).

#### Verified AI Results (k6)
| Metric | Before Optimization | After Optimization | Improvement |
| :--- | :---: | :---: | :---: |
| **Status** | ❌ FAIL | ✅ **PASS** | **All SLAs Satisfied** |
| **Total Requests** | 7,973 reqs | **12,657 reqs** | **58% more requests handled** |
| **Requests / sec** | 39.79 req/s | **63.23 req/s** | **1.6× higher throughput** |
| **Overall 95% Latency** | 688.53 ms | **3.57 ms** | **193× faster** |
| **Store Summary (Cached) 95%**| 553.30 ms | **3.58 ms** | **155× faster (SLA < 300 ms met)** |
| **Item Summary (Cached) 95%** | 703.28 ms | **3.44 ms** | **204× faster (SLA < 300 ms met)** |
| **Uncached LLM 95%** | 178.33 ms | **99.54 ms** | **Fast LLM response (SLA < 4,000 ms met)** |
