# SmartCraving Backend Load Testing Infrastructure (k6)

This directory contains the [k6](https://k6.io/) load testing infrastructure for the SmartCraving API backend. Tests are designed to run incrementally against dedicated API groups.

---

## 1. Installing k6

k6 is a standalone performance testing tool written in Go with JavaScript test scripting.

### Linux (Ubuntu / Debian)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### macOS (Homebrew)
```bash
brew install k6
```

### Windows (winget / Chocolatey)
```powershell
winget install k6 --source winget
# or
choco install k6
```

### Verify Installation
```bash
k6 version
```

---

## 2. Starting the Backend

Ensure the backend server is running locally before executing load tests:

```bash
cd backend
npm run dev
```

By default, the backend runs on:
`http://localhost:4000`

Verify server health:
```bash
curl http://localhost:4000/health
# Expected: {"status":"success","message":"Server is healthy",...}
```

---

## 3. Providing Test Environment Variables

All parameters in `config.js` can be customized using k6 `-e` flags or system environment variables:

| Variable | Description | Default Value |
|---|---|---|
| `BASE_URL` | Target backend host (without trailing slash) | `http://localhost:4000` |
| `TEST_USER_EMAIL` | Standard test user email | `testuser@example.com` |
| `TEST_USER_PASSWORD` | Standard test user password | `Password123!` |
| `TEST_ADMIN_EMAIL` | Administrator test user email | `admin@example.com` |
| `TEST_ADMIN_PASSWORD` | Administrator test user password | `AdminPass123!` |

Example passing variables via CLI:
```bash
k6 run \
  -e BASE_URL=http://localhost:4000 \
  -e TEST_USER_EMAIL=user@test.local \
  -e TEST_USER_PASSWORD=SecretPassword123! \
  <test-script.js>
```

---

## 4. Running a k6 Test

Tests are executed with the `k6 run` command.

### Running the Authentication Load Test (01-auth.js)

Run from the `backend/` directory:
```bash
# Standard staged load test (10 VUs -> 30 VUs -> 50 VUs -> ramp down)
k6 run Load-tests/01-auth.js

# Target custom backend host with custom credentials:
k6 run \
  -e BASE_URL=http://localhost:4000 \
  -e TEST_USER_EMAIL=testuser@example.com \
  -e TEST_USER_PASSWORD=Password123! \
  Load-tests/01-auth.js

# Fast smoke/verification run (5-10 VUs for 20s):
k6 run -e QUICK=true Load-tests/01-auth.js

# Custom CLI VU override (e.g. 5 VUs for 15s):
k6 run --vus 5 --duration 15s Load-tests/01-auth.js
```

### Running the Restaurants & Menus Load Test (02-restaurants.js)

Tests public read-heavy catalogue endpoints (`/restaurants/count`, `/stores`, `/stores/:id`, `/stores/:id/menus`, `/items/:storeId`, `/item/:foodId`, `/coupon/`):

```bash
# Standard staged load test (10 VUs -> 30 VUs -> 50 VUs -> 100 VUs -> ramp down)
k6 run Load-tests/02-restaurants.js

# Target custom backend host with optional explicit store/dish IDs:
k6 run \
  -e BASE_URL=http://localhost:4000 \
  -e TEST_STORE_ID=66716cb0e1a78e67dc8c8dbf \
  -e TEST_FOOD_ID=6671545ce1a78e67dc8c8d9e \
  Load-tests/02-restaurants.js

# Fast smoke/verification run (5-10 VUs for 20s):
k6 run -e QUICK=true Load-tests/02-restaurants.js

# Custom CLI VU override (e.g. 20 VUs for 30s):
k6 run --vus 20 --duration 30s Load-tests/02-restaurants.js
```

### Running the Customer Cart Load Test (03-cart.js)

Tests the complete authenticated customer cart lifecycle (`/add-to-cart`, `/get-cart`, `/update-cart-item`, `/delete-cart-item`):

```bash
# Standard staged load test (10 VUs -> 25 VUs -> 50 VUs -> ramp down)
k6 run Load-tests/03-cart.js

# Target custom backend host with optional explicit store/dish IDs:
k6 run \
  -e BASE_URL=http://localhost:4000 \
  -e TEST_STORE_ID=6671719fe1a78e67dc8c8dce \
  -e TEST_FOOD_ID=6671720fe1a78e67dc8c8dd8 \
  Load-tests/03-cart.js

# Fast smoke/verification run (5-10 VUs for 20s):
k6 run -e QUICK=true Load-tests/03-cart.js

# Custom CLI VU override (e.g. 10 VUs for 30s):
k6 run --vus 10 --duration 30s Load-tests/03-cart.js
```

### Running the Orders Load Test (04-orders.js)

Tests customer order history, order lookup, and controlled order creation:
- **Scenario A (Read-Only Order Load Test)**: Runs high staged read load (10 -> 30 -> 50 VUs -> ramp down) testing `GET /api/v1/eats/orders/me/myOrders` and `GET /api/v1/eats/orders/:id` (with tenant security isolation).
- **Scenario B (Controlled Order-Creation Test)**: Executes small, controlled iterations testing `POST /api/v1/eats/orders/new` with schema validation and mock Stripe checkout session verification, guaranteeing NO real Stripe charges, NO inventory depletion, and NO database order flooding.

```bash
# Standard staged load test (Scenario A staged up to 50 VUs + Scenario B controlled creation):
k6 run Load-tests/04-orders.js

# Target custom backend host with optional explicit order/store IDs:
k6 run \
  -e BASE_URL=http://localhost:4000 \
  -e TEST_STORE_ID=6671719fe1a78e67dc8c8dce \
  -e TEST_FOOD_ID=6671720fe1a78e67dc8c8dd8 \
  -e TEST_ORDER_ID=6a82a13c4d3cb721c8a002a3 \
  Load-tests/04-orders.js

# Fast smoke/verification run (5-10 VUs for 20s):
k6 run -e QUICK=true Load-tests/04-orders.js
```

### Running the Payments Load Test (05-payments.js)

Tests Stripe publishable key retrieval and payment processing:
- **Scenario A (Read-Only Stripe API Key Load Test)**: Runs high staged read load (10 -> 25 -> 50 VUs -> ramp down) testing `GET /api/v1/stripeapi`, verifying publishable key delivery under peak customer concurrency.
- **Scenario B (Controlled Payment Process Test)**: Executes controlled iterations (1 VU) testing `POST /api/v1/payment/process` in **Stripe Test/Sandbox mode**. Verifies empty cart rejection (fast-fail without external calls) and real Stripe Test Checkout Session URL generation (`https://checkout.stripe.com/...`) with automatic cart item cleanup.
- **Webhook Exclusion**: The Stripe Webhook (`POST /api/v1/payment/webhook`) is strictly excluded from load tests because it requires Stripe cryptographic signatures and is not a public customer-facing endpoint.

```bash
# Standard staged load test (Scenario A staged up to 50 VUs + Scenario B controlled process):
k6 run Load-tests/05-payments.js

# Target custom backend host with optional explicit store/dish IDs:
k6 run \
  -e BASE_URL=http://localhost:4000 \
  -e TEST_STORE_ID=6671719fe1a78e67dc8c8dce \
  -e TEST_FOOD_ID=6671720fe1a78e67dc8c8dd8 \
  Load-tests/05-payments.js

# Fast smoke/verification run (5-10 VUs for 20s):
k6 run -e QUICK=true Load-tests/05-payments.js
```

### Running the Promotions & Coupons Load Test (06-coupons.js)

Tests public active coupons retrieval and customer coupon validation:
- **`GET /api/v1/coupon/`**: Tests the public coupon catalogue served with high-performance response caching (`cacheResponse(300)`).
- **`POST /api/v1/coupon/validate`**: Tests authenticated coupon validation (`couponCode`, `cartItemsTotalAmount`), verifying active expiration checking, minAmount threshold validation, and mathematical discount calculation without creating or mutating database coupons.

```bash
# Standard staged load test (10 VUs -> 30 VUs -> 50 VUs -> 100 VUs -> ramp down):
k6 run Load-tests/06-coupons.js

# Target custom backend host with optional explicit coupon code:
k6 run \
  -e BASE_URL=http://localhost:4000 \
  -e TEST_COUPON_CODE=TEST20 \
  Load-tests/06-coupons.js

# Fast smoke/verification run (5-10 VUs for 20s):
k6 run -e QUICK=true Load-tests/06-coupons.js
```

### Running the AI Review Summaries Load Test (07-ai.js)

Tests AI review summarization with a controlled benchmark comparing cached vs uncached LLM performance:
- **Scenario 1 (Cached AI Response Load Test)**: Runs high staged load (10 -> 25 -> 50 VUs -> ramp down) testing `POST /api/v1/ai/stores/:id/summary` and `POST /api/v1/ai/items/:id/summary` for pre-analyzed targets, validating sub-150ms cached responses (`cached: true`) with zero external LLM calls.
- **Scenario 2 (Limited Uncached AI Generation Test)**: Strictly limited to 1 VU with 1–2 iterations testing real LLM inference time (via Groq Cloud API `openai/gpt-oss-20b`) without overloading external provider quotas or triggering Express `aiLimiter` (10 req/15 min).
- **Excluded Operations**: Heavy AI generation endpoints (`/generate-food` and `/admin/.../analyze`) are excluded from concurrent load testing to protect external API rate limits.

```bash
# Standard staged load test (Scenario 1 staged up to 50 VUs + Scenario 2 controlled uncached):
k6 run Load-tests/07-ai.js

# Target custom backend host with optional explicit cached/uncached IDs:
k6 run \
  -e BASE_URL=http://localhost:4000 \
  -e TEST_CACHED_STORE_ID=6671719fe1a78e67dc8c8dce \
  -e TEST_CACHED_FOOD_ID=6671720fe1a78e67dc8c8dd8 \
  -e TEST_UNCACHED_FOOD_ID=66716430bd4249c429fee76b \
  Load-tests/07-ai.js

# Fast smoke/verification run (5-10 VUs for 20s):
k6 run -e QUICK=true Load-tests/07-ai.js
```

---

## 5. Where Test Results Are Saved

- **Console**: k6 outputs live metrics, HTTP latencies, check percentages, and threshold statuses to stdout.
- **`Load-tests/results/`**: All structured summary reports, raw metric exports, and test artifacts should be stored in this directory.

---

## 6. Directory Structure

```text
Load-tests/
├── README.md             # Setup guide and instructions
├── config.js             # Centralized environment configs, thresholds, headers, and endpoints
├── helpers/
│   ├── auth.js           # Authentication helpers (login, signup, token headers)
│   └── checks.js         # Standard k6 assertion checks (status, success, error, latency)
└── results/              # Directory for test execution summaries and metrics
```

---

## 7. Important Backend Constraints & Design Notes

1. **Authentication Mechanism**:
   - The backend uses stateless JWT tokens signed with `JWT_SECRET`.
   - On login/signup, the server returns `{ success: true, token, data: { user } }` AND sets an HTTP-only cookie named `jwt`.
   - Protected routes accept either `Authorization: Bearer <token>` header or the `jwt` cookie.

2. **Rate Limiting Notice (`authAttemptLimiter`)**:
   - The backend applies `authAttemptLimiter` to `/api/v1/users/login` and `/api/v1/users/signup`, restricting requests to **6 attempts per 15 minutes per IP**.
   - **Critical Practice**: In load tests, avoid calling `login()` repeatedly inside the default VU iteration loop. Instead, authenticate once inside k6's `setup()` lifecycle hook and pass the returned token to the VU scenarios.

3. **Admin User RBAC**:
   - Public registration strictly assigns `role: "user"`.
   - Admin routes require `role: "admin"`. Ensure your test database has an account elevated to `role: "admin"` if running admin endpoint load tests.

4. **Cart Single-Restaurant Constraint**:
   - The cart service enforces that all items in a cart must come from the same restaurant. Attempting to add an item from another restaurant triggers an automatic replacement prompt or error. Load tests discover a matching pair of `restaurantId` and `foodItemId` during setup.

5. **Order Creation & Payment Provider Safety (`04-orders.js`)**:
   - `POST /api/v1/eats/orders/new` requires a `session_id` starting with `cs_` and interacts directly with the Stripe API (`retrieveSession`).
   - Finalization verifies `session.payment_status === "paid"`, matching customer email, atomic stock decrements, and cart clearance.
   - To safeguard live payments, prevent inventory exhaustion, and comply with `orderCreationLimiter` (15 req/10 min), order creation is isolated to Scenario B with controlled iterations (1 VU) and mock session IDs (`cs_loadtest_mock_...`), while read endpoints (`/me/myOrders`, `/:id`) carry the high concurrent load in Scenario A.

6. **Stripe Test Sandbox & Checkout Sessions (`05-payments.js`)**:
   - The project is configured with Stripe **Test Mode** API keys (`sk_test_...` and `pk_test_...`).
   - `POST /api/v1/payment/process` connects to Stripe's external API to create Checkout Session URLs (`https://checkout.stripe.com/...`).
   - Running `POST /payment/process` under high load is strictly prevented to avoid third-party API rate limits (Stripe 429), Express `paymentLimiter` (20 req/15 min), and creating hundreds of orphaned test sessions in Stripe.
   - `05-payments.js` tests `POST /payment/process` in a controlled scenario (1 VU), verifying empty cart validation (400) and test checkout session generation (200), while `GET /stripeapi` handles high read concurrency in Scenario A.

7. **AI Review Summaries Caching & LLM Provider (`07-ai.js`)**:
   - `POST /api/v1/ai/stores/:id/summary` and `POST /api/v1/ai/items/:id/summary` check for pre-computed summaries directly in MongoDB (`restaurant.reviewSentiment` / `food.reviewSentiment`) and an in-memory hash cache (`Map` with 1h TTL).
   - On cache hit, the response returns immediately with `{ cached: true }` (~100–150ms).
   - On cache miss, the service performs an external HTTPS call to the **Groq Cloud API** (`openai/gpt-oss-20b`) and saves the result to MongoDB.
   - High concurrent load tests exclusively target cached resources to protect Groq quotas and avoid triggering Express `aiLimiter` (10 req/15 min), while a single VU tests real LLM generation in a strictly limited scenario. Heavy admin endpoints (`/generate-food`, `/admin/.../analyze`) are excluded from high-load testing.

---

## 8. Metric Definitions & Reference

When reviewing the summary in stdout or `results/auth.json`:

| Metric Name | Type | Description |
|---|---|---|
| `http_reqs` | Counter | Total number of HTTP requests dispatched by all VUs across the test. |
| `http_req_failed` | Rate | Proportion of HTTP requests that returned failure status codes (4xx/5xx). |
| `http_req_duration` | Trend | End-to-end request latency from start of request to receiving full response (includes DNS, TLS, wait, and download). |
| `p(90)` / `p(95)` / `p(99)` | Percentile | 90%, 95%, or 99% of requests completed faster than this latency value. Essential for finding tail latencies. |
| `checks` | Rate | Percentage of functional assertion checks (e.g. status 200, JWT token validity) that passed. |
| `vus` / `vus_max` | Gauge | Current number of active virtual users and peak allocated VUs. |
| `iteration_duration` | Trend | Time taken to complete one full VU iteration (all 5 authentication steps + pacing sleep). |
| `iterations` | Counter | Total number of completed test scenario cycles across all VUs. |

