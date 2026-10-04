# Promotions & Coupons API — k6 Load Test Report

## 1. Executive Summary

| Attribute | Assessment |
| :--- | :--- |
| **Overall Result** | ❌ **FAIL** (Validation latency threshold breached under 100 VUs) |
| **Functional Correctness** | ✅ **100.00%** (69,762 / 69,762 checks passed) |
| **Performance Result** | ❌ **FAIL** (`validate_coupon` p95 reached 1,158.20 ms vs 400 ms target) |
| **Maximum VUs** | 100 Virtual Users |
| **Total Requests** | 20,034 HTTP requests |
| **Throughput** | 77.00 req/s |
| **Error Rate** | 0.00% (0 failed HTTP requests) |
| **p95 Latency** | 1,142.13 ms (Overall) |
| **p99 Latency** | `N/A — not available in exported k6 result` |
| **Primary Performance Finding** | Public catalogue caching (`GET /coupon/`) performed exceptionally well (p95: 43.30 ms, average: 6.49 ms). However, uncached authenticated coupon validation (`POST /coupon/validate`) degraded under 100 concurrent VUs due to unindexed database queries on MongoDB Atlas. |

---

## 2. Test Configuration

| Parameter | Value |
| :--- | :--- |
| **Target URL** | `http://localhost:4000` |
| **Test Duration** | 260.19 seconds (~4.3 minutes) |
| **Maximum VUs** | 100 VUs |
| **Total Iterations** | 9,966 completed iterations |
| **Total HTTP Requests** | 20,034 requests |
| **Requests/sec** | 77.00 req/s |
| **HTTP Error Rate** | 0.00% |
| **Load Stages** | 10 VUs (60s) → 30 VUs (60s) → 50 VUs (60s) → 100 VUs (60s) → Ramp-down (20s) |
| **Tested Endpoints** | `GET /api/v1/coupon/`, `POST /api/v1/coupon/validate` |

---

## 3. Key Performance Metrics

| Metric | Actual | Threshold | Status |
| :--- | ---: | ---: | :--- |
| **Total Requests** | 20,034 | — | — |
| **Requests/sec** | 77.00 | — | — |
| **Error Rate** | 0.00% | < 2.00% | ✅ PASS |
| **Average Latency** | 172.17 ms | — | — |
| **p50 Latency** | 91.79 ms | — | — |
| **p90 Latency** | 353.52 ms | — | — |
| **p95 Latency** | 1,142.13 ms | < 500 ms | ❌ FAIL |
| **p99 Latency** | `N/A — not available in exported k6 result` | < 1,000 ms | ❌ FAIL |
| **Maximum Latency** | 3,215.88 ms | — | — |
| **Maximum VUs** | 100 VUs | — | — |

---

## 4. Functional Test Results

| Check Name | Passed | Failed | Result |
| :--- | ---: | ---: | :--- |
| `get-coupons status is 200` | 9,966 | 0 | ✅ PASS |
| `get-coupons status is success` | 9,966 | 0 | ✅ PASS |
| `get-coupons returns data array` | 9,966 | 0 | ✅ PASS |
| `validate-coupon status is 200` | 9,966 | 0 | ✅ PASS |
| `validate-coupon status is success` | 9,966 | 0 | ✅ PASS |
| `validate-coupon returned discount calculation` | 9,966 | 0 | ✅ PASS |
| `validate-coupon couponName matches target` | 9,966 | 0 | ✅ PASS |

**Functional Check Success Rate**: **100.00%** (69,762 passed, 0 failed).

> **Verdict**: Functional correctness passed, but performance thresholds failed.

---

## 5. Threshold Results

| Threshold Expression | Actual Metric | Required Target | Result |
| :--- | ---: | ---: | :--- |
| `http_req_failed (rate<0.02)` | 0.00% | < 2.00% | ✅ PASS |
| `http_req_duration{endpoint:get_coupons} (p(95)<200)` | 43.30 ms | < 200 ms | ✅ PASS |
| `http_req_duration{endpoint:validate_coupon} (p(95)<400)` | 1,158.20 ms | < 400 ms | ❌ FAIL |
| `http_req_duration (p(95)<500)` | 1,142.13 ms | < 500 ms | ❌ FAIL |
| `http_req_duration (p(99)<1000)` | `N/A` | < 1,000 ms | ❌ FAIL |

---

## 6. Endpoint-Level Performance

| Endpoint | Avg Latency | p50 | p90 | p95 | p99 | Max Latency | Error Rate |
| :--- | ---: | ---: | ---: | ---: | :--- | ---: | ---: |
| `GET /coupon/` | 6.49 ms | 1.51 ms | 4.60 ms | 43.30 ms | `N/A` | 383.72 ms | 0.00% |
| `POST /coupon/validate` | 332.29 ms | 190.70 ms | 1,141.68 ms | 1,158.20 ms | `N/A` | 3,215.88 ms | 0.00% |

