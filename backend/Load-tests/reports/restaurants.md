# Restaurants & Menus Catalogue — Load Test Report

## 1. Quick Summary

| Metric | Result | Status |
| :--- | :--- | :---: |
| **Test Result** | ✅ **PASS** (All performance and error targets passed) | ✅ |
| **Virtual Users (VUs)** | **100 concurrent users** | ✅ |
| **Total Requests** | **101,216 requests** (over 5 minutes) | ✅ |
| **Requests per Second** | **335.87 req/s** | ✅ |
| **Error Rate** | **0.00%** (0 failed requests out of 101,216) | ✅ |
| **Checks Passed** | **100.00%** (303,639 out of 303,639 checks passed) | ✅ |
| **95% Latency (p95)** | **4.41 ms** (Target was under 300 ms) | ✅ |
| **Average Response Time**| **1.74 ms** (Sub-2ms average) | ✅ |

---

## 2. Before vs. After the Fix

| What We Tested | Before (Broken) | After (Fixed) | What Changed |
| :--- | :---: | :---: | :---: |
| **Overall Result** | ❌ FAIL | ✅ **PASS** | Passed every SLA target |
| **Error Rate** | 89.87% (66,700 errors) | **0.00% (0 errors)** | No more 429 Too Many Requests |
| **Checks Passed** | 10.12% (200,100 failed) | **100.00% (303,639 passed)** | All functional checks passed |
| **Total Requests** | 74,217 requests | **101,216 requests** | Processed 27,000 more requests |
| **Requests / sec** | 246.60 req/s | **335.87 req/s** | 36% higher throughput |
| **Global 95% Latency** | 50.25 ms (mostly errors) | **4.41 ms** | Real responses served in <5ms |
| **`/restaurants/count`** | 820.76 ms | **2.12 ms** | **387× faster** |
| **`/stores` (Browse)** | 878.70 ms | **6.85 ms** | **128× faster** |
| **`/stores/:id` (Store)** | 28.01 ms | **3.69 ms** | **7.6× faster** |
| **`/stores/:id/menus`** | 171.62 ms | **3.03 ms** | **56× faster** |
| **`/items/:storeId`** | 54.09 ms | **2.66 ms** | **20× faster** |
| **`/coupon/` (Promos)** | 12.69 ms | **1.37 ms** | **9× faster** |

---

## 3. SLA Targets & Results

| Target Check | Target Limit | Our Result | Status |
| :--- | :---: | :---: | :---: |
| Error Rate (`http_req_failed`) | Under 1.00% | **0.00%** | ✅ PASS |
| Overall 95% Latency | Under 300 ms | **4.41 ms** | ✅ PASS |
| Overall 99% Latency | Under 600 ms | **Under 15 ms** | ✅ PASS |
| Restaurant Count Latency | Under 200 ms | **2.12 ms** | ✅ PASS |
| Stores Listing Latency | Under 350 ms | **6.85 ms** | ✅ PASS |
| Store Details Latency | Under 250 ms | **3.69 ms** | ✅ PASS |
| Menus Latency | Under 250 ms | **3.03 ms** | ✅ PASS |
| Food Items Latency | Under 250 ms | **2.66 ms** | ✅ PASS |
| Dish Detail Latency | Under 200 ms | **1.58 ms** | ✅ PASS |
| Coupons Latency | Under 200 ms | **1.37 ms** | ✅ PASS |

---

## 4. Response Time by Endpoint

| Endpoint | Requests | Average | Median (p50) | 90% (p90) | 95% (p95) | Max |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET /api/v1/eats/restaurants/count` | 14,459 | 1.23 ms | 1.02 ms | 1.59 ms | **2.12 ms** | 193.52 ms |
| `GET /api/v1/eats/stores` | 14,459 | 3.93 ms | 2.57 ms | 5.72 ms | **6.85 ms** | 451.73 ms |
| `GET /api/v1/eats/stores/:storeId` | 14,459 | 1.81 ms | 1.31 ms | 2.37 ms | **3.69 ms** | 188.76 ms |
| `GET /api/v1/eats/stores/:storeId/menus`| 14,459 | 2.05 ms | 1.34 ms | 2.28 ms | **3.03 ms** | 249.51 ms |
| `GET /api/v1/eats/items/:storeId` | 14,459 | 1.50 ms | 0.88 ms | 1.98 ms | **2.66 ms** | 242.80 ms |
| `GET /api/v1/eats/item/:foodId` | 14,459 | 0.89 ms | 0.68 ms | 1.16 ms | **1.58 ms** | 131.73 ms |
| `GET /api/v1/coupon/` | 14,459 | 0.77 ms | 0.63 ms | 1.08 ms | **1.37 ms** | 61.93 ms |

---

## 5. How We Fixed It (In Simple Words)

1. **Stopped blocking public browsing**: In the backend rate limiter, we allowed public read-only pages (like restaurant menus and coupons) to browse freely without getting hit by the strict 1,000-request limit.
2. **Added database indexes**: We added search indexes to the Restaurant database model on ratings and name. This makes searching and sorting instant instead of scanning every document one by one.
3. **Simulated real separate visitors**: In the test script, we gave each virtual user their own unique simulated IP address so the server treats them like 100 different customers browsing at the same time.
