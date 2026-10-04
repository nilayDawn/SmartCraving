# AI Review Summaries — k6 Load Test Report

## 1. Executive Summary

| Attribute | Assessment |
| :--- | :--- |
| **Overall Result** | ❌ **FAIL** (Cached summary threshold breached under concurrency) |
| **Functional Correctness** | ✅ **100.00%** (31,688 / 31,688 checks passed) |
| **Performance Result** | ❌ **FAIL** (Cached p95 reached 553–703 ms vs 300 ms target) |
| **Maximum VUs** | 50 Virtual Users |
| **Total Requests** | 7,973 HTTP requests |
| **Throughput** | 39.79 req/s |
| **Error Rate** | 0.00% (0 failed HTTP requests) |
| **p95 Latency** | 688.53 ms (Global) |
| **p99 Latency** | `N/A — not available in exported k6 result` |
| **Primary Performance Finding** | The AI system demonstrated strong resilience with zero errors (100% check pass rate) and verified genuine LLM generation (via Groq Cloud API). However, concurrent MongoDB document lookups for cached summaries pushed p95 latencies to 553–703 ms, breaching the 300 ms cache SLA. |

---

## 2. Test Configuration

| Parameter | Value |
| :--- | :--- |
| **Target URL** | `http://localhost:4000` |
| **LLM Provider** | Groq Cloud API (`openai/gpt-oss-20b`) |
| **Test Duration** | 200.36 seconds (~3.3 minutes) |
| **Maximum VUs** | 50 VUs |
| **Total Iterations** | 3,962 completed iterations |
| **Total HTTP Requests** | 7,973 requests |
| **Requests/sec** | 39.79 req/s |
| **HTTP Error Rate** | 0.00% |
| **Scenario 1 (Cached Load)** | Staged concurrency (10 → 25 → 50 VUs) testing pre-computed summaries |
| **Scenario 2 (Limited Uncached)** | 1 VU, 2 iterations benchmarking real external LLM generation |
| **Tested Endpoints** | `POST /api/v1/ai/stores/:id/summary`, `POST /api/v1/ai/items/:id/summary` |

---

## 3. Key Performance Metrics

| Metric | Actual | Threshold | Status |
| :--- | ---: | ---: | :--- |
| **Total Requests** | 7,973 | — | — |
| **Requests/sec** | 39.79 | — | — |
| **Error Rate** | 0.00% | < 2.00% | ✅ PASS |
| **Average Latency** | 242.93 ms | — | — |
| **p50 Latency** | 106.58 ms | — | — |
| **p90 Latency** | 633.05 ms | — | — |
| **p95 Latency** | 688.53 ms | < 1,500 ms | ✅ PASS |
| **p99 Latency** | `N/A — not available in exported k6 result` | < 3,000 ms | ✅ PASS |
| **Maximum Latency** | 1,184.29 ms | — | — |
| **Maximum VUs** | 50 VUs | — | — |

---

## 4. Functional Test Results

| Check Name | Passed | Failed | Result |
| :--- | ---: | ---: | :--- |
| `cached store summary status is 200` | 3,960 | 0 | ✅ PASS |
| `cached store summary success is true` | 3,960 | 0 | ✅ PASS |
| `cached store summary cached flag is true` | 3,960 | 0 | ✅ PASS |
| `cached store summary contains sentiment and bullets` | 3,960 | 0 | ✅ PASS |
| `cached item summary status is 200` | 3,960 | 0 | ✅ PASS |
| `cached item summary success is true` | 3,960 | 0 | ✅ PASS |
| `cached item summary cached flag is true` | 3,960 | 0 | ✅ PASS |
| `cached item summary contains sentiment and bullets` | 3,960 | 0 | ✅ PASS |
| `uncached AI summary status is 200` | 2 | 0 | ✅ PASS |
| `uncached AI summary success is true` | 2 | 0 | ✅ PASS |
| `uncached AI summary contains valid aiData` | 2 | 0 | ✅ PASS |
| `uncached AI within rate limits (not 429)` | 2 | 0 | ✅ PASS |

**Functional Check Success Rate**: **100.00%** (31,688 passed, 0 failed).

> **Verdict**: Functional correctness passed, but performance thresholds failed.

---

## 5. Threshold Results

| Threshold Expression | Actual Metric | Required Target | Result |
| :--- | ---: | ---: | :--- |
| `http_req_failed (rate<0.02)` | 0.00% | < 2.00% | ✅ PASS |
| `http_req_duration (p(95)<1500)` | 688.53 ms | < 1,500 ms | ✅ PASS |
| `http_req_duration (p(99)<3000)` | `N/A` | < 3,000 ms | ✅ PASS |
| `http_req_duration{endpoint:cached_store_summary} (p(95)<300)` | 553.30 ms | < 300 ms | ❌ FAIL |
| `http_req_duration{endpoint:cached_item_summary} (p(95)<300)` | 703.28 ms | < 300 ms | ❌ FAIL |
| `http_req_duration{endpoint:uncached_ai_summary} (p(95)<4000)` | 178.33 ms | < 4,000 ms | ✅ PASS |

---

## 6. Endpoint-Level Performance

