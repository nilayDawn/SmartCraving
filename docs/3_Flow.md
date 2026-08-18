# SmartCraving User and System Flows

## 1. Customer ordering flow

```text
Landing page → Restaurant list/search → Restaurant menu → Food details
→ Add item → Cart → Stripe Checkout → Payment success
→ /success?session_id=... → Retrieve Stripe session
→ Save order and delete cart → Confirmation/order details
```

1. `App` mounts and dispatches `loadUser`.
2. The customer browses/searches with `GET /api/v1/eats/stores`.
3. The customer opens a menu with `GET /api/v1/eats/stores/:storeId/menus`.
4. The customer opens a food item with `GET /api/v1/eats/item/:foodId`.
5. The cart action posts food item, restaurant, and quantity to `/api/v1/eats/cart/add-to-cart`; the backend derives the customer from the session.
6. A different restaurant replaces the existing cart.
7. Checkout posts the selected coupon code and cart context to `/api/v1/payment/process`; the server reloads prices, stock, and coupon rules.
8. Stripe collects payment and delivery data, then redirects to the frontend success URL.
9. The frontend posts the Stripe session ID to `/api/v1/eats/orders/new`.
10. The backend verifies payment status and customer ownership, rechecks stock, creates or returns the idempotent order for that Stripe session, and deletes the cart.
11. The customer can view orders through `/api/v1/eats/orders/me/myOrders`.

## 2. Authentication flow

```text
Signup/Login → Validate credentials → Issue JWT
→ Cookie or Bearer token → Protected request
→ protect middleware verifies the HTTP-only session cookie → req.user is available
```

Logout clears the authentication cookie. Password changes invalidate older JWTs through `passwordChangedAt`.

## 3. Catalogue administration flow

```text
Admin request → protect → authorizeRoles("admin")
→ Controller validation → MongoDB write → JSON response
→ Redux state refresh/update
```

Normal catalogue order: create restaurant, create linked menu, create linked food items, add food IDs to menu categories, then publish for browsing.

## 4. Review and AI flow

### Restaurant review

1. An authenticated customer submits `name`, `rating`, and `Comment`.
2. Backend appends the review and recalculates count/average.
3. The user clicks the restaurant or food-item AI summary button.
4. The frontend requests the corresponding summary endpoint.
5. Backend computes a content-hash fingerprint and uses an entity-scoped cache key (`restaurant:<id>:<hash>` or `food:<id>:<hash>`).
6. On **Cache Hit** (valid 1-hour TTL), cached sentiment (`sentiment`, `summaryBullets`, `topMentions`) is returned immediately.
7. On **Cache Miss**, backend sends the current comments to the AI service, caches the result, and persists the latest summary fields.
8. If external AI fails, the system uses a local heuristic analyzer fallback.

### Food metadata

The generate-only endpoint returns AI data for preview. The `/:foodId` endpoint saves `aiDescription`, `aiTags`, `aiAllergens`, `aiServes`, and `aiBestFor`.

Review summaries are authenticated and rate-limited. Existing summaries are returned from cache/document data; administrators generate missing summaries. Restaurant requests use `POST /api/v1/ai/stores/:id/summary`; food-item requests use `POST /api/v1/ai/items/:id/summary`.

## 5. Password reset flow

```text
Forgot form → POST /users/forgetPassword → Random token
→ Hashed token + expiry stored → Email reset URL
→ PATCH /users/resetPassword/:token → Match hash
→ Save new password and issue JWT
```

## 6. Failure paths

- Missing/invalid credentials: 400/401 and unauthenticated state.
- Missing protected token: 401.
- Missing resource: 404.
- Stripe cancellation: return to cart without creating an order.
- AI failure: review analysis has a local fallback; food generation returns an integration error.
- Unknown API route: JSON 404 from Express.

## 7. Consistency rules

- A cart contains items from one restaurant only.
- Orders snapshot item name, price, image, and quantity so catalogue edits do not rewrite history.
- Ratings are derived from review arrays.
- Frontend calls use `/api`; backend public endpoints use `/api/v1`.