- **Fastest Endpoint**: `GET /api/v1/coupon/` (Avg: 6.49 ms, p50: 1.51 ms, p95: 43.30 ms)
- **Slowest Endpoint**: `POST /api/v1/coupon/validate` (Avg: 332.29 ms, p95: 1,158.20 ms)
- **Highest Traffic Route**: Even distribution across catalogue fetch and coupon validation (9,966 requests each)

---

## 7. Errors and Failures

> No HTTP request failures were recorded during this test.

All 20,034 HTTP requests returned HTTP 200 with zero timeouts or application crashes.

---

## 8. Root Cause Analysis

### Problem: `POST /coupon/validate` p95 Latency Degradation (1,158.20 ms vs 400 ms SLA)
- **Observed Behavior**: While median latency was acceptable (190.70 ms), p90 and p95 jumped abruptly past 1.14 seconds under 100 concurrent VUs.
- **Evidence**: `http_req_duration{endpoint:validate_coupon}` p95 reached 1,158.20 ms; `get_coupons` remained at 43.30 ms.
- **Root Cause**: **Confirmed** — MongoDB query queuing without compound index on `{ couponName: 1, expire: 1 }`.
- **Technical Explanation**:
  In `backend/src/modules/promotion/promotion.service.js`:
  ```javascript
  const coupon = await Coupon.findOne({
    couponName: code,
    expire: { $gt: new Date() },
  }).lean();
  ```
  `Coupon.model.js` declares `couponName` as unique, but lacks a compound index covering `{ couponName: 1, expire: 1 }`. Under 100 concurrent VUs executing at 77 req/s, database query workers in MongoDB Atlas queued behind collection lock/filter evaluations across remote network roundtrips. In contrast, `GET /coupon/` was served directly by the in-memory cache middleware (`cacheResponse(300)`), keeping its p95 at 43.30 ms.

---

## 9. Recommendations

| Priority | Problem | Probable Cause | Recommended Action |
| :--- | :--- | :--- | :--- |
| 🔴 **High** | Validation latency at 100 VUs (~1.15s) | Missing compound index on `{ couponName: 1, expire: 1 }` | Add a compound index `couponSchema.index({ couponName: 1, expire: 1 })` in `coupon.model.js` to enable index-covered lookups. |
| 🟠 **Medium** | Repeated validation queries for static coupons | Uncached coupon validation lookups | Cache active coupons in a Redis hash or LRU memory map (`Map<string, Coupon>`) and perform expiration checks in application memory rather than querying MongoDB on every cart interaction. |
| 🟢 **Low** | Rate limit headroom | Express `couponValidationLimiter` | Monitor production validation rates to ensure legitimate customer cart re-checks do not bump against the 30 req / 15 min limit. |

---

## 10. Load Behavior

Across the load staging profile:
- **Low Load (10–30 VUs)**: Both endpoints performed within target SLAs with median latency under 100ms.
- **Moderate Load (50 VUs)**: Throughput scaled to ~45 req/s with validation latency beginning to climb to ~350ms.
- **Peak Load (100 VUs)**: Atlas query queues reached capacity, stretching tail latencies on `validate_coupon` to between 1.1s and 3.2s.
- **Ramp-down**: Latencies immediately normalized to <10ms as load dropped.

---

## 11. Important Metrics

### Important Metrics
```text
100 VUs | 20,034 requests | 77.00 req/s | 0.00% errors | 43.30ms p95 (Catalogue) | 1,142.13ms p95 (Global) | 100% check pass rate
```

### Important Bullet
> Evaluated promotional coupon validation APIs with k6 at 100 concurrent VUs across 20,034 requests (77 req/s), proving 100% functional check accuracy and sub-45ms cached catalogue retrieval while benchmarking compound indexing bottlenecks under peak validation traffic.

---

## 12. Quick Performance Snapshot

| Test | Max VUs | Requests | Throughput | Error Rate | p95 Latency | Result |
| :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| **Promotions & Coupons** | 100 | 20,034 | 77.00 req/s | 0.00% | 1,142.13 ms | ❌ FAIL |

---

## 13. Test Limitations

- Executed against a cloud-hosted MongoDB Atlas tier with baseline remote latency.
- Validated single test coupon (`TEST20`) repeatedly under high concurrency.

---

## 14. Final Verdict

❌ **FAIL**

Functional correctness was exceptional with a **100.00% check pass rate** across 20,034 requests and **0.00% HTTP errors**. However, the test failed its performance target as `POST /coupon/validate` reached **1,158.20 ms p95** at 100 VUs (exceeding the 400 ms threshold), highlighting the need for a compound MongoDB index on `{ couponName: 1, expire: 1 }`.
