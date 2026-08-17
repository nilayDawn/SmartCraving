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
5. The cart action posts food item, restaurant, user, and quantity to `/api/v1/eats/cart/add-to-cart`.
6. A different restaurant replaces the existing cart.
7. Checkout posts items to `/api/v1/payment/process`.
8. Stripe collects payment and delivery data, then redirects to the frontend success URL.
9. The frontend posts the Stripe session ID to `/api/v1/eats/orders/new`.
10. The backend maps Stripe data to `deliveryInfo`/`paymentInfo`, creates the order, and deletes the cart.
11. The customer can view orders through `/api/v1/eats/orders/me/myOrders`.

## 2. Authentication flow

```text
Signup/Login → Validate credentials → Issue JWT
→ Cookie or Bearer token → Protected request
→ protect middleware verifies token → req.user is available
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

1. Client submits `name`, `rating`, and `Comment`.
2. Backend appends the review and recalculates count/average.
3. Backend computes a content-hash fingerprint (`computeReviewsHash`) of the reviews array and checks the in-memory `reviewSentimentCache`.
4. On **Cache Hit** (valid 1-hour TTL), cached sentiment (`sentiment`, `summaryBullets`, `topMentions`) is returned immediately.
5. On **Cache Miss**, backend calls Groq analysis, caches the JSON response, and stores sentiment, summary bullets, and top mentions.
6. If external AI fails, the system uses a smart local heuristic analyzer fallback to guarantee instant summary generation.

### Food metadata

The generate-only endpoint returns AI data for preview. The `/:foodId` endpoint saves `aiDescription`, `aiTags`, `aiAllergens`, `aiServes`, and `aiBestFor`.

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
