# SmartCraving Product Requirements Document

## 1. Product overview

SmartCraving is a responsive food-discovery and online-ordering platform. Customers can discover restaurants, browse menus, review food, add items from one restaurant to a cart, apply coupons, pay through Stripe Checkout, and track their orders. Administrators manage restaurants, menus, food items, coupons, order status, and AI-assisted content.

The client-facing requirements are maintained in [Client Requirements](./10_Client_Requirements.md).

## 2. Product goals

1. Provide a simple restaurant and food discovery experience.
2. Support secure customer registration and authenticated sessions.
3. Make cart, coupon, checkout, and order history easy to understand.
4. Give administrators reliable catalogue, coupon, order, and review-management tools.
5. Keep payment, inventory, authorization, and customer data integrity server-controlled.

## 3. Users and permissions

### Visitor

Can browse restaurants, menus, food details, public ratings, reviews, and available offers. Login is required for cart actions, checkout, reviews, order history, and AI-generated review summaries.

### Customer (`user`)

Can manage their profile, maintain a single-restaurant cart, apply coupons, checkout, view their own orders, submit reviews, and view cached AI summaries.

Public signup always creates a customer account. It cannot create an administrator account.

### Administrator (`admin`)

Can manage restaurants, menus, food items, coupons, order statuses, restaurant review analysis, and AI food metadata. Admin-only APIs require authentication and role authorization.

The `restaurant-owner` role exists in the data model but restaurant ownership scoping is not part of the current release.

## 4. Functional scope

### Discovery and catalogue

- Search restaurants by name, address, or food-item name.
- Browse restaurant menus and food details.
- Show food images, descriptions, prices, stock, ratings, reviews, and optional AI metadata.
- Allow administrators to create, update, and delete catalogue records.

### Cart and coupons

- Allow customers to add food from one restaurant at a time.
- Adding food from another restaurant replaces the existing cart.
- Allow quantity changes only within available stock.
- Display active coupons in the cart.
- Allow manual coupon-code entry or one-click application.
- Validate minimum order amount, expiry, percentage discount, and maximum discount.
- Revalidate coupon and cart prices on the server during checkout.

### Checkout and orders

- Create a Stripe Checkout session from the server-side cart.
- Collect customer email, phone, shipping address, and payment.
- Apply coupon discounts and delivery charges in Stripe.
- Create an order only after Stripe reports a paid session.
- Prevent duplicate orders when the success page is refreshed or revisited.
- Decrement stock only after successful payment and restore it if order creation fails.
- Show customer orders and order details only to the owning customer or an administrator.

### Order status

Statuses progress forward through:

`Processing → Confirmed → Preparing → Out for delivery → Delivered`

An order may be cancelled before reaching a terminal status. `Delivered` and `Cancelled` are terminal and cannot be changed. Administrators can optionally attach a customer message to a status update.

### Reviews and AI

- Authenticated customers can submit food and restaurant reviews.
- Review summaries are cached by entity and review content.
- Authenticated users can read existing AI summaries.
- Administrators can generate missing summaries and AI food metadata.
- AI requests are authenticated, rate-limited, input-validated, and protected from unauthorised quota usage.

## 5. Security requirements

- Public signup creates only `user` accounts.
- Authentication uses an HTTP-only JWT cookie; the frontend does not store JWTs in localStorage.
- Protected routes require authentication in both frontend and backend.
- Backend authorization is authoritative and never trusts client-provided user IDs, prices, roles, or order ownership.
- Payment sessions must be paid and belong to the authenticated customer.
- Order creation is idempotent by Stripe session ID.
- Credentialed CORS accepts only explicitly configured origins.
- Authentication, payment, coupon, review, and AI endpoints are rate-limited.
- Request bodies and uploads have size limits.
- Admin writes use explicit field allowlists and schema validation.

## 6. Performance requirements

- Cache public restaurant lists for 30 seconds in memory.
- Cache restaurant menus for 60 seconds in memory.
- Cache available coupons for 60 seconds in memory.
- Invalidate caches after catalogue mutations.
- Do not cache cart, payment, order, or authentication data.
- Lazy-load administrator screens.
- Cancel active requests when key detail/admin screens unmount.
- Refresh order lists periodically while the order-list screen is open.

## 7. Acceptance criteria

- A visitor can browse without an account.
- A new signup cannot obtain admin privileges by modifying the request payload.
- A customer can add items, view food details from the cart, apply a valid coupon, and see the discount before checkout.
- Invalid, expired, under-minimum, or malformed coupons are rejected consistently in the UI and API.
- Stripe checkout and the final order use the same server-verified coupon calculation.
- Refreshing the payment success URL does not create a duplicate order.
- A customer cannot view another customer’s order by changing the URL.
- Terminal order statuses cannot be changed.
- Admin-only AI and catalogue operations reject unauthenticated or non-admin requests.
- Frontend lint/build and backend syntax checks pass in CI.

## 8. Current exclusions and future decisions

- Restaurant-owner ownership isolation is not implemented yet.
- Signed Stripe webhooks finalize paid sessions even when the customer closes the browser; the success flow remains an authenticated idempotent retry/fallback.
- Refund workflow and customer self-cancellation are not included.
- Driver assignment and live map tracking are not included.
- Cross-restaurant checkout is not included.
