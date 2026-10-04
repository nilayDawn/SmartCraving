# Authentication & Users API — Load Test Report

## 1. Executive Summary

| Metric | Value | Status |
| :--- | :--- | :---: |
| **Result** | ✅ **PASS** (All performance & reliability SLAs satisfied) | ✅ |
| **Concurrency** | **50 Virtual Users (VUs)** | ✅ |
| **Total Requests** | **17,246 requests** (across 3,449 complete user cycles) | ✅ |
| **Throughput** | **86.07 req/s** | ✅ |
| **Error Rate** | **0.00%** (0 failures out of 17,246 requests) | ✅ |
| **Functional Checks** | **100.00%** (48,286 / 48,286 checks passed) | ✅ |
| **Global p95 Latency**| **510.29 ms** (SLA target: < 1,500 ms) | ✅ |
| **Global Median (p50)** | **51.62 ms** | ✅ |

---

## 2. Before vs. After Optimization

| Benchmark | Baseline (`bcryptjs` round 12, 1 process) | Optimized (Native `bcrypt` round 10, Cluster, Cache) | Improvement |
| :--- | :---: | :---: | :---: |
| **Overall Result** | ❌ FAIL | ✅ **PASS** | **Passed all SLAs** |
| **Throughput** | 5.48 req/s | **86.07 req/s** | **15.7× increase** |
| **Total Requests** | 1,171 reqs | **17,246 reqs** | **14.7× more work** |
| **Global p95 Latency** | 15,921.72 ms | **510.29 ms** | **31.2× faster** |
| **`POST /signup` p95** | 25,068.44 ms | **690.67 ms** | **36.3× faster** |
| **`POST /login` p95** | 14,400.05 ms | **397.22 ms** | **36.2× faster** |
| **`GET /users/me` p95** | 4,745.01 ms | **73.14 ms** | **64.9× faster** |
| **`GET /users/logout` p95**| 2,643.86 ms | **3.25 ms** | **813× faster** |
| **Max Tail Latency** | 49,185.26 ms | **914.71 ms** | **Sub-second tail** |

---

## 3. SLA Threshold Results

| Threshold Target | Metric | Actual Result | SLA Target | Status |
| :--- | :--- | :---: | :---: | :---: |
| `http_req_failed` | Error Rate | **0.00%** | `< 5.00%` | ✅ PASS |
| `http_req_duration` | Global p95 | **510.29 ms** | `< 1,500 ms` | ✅ PASS |
| `http_req_duration` | Global p99 | **< 915 ms** | `< 2,500 ms` | ✅ PASS |
| `endpoint:signup` | Signup p95 | **690.67 ms** | `< 1,600 ms` | ✅ PASS |
| `endpoint:login` | Login p95 | **397.22 ms** | `< 1,300 ms` | ✅ PASS |
| `endpoint:me` | Profile p95 | **73.14 ms** | `< 400 ms` | ✅ PASS |
| `endpoint:logout` | Logout p95 | **3.25 ms** | `< 150 ms` | ✅ PASS |

---

## 4. Endpoint Performance Breakdown

| Endpoint | Method | Requests | Avg | p50 (Median) | p90 | p95 | Max | Error Rate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/v1/users/signup` | POST | 3,449 | 304.69 ms | 212.60 ms | 628.50 ms | **690.67 ms** | 914.71 ms | 0.00% |
| `/api/v1/users/login` | POST | 3,449 | 181.57 ms | 149.99 ms | 257.70 ms | **397.22 ms** | 833.47 ms | 0.00% |
| `/api/v1/users/me` | GET | 6,898 | 41.80 ms | 29.37 ms | 57.63 ms | **73.14 ms** | 744.80 ms | 0.00% |
| `/api/v1/users/logout` | GET | 3,449 | 1.17 ms | 0.80 ms | 1.95 ms | **3.25 ms** | 23.81 ms | 0.00% |

---

## 5. Architectural Summary

1. **Native C++ Bcrypt & Calibrated Rounds (10)**: Offloaded password hashing from the JavaScript main thread to background C++ threads, cutting compute latency by 75%.
2. **Libuv Threadpool (`UV_THREADPOOL_SIZE=16`)**: Removed concurrency bottlenecks by allowing parallel crypto jobs.
3. **Multi-Core Clustering**: Load-balanced incoming traffic across all CPU cores.
4. **Session Caching**: Cached user lookup in `protect` middleware with in-memory TTL to avoid repeated MongoDB Atlas network hops.
