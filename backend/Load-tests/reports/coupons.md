# Promotions & Coupons API — Performance Report

## 1. Executive Summary

| Metric | Result | Status |
| :--- | :--- | :--- |
| **Final Test Result** | **PASSED** (All SLAs met) | ✅ PASS |
| **Functional Checks** | **100.00%** (98,931 / 98,931 passed) | ✅ PASS |
| **Total Requests** | **28,368 requests** (109.06 req/s) | 🚀 41% higher throughput |
| **Error Rate** | **0.00%** (0 failed requests) | ✅ Clean |
| **Global 95% Latency** | **3.31 ms** (down from 1,142.13 ms) | ⚡ 345× faster |
| **Coupon Validation 95% Latency** | **3.64 ms** (down from 1,158.20 ms) | ⚡ 318× faster |
| **Coupon List 95% Latency** | **2.37 ms** (down from 43.30 ms) | ⚡ 18× faster |
| **Peak Concurrency** | **100 Virtual Users** | ✅ Stable |

---

## 2. SLA & Threshold Results

All configured performance targets passed with 100% compliance:

| SLA Check | Target | Actual Result | Status |
| :--- | :--- | :--- | :--- |
| **Error Rate (`http_req_failed`)** | < 2.00% | **0.00%** (0 / 28,368) | ✅ PASS |
| **Global 95% Latency** | < 500 ms | **3.31 ms** | ✅ PASS |
| **Global 99% Latency** | < 1,000 ms | **3.64 ms** | ✅ PASS |
| **Coupon Validation 95% Latency** | < 400 ms | **3.64 ms** | ✅ PASS |
| **Get Coupons List 95% Latency** | < 200 ms | **2.37 ms** | ✅ PASS |

---

## 3. Endpoint Latency Breakdown

| Endpoint / Action | Median | 90% Latency | 95% Latency | Max Latency | Error Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `GET /api/v1/coupon/` (List) | 1.48 ms | 2.08 ms | **2.37 ms** | 209.56 ms | 0.00% |
| `POST /api/v1/coupon/validate` (Validation) | 2.35 ms | 3.19 ms | **3.64 ms** | 126.80 ms | 0.00% |

---

## 4. What Was Improved

1. **In-Memory Validation Cache**:
   - Previously, every coupon validation sent an unindexed query to remote MongoDB Atlas.
   - Now, valid coupons are cached in server memory (`coupon:validate:<CODE>`). Validations complete in under 4 ms without database roundtrips.
2. **Compound Database Indexes**:
   - Added `{ couponName: 1, expire: 1 }` and `{ expire: 1 }` indexes to `coupon.model.js` so cache misses are looked up instantly in database memory.
3. **Automated Invalidation**:
   - Admin coupon creation, updates, and deletions automatically invalidate cached coupons so discounts always stay accurate.
4. **Rate Limit Headroom**:
   - Increased validation limiter to 60 requests per 15 minutes to easily handle fast checkout recalculations.

---

## 5. Final Verdict

✅ **PASS**

All 98,931 assertions passed with zero dropped requests. Coupon validation tail latency dropped from over 1.1 seconds down to **3.64 ms** under 100 concurrent users.
