# SmartCraving Client Requirements

## 1. Project brief

SmartCraving is a web-based food-ordering platform that connects customers with restaurants. The platform must support restaurant discovery, menu browsing, secure checkout, coupon promotions, order tracking, reviews, and administrator operations.

The application must be usable on mobile, tablet, and desktop browsers.

## 2. Business objectives

- Increase restaurant and menu discoverability.
- Reduce friction from browsing to paid order.
- Give customers clear pricing, coupon savings, and order status.
- Give administrators control over catalogue, offers, orders, and customer feedback.
- Protect payment, inventory, account, and administrative data.

## 3. User types

### Guest

Guests can browse restaurants, menus, food details, ratings, reviews, and currently available offers. Guests must sign in before using the cart, placing an order, submitting a review, viewing order history, or requesting an AI review summary.

### Customer

Customers can register, sign in, manage their profile, browse menus, view food details from the cart, maintain a single-restaurant cart, apply coupons, pay through Stripe Checkout, view their own orders, receive restaurant status messages, submit reviews, and generate or view cached AI summaries for restaurants and food items.

### Administrator

Administrators can create, update, and delete restaurants, menus, food items, and coupons; delete restaurant and food-item reviews; manage order statuses and messages; generate AI food metadata; and analyze restaurant reviews.

Public registration cannot create an administrator account.

## 4. Customer journey

```text
Browse restaurants → Open menu → Open food details → Add food
→ Review cart → View/apply coupon → Stripe Checkout
→ Payment verification → Order confirmation → Track status
```

The cart supports one restaurant at a time. Adding food from another restaurant replaces the existing cart.

## 5. Coupon requirements

### Customer experience

- The cart must display currently active coupons.
- Each offer should show its code, subtitle, discount, minimum order, maximum discount, and expiry date where appropriate.
- Customers can click an offer to apply it or enter a code manually.
- The interface must show the discount amount and revised subtotal.
- If the cart changes, the coupon must be cleared or revalidated before checkout.
- Invalid, expired, or under-minimum coupons must show a clear error message.

### Business rules

- Coupon codes are case-insensitive and stored normalized in uppercase.
- Discount values must be between 0% and 100%.
- Minimum order and maximum discount cannot be negative.
- Date-only expiry values remain valid until the end of the displayed expiry date.
- The backend recalculates all discounts using server-side cart prices.
- Stripe checkout must receive the verified discount, not a client-calculated amount.

## 6. Order requirements

### Payment integrity

- An order is created only after Stripe confirms payment as paid.
- The Stripe customer email must match the authenticated customer.
- The Stripe session ID must be unique per order.
- Refreshing or revisiting the success page must not duplicate an order.
- Stock is checked again after payment and before order creation.

### Status rules

```text
Processing → Confirmed → Preparing → Out for delivery → Delivered
```

Cancellation is allowed before a terminal state. Delivered and Cancelled cannot be changed. The administrator may attach a customer-facing message to each status update.

## 7. Security and privacy requirements

- Use HTTP-only authentication cookies.
- Never store authentication tokens in browser localStorage.
- Enforce authorization on every protected API route.
- Customers can access only their own orders and account data.
- Validate all inputs server-side.
- Apply request-size and upload limits.
- Rate-limit authentication, payment, coupon validation, reviews, and AI endpoints.
- Restrict CORS to deployed frontend origin(s).
- Do not expose secrets, full payment sessions, passwords, or private customer details in logs.

## 8. Performance requirements

- Public restaurant lists may be cached briefly in memory.
- Menus may be cached briefly in memory and invalidated after edits.
- Coupon listings may be cached briefly in memory.
- Cart, payment, order, and user data must not use stale cache as the source of truth.
- Administrator screens should be lazy-loaded.
- Detail-page requests should be cancelled when the user leaves the page.
- Order lists should refresh while open so status changes become visible without a manual reload.

## 9. Acceptance checklist

- [ ] Guest can browse without signing in.
- [ ] Customer registration cannot create an admin account.
- [ ] Customer can open food details from the cart.
- [ ] Customer can see and apply active coupons.
- [ ] Coupon preview matches the amount sent to Stripe.
- [ ] Invalid and expired coupons are rejected.
- [ ] Payment completion cannot create duplicate orders.
- [ ] Customer cannot access another customer’s order.
- [ ] Admin can manage catalogue, coupons, orders, and AI features.
- [ ] Authenticated customers can generate AI review summaries, and repeated requests reuse cached summaries.
- [ ] Admin can delete restaurants, food items, and individual restaurant or food-item reviews.
- [ ] Terminal statuses cannot be changed.
- [ ] Application remains responsive on mobile and desktop.
- [ ] Security and build checks pass before release.

## 10. Future scope

- Restaurant-owner accounts with strict restaurant-level data isolation.
- Refund handling when payment succeeds but stock cannot be reserved.
- Refunds and customer cancellation workflow.
- Driver assignment and live delivery tracking.
- Multi-restaurant checkout.
- Persistent distributed caching such as Redis when traffic requires it.
