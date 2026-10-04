# SmartCraving Backend Load Testing Reports & Guide

This directory contains the comprehensive performance analysis reports generated from the k6 load testing suites across all 7 backend domain groups.

---

## 1. Directory Index

| Report File | Domain / Focus Area | Tested Load | Overall Result |
| :--- | :--- | :--- | :--- |
| **[`overall-summary.md`](overall-summary.md)** | **Executive Benchmark Summary & Cross-Domain Analysis** | **100 Max VUs / 113K Reqs** | **Cross-Suite Overview** |
| **[`auth.md`](auth.md)** | Authentication & User Lifecycle (`signup`, `login`, `me`, `logout`) | 50 VUs / 1.1K Reqs | ❌ FAIL (CPU bcrypt saturation) |
| **[`restaurants.md`](restaurants.md)** | Restaurant & Menus Catalogue (`stores`, `menus`, `items`, `count`) | 100 VUs / 74.2K Reqs | ❌ FAIL (IP rate limiter trigger) |
| **[`cart.md`](cart.md)** | Customer Cart Lifecycle (`add`, `get`, `update`, `delete`) | 2 VUs / 25 Reqs | ✅ PASS (Sub-405ms p95) |
| **[`orders.md`](orders.md)** | Orders History & Controlled Creation (`myOrders`, `/:id`, `/new`) | 50 VUs / 942 Reqs | ⚠️ PASS WITH WARNINGS |
| **[`payments.md`](payments.md)** | Stripe Integration (`/stripeapi`, `/payment/process`) | 50 VUs / 8.9K Reqs | ✅ PASS (190ms p95) |
| **[`coupons.md`](coupons.md)** | Coupon Catalogue & Validation (`/coupon/`, `/validate`) | 100 VUs / 20K Reqs | ❌ FAIL (Index bottleneck at 100 VUs) |
| **[`ai.md`](ai.md)** | AI Review Summaries (Cached vs Uncached Groq LLM) | 50 VUs / 7.9K Reqs | ❌ FAIL (Remote DB lookup latency) |

---

## 2. Core Concepts & Metric Definitions

### Latency Percentiles (p50, p90, p95, p99)
- **Median (p50)**: The latency experienced by the middle (50th percentile) user. It indicates typical behavior.
- **90th Percentile (p90)**: 90% of requests finished faster than this duration; only 10% were slower.
- **95th Percentile (p95)**: **The primary industry standard SLA metric**. Identifies what your slowest 5% of users experience under load (e.g. database queue stalls, network jitters).
- **99th Percentile (p99)**: Captures extreme tail latencies (worst 1% of transactions). Note: If not exported in raw k6 summary metrics, it is marked as `N/A` rather than guessed.

### Throughput (Requests per Second - req/s)
- Total completed HTTP transactions divided by the elapsed test duration. Indicates the volume capacity the application sustained during the run.

### Error Rate vs Check Failures
- **HTTP Error Rate (`http_req_failed`)**: The percentage of HTTP responses that returned failure status codes (HTTP 4xx or 5xx), excluding deliberately expected domain codes configured via `http.expectedStatuses(...)`.
- **k6 Check Failures**: Assertions evaluated against the response payload or structure (e.g., verifying `json.success === true` or checking that an array contains items).
- *Critical Distinction*: An API can return HTTP 200 (0% HTTP error rate) while failing functional assertions if the response returns unexpected or incomplete payloads. Conversely, an API can pass 100% of functional checks while failing overall performance thresholds if latency is too high.

---

## 3. How Verdicts Are Determined

Every report awards one of three standardized verdicts:

1. **✅ PASS**:
   - HTTP failure rate is below the SLA threshold (typically < 1% or < 2%).
   - All functional k6 checks passed (100% pass rate).
   - Every defined response time threshold (p95 / p99) was satisfied.
2. **⚠️ PASS WITH WARNINGS**:
   - Latency thresholds were satisfied and error rates were within acceptable limits.
   - Minor non-fatal anomalies were logged (e.g., brief transient 401s during the initial multi-VU bootstrap before tokens were cached).
3. **❌ FAIL**:
   - **Either** the HTTP failure rate exceeded the allowed error budget (e.g., rate-limiting rejections).
   - **Or** any per-endpoint or global p95 latency threshold was breached, even if functional correctness was 100%.

---

## 4. Why Local Testing Does Not Equal Production Capacity

All load tests in this suite were executed against a local Node.js development server connected to a remote MongoDB Atlas cloud cluster. When reviewing these reports, observe these fundamental engineering differences:

| Attribute | Local Development Benchmark | Production Deployment |
| :--- | :--- | :--- |
| **Node.js Process** | Single process (1 event loop thread) | Clustered processes via PM2 / Kubernetes across multiple CPU cores |
| **Reverse Proxy** | None (direct localhost connection) | Nginx / Cloudflare load balancer with SSL termination & distributed caching |
| **Rate Limiter Storage** | Single-node in-memory store | Distributed Redis token-bucket cluster tracking by authenticated user ID |
| **Database Distance** | Local host → Internet → Remote Atlas (network latency) | VPC Peering / PrivateLink co-located in the same cloud region (<1ms roundtrip) |
| **Static Caching** | Local application memory Map | Edge CDN (Cloudflare / CloudFront) caching catalogue responses globally |

---

## 5. How to Read the Individual Reports

Each report is structured into 14 standardized sections:
1. **Executive Summary**: High-level verdict, throughput, error rates, and the single most critical finding.
2. **Test Configuration**: Exact runtime parameters extracted directly from the k6 export.
3. **Key Performance Metrics**: Formatted tabular view comparing actual latencies against SLA targets.
4. **Functional Test Results**: Granular breakdown of every functional assertion.
5. **Threshold Results**: Full pass/fail evaluation of each configured k6 threshold rule.
6. **Endpoint-Level Performance**: Route-by-route latency breakdown to pinpoint slow endpoints.
7. **Errors and Failures**: Deep dive into status codes and failure patterns.
8. **Root Cause Analysis**: Evidence-backed investigation connecting symptoms to backend source code.
9. **Recommendations**: Prioritized action items (High, Medium, Low) to resolve observed bottlenecks.
10. **Load Behavior**: Analysis of how the system behaved as VUs ramped up, sustained, and ramped down.
11. **Resume-Ready Metrics & Bullet**: Verifiable facts formatted for engineering portfolios and resumes.
12. **GitHub Performance Snapshot**: Compact markdown summary ready to embed into repository documentation.
13. **Test Limitations**: Constraints specific to that test's execution context.
14. **Final Verdict**: Concise closing assessment.