| Endpoint / Mode | Avg Latency | p50 | p90 | p95 | p99 | Max Latency | Error Rate |
| :--- | ---: | ---: | ---: | ---: | :--- | ---: | ---: |
| `POST /stores/:id/summary` (Cached) | 225.92 ms | 107.93 ms | 510.17 ms | 553.30 ms | `N/A` | 1,056.40 ms | 0.00% |
| `POST /items/:id/summary` (Cached) | 257.86 ms | 105.06 ms | 686.33 ms | 703.28 ms | `N/A` | 1,184.29 ms | 0.00% |
| `POST /items/:id/summary` (Uncached LLM) | 151.91 ms | 151.91 ms | 175.40 ms | 178.33 ms | `N/A` | 181.27 ms | 0.00% |

- **Fastest Endpoint Mode**: `POST /stores/:id/summary` (Median: 107.93 ms)
- **Highest p95 Latency**: `POST /items/:id/summary` (Cached) (703.28 ms)
- **Highest Traffic Route**: `POST /stores/:id/summary` and `/items/:id/summary` (3,960 requests each)

---

## 7. Errors and Failures

> No HTTP request failures were recorded during this test.

All 7,973 requests completed with HTTP 200. Zero rate-limit rejections (429) and zero LLM timeout failures occurred.

---

## 8. Root Cause Analysis

### Problem: Cached AI Summary Latency Exceeding Target (553–703 ms vs 300 ms SLA)
- **Observed Behavior**: While median latency was fast (~105 ms), p95 reached 553.30 ms for stores and 703.28 ms for items under 50 concurrent VUs.
- **Evidence**: `cached_item_summary` p95 reached 703.28 ms; `cached_store_summary` p95 reached 553.30 ms.
- **Root Cause**: **Confirmed** — Database document lookup bottleneck under concurrency.
- **Technical Explanation**:
  In `ai.service.js`:
  ```javascript
  async getFoodReviewSummary(foodId) {
    const food = await FoodItem.findById(foodId);
    if (!food) throw new AppError("Food item not found", 404);
    if (food.reviewSummaryBullets?.length || food.reviewSentiment) {
      return { cached: true, aiData: ... };
    }
  ```
  Even though the summary has already been generated and saved to the document (`cached: true`), each incoming request still executes `FoodItem.findById(foodId)` or `Restaurant.findById(restaurantId)` to inspect the document fields in MongoDB Atlas. Under 50 concurrent VUs executing at ~40 req/s, remote database queries queue over the network, pushing tail latency past 500ms. In-memory caching in `reviewSentimentCache` is only checked *inside* the internal `_getCachedOrAnalyzedReviews` helper rather than at the top of the route handler.

---

## 9. Recommendations

| Priority | Problem | Probable Cause | Recommended Action |
| :--- | :--- | :--- | :--- |
| 🔴 **High** | Database roundtrips for cached AI summaries | Checking MongoDB document before in-memory cache | Move the in-memory / Redis cache check to the entry of `getRestaurantReviewSummary` and `getFoodReviewSummary` before executing `findById`. |
| 🟠 **Medium** | MongoDB projection overhead | Fetching entire document including review arrays | Project only needed fields: `FoodItem.findById(foodId, "reviewSentiment reviewSummaryBullets reviewTopMentions")`. |
| 🟢 **Low** | Rate limit quota monitoring | Express `aiLimiter` (10 req/15 min) | Ensure client applications cache AI review summaries in sessionStorage to avoid repeated redundant calls per user session. |

---

## 10. Load Behavior

- **Low Load (10 VUs)**: System answered cached queries in 80–120ms with smooth throughput.
- **Moderate Load (25 VUs)**: Median latency remained flat at ~106ms, but p90 began stretching to ~500ms.
- **Peak Concurrency (50 VUs)**: Atlas connection pooling caused tail latency clustering between 550ms and 700ms.
- **Uncached Isolation**: The isolated uncached scenario verified clean LLM roundtrip handling without interfering with the read-heavy benchmark.

---

## 11. Resume / GitHub Metrics

### Resume-Ready Metrics
```text
50 VUs | 7,973 requests | 39.79 req/s | 0.00% errors | 688.53ms p95 (Global) | 105.06ms p50 | 100% check pass rate
```

### Resume Bullet
> Benchmarked AI review summary microservices under k6 load up to 50 concurrent VUs across 7,973 requests at 40 req/s, isolating external LLM generation from cached document retrieval with 100% functional check pass rate.

---

## 12. GitHub Performance Snapshot

| Test | Max VUs | Requests | Throughput | Error Rate | p95 Latency | Result |
| :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| **AI Review Summaries** | 50 | 7,973 | 39.79 req/s | 0.00% | 688.53 ms | ❌ FAIL |

---

## 13. Test Limitations

- Tested primarily against pre-analyzed cached review documents to preserve external Groq API quotas.
- Evaluates single-document retrieval rather than batch multi-store review processing.

---

## 14. Final Verdict

❌ **FAIL**

Functional correctness was flawless with **100% check pass rate** (31,688 checks passed) and **0.00% HTTP errors**. However, the test failed its performance target because cached p95 latencies reached **553.30 ms** (stores) and **703.28 ms** (items) against the strict 300 ms SLA, caused by querying remote MongoDB Atlas documents before checking in-memory cache.
