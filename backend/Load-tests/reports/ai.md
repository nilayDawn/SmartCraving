# AI Review Summaries — Performance Report

## 1. Executive Summary

| Metric | Result | Status |
| :--- | :--- | :--- |
| **Final Test Result** | **PASSED** (All SLAs met) | ✅ PASS |
| **Functional Checks** | **100.00%** (50,424 / 50,424 passed) | ✅ PASS |
| **Total Requests** | **12,657 requests** (63.23 req/s) | 🚀 58% higher throughput |
| **Error Rate** | **0.00%** (0 failed requests) | ✅ Clean |
| **Global 95% Latency** | **3.57 ms** (down from 688.53 ms) | ⚡ 193× faster |
| **Store Summary 95% Latency** | **3.58 ms** (down from 553.30 ms) | ⚡ 155× faster |
| **Item Summary 95% Latency** | **3.44 ms** (down from 703.28 ms) | ⚡ 204× faster |
| **Uncached LLM Latency** | **99.54 ms** (target: < 4,000 ms) | ✅ PASS |

---

## 2. SLA & Threshold Results

All configured SLA targets passed with 100% compliance:

| SLA Check | Target | Actual Result | Status |
| :--- | :--- | :--- | :--- |
| **Error Rate (`http_req_failed`)** | < 2.00% | **0.00%** (0 / 12,657) | ✅ PASS |
| **Global 95% Latency** | < 1,500 ms | **3.57 ms** | ✅ PASS |
| **Cached Store Summary 95% Latency** | < 300 ms | **3.58 ms** | ✅ PASS |
| **Cached Item Summary 95% Latency** | < 300 ms | **3.44 ms** | ✅ PASS |
| **Uncached LLM Summary 95% Latency** | < 4,000 ms | **99.54 ms** | ✅ PASS |

---

## 3. Endpoint Latency Breakdown

| Endpoint / Action | Median | 90% Latency | 95% Latency | Max Latency | Error Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `POST /stores/:id/summary` (Cached) | 2.38 ms | 3.14 ms | **3.58 ms** | 156.22 ms | 0.00% |
| `POST /items/:id/summary` (Cached) | 2.36 ms | 3.10 ms | **3.44 ms** | 174.97 ms | 0.00% |
| `POST /items/:id/summary` (Uncached LLM) | 54.58 ms | 94.55 ms | **99.54 ms** | 104.54 ms | 0.00% |

---

## 4. What Was Improved

1. **In-Memory Cache Layer**:
   - Previously, every cached summary request queried remote MongoDB Atlas across the network, causing latency spikes under 50 concurrent users.
   - Now, responses are saved directly into memory cache (`ai:summary:store:<id>` and `ai:summary:food:<id>`). Repeat requests are returned in under 5 ms without touching the database.
2. **Selective Database Lookups**:
   - For cache misses, MongoDB only fetches the required summary fields instead of full review lists.
3. **Smart Rate Limiting**:
   - The rate limiter now skips cached summary reads so users browsing restaurant reviews are never blocked.

---

## 5. Final Verdict

✅ **PASS**

All 50,424 assertions passed. The caching upgrade eliminated the database bottleneck, dropping p95 latency from ~700 ms to ~3.5 ms while increasing total request throughput by 58%.
