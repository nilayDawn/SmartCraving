# SmartCraving Backend Load Testing Reports

This directory contains the performance reports generated from running k6 load test suites against the SmartCraving backend API.

---

## 1. Test Suite Reports Index

All **7 test suites** have been optimized and verified to pass all SLA thresholds and functional checks.

| Report File | Area Tested | Test Load | Result | Key Highlight |
| :--- | :--- | :---: | :---: | :--- |
| **[`overall-summary.md`](overall-summary.md)** | **Full System Summary & Before/After Matrix** | **161K Total Reqs** | ✅ **ALL PASS** | **100% SLA pass rate across all suites** |
| **[`auth.md`](auth.md)** | User Authentication (`signup`, `login`, `me`, `logout`) | 50 VUs / 2.8K Reqs | ✅ **PASS** | 510 ms p95 (down from 15.9s) via native `bcrypt` |
| **[`restaurants.md`](restaurants.md)** | Restaurant & Menus Catalogue (`stores`, `menus`, `items`) | 100 VUs / 101K Reqs | ✅ **PASS** | 4.41 ms p95, 0% errors (down from 89.87% 429s) |
| **[`cart.md`](cart.md)** | Customer Cart Lifecycle (`add`, `get`, `update`, `delete`) | 2 VUs / 25 Reqs | ✅ **PASS** | Fast transactional cart updates |
| **[`orders.md`](orders.md)** | Order History & Creation (`myOrders`, `/:id`, `/new`) | 50 VUs / 6.9K Reqs | ✅ **PASS** | 569 ms p95, 0% errors via `.lean()` queries |
| **[`payments.md`](payments.md)** | Stripe Payments (`/stripeapi`, `/payment/process`) | 50 VUs / 8.9K Reqs | ✅ **PASS** | 190 ms p95 with zero payment gateway failures |
| **[`coupons.md`](coupons.md)** | Coupon Catalogue & Validation (`/coupon/`, `/validate`) | 100 VUs / 28.3K Reqs | ✅ **PASS** | 3.64 ms validation p95 via memory cache & index |
| **[`ai.md`](ai.md)** | AI Review Summaries (Cached & Uncached Groq LLM) | 50 VUs / 12.6K Reqs | ✅ **PASS** | 3.44 ms summary p95 via in-memory caching |

---

## 2. Key Terms Explained

- **p50 (Median Latency)**: The response time for typical, normal requests.
- **p95 (95th Percentile)**: The primary industry standard SLA metric. Shows the response time for 95% of users (capturing slow database queries or network delays).
- **Throughput (req/s)**: Total completed HTTP requests per second.
- **Error Rate**: Percentage of requests that failed with HTTP 4xx or 5xx status codes. Target is always `< 2%` (achieved `0.00%` across all suites).
- **Check Pass Rate**: Percentage of functional assertion checks passed (e.g. verifying JSON properties, data arrays, and status codes). Target is `100%`.

---

## 3. How to Run Load Tests

From the `backend/Load-tests` directory:

```bash
# 1. Quick smoke test for any module:
k6 run -e QUICK=true 01-auth.js
k6 run -e QUICK=true 02-restaurants.js
k6 run -e QUICK=true 04-orders.js
k6 run -e QUICK=true 06-coupons.js
k6 run -e QUICK=true 07-ai.js

# 2. Full official benchmark run (results auto-save to results/<name>.json):
k6 run 01-auth.js
k6 run 02-restaurants.js
k6 run 03-cart.js
k6 run 04-orders.js
k6 run 05-payments.js
k6 run 06-coupons.js
k6 run 07-ai.js
```
