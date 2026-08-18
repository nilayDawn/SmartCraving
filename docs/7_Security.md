# Security and Operations Guide

## Secret handling

Never commit database URLs, JWT secrets, Stripe keys, Cloudinary secrets, SMTP passwords, or Groq keys. Store them in deployment secret management and inject environment variables. Any credentials previously placed in a tracked/local config file should be treated as compromised and rotated.

The frontend may receive only the Stripe publishable key. It must never receive `STRIPE_SECRET_KEY`, `JWT_SECRET`, database credentials, or provider API keys.

## Authentication hardening

- Use secure, HTTP-only, same-site cookies in production.
- Treat `NODE_ENV` case-insensitively when configuring production cookies; cross-origin deployments require `Secure` and `SameSite=None`.
- Set a production-specific `JWT_SECRET` and reasonable token expiry.
- Rate-limit login, signup, password reset, payment, coupon, review, and AI endpoints.
- Avoid revealing whether an email exists from password recovery.
- Require authentication for customer-owned writes.

## Authorization hardening

Current authorization rules:

- Cart add/update/delete derive the user from the authenticated request rather than trusting a body-supplied user ID.
- Coupon create/update/delete require `admin`; listing is public and validation requires an authenticated user.
- Food metadata generation and administrative review analysis require `admin`; review-summary requests require authentication and may generate a missing summary for any authenticated user. Summary endpoints are rate-limited and reuse cached results.
- Order details require the order owner or an administrator.
- Restaurant and food reviews require authentication and are rate-limited. Review deletion requires `admin`.

Purchase access is restricted to `user` and `restaurant-owner` roles. Cart read/write, Stripe payment-session creation, and post-payment order creation all require authentication plus one of those roles. Cart controllers derive the target user from `req.user._id`; client-supplied `userId` values are ignored.

The safe pattern is to call `protect`, derive ownership from `req.user.id`, then apply `authorizeRoles("admin")` where appropriate.

## Input and payment validation

- Validate IDs, quantities, prices, ratings, and nested objects before database/provider calls.
- Do not trust client-provided prices or images for payment; look up product data server-side.
- Verify Stripe `payment_status`, customer ownership, and the unique session ID before creating an order.
- Order creation is idempotent using the Stripe session ID. Signed Stripe webhooks finalize paid sessions when the browser success page is not reached; the success endpoint remains a safe retry/fallback.
- Handle missing carts, shipping details, empty images, and duplicate success-page requests.
- Add transaction or compensating logic for inventory updates and order creation.
- Recheck stock at payment-session creation and order finalization; compensate stock when finalization fails.

## Request and browser hardening

- Credentialed CORS accepts only exact configured frontend origins.
- JSON payloads are limited to 5 MB, URL-encoded payloads to 100 KB, and uploads to 5 MB.
- Public signup always creates a customer role.
- The frontend uses the HTTP-only cookie and does not persist JWTs in localStorage.
- Admin writes use explicit field allowlists and Mongoose validation.

## Deployment checklist

- Set `NODE_ENV=PRODUCTION` and production frontend origins.
- Use HTTPS for frontend, API, and callbacks.
- Restrict MongoDB network access and create a least-privileged DB user.
- Configure structured logs without secrets or full payment sessions.
- Add health checks for API, database, Stripe configuration, and AI availability.
- Back up MongoDB and document restore procedures.
- Run frontend build/lint and backend syntax checks in CI.
- Review CORS origins and upload limits.

## Observability

Record request method/path/status, latency, request ID, and sanitized error context. Track checkout-session failures, order-creation failures, authentication failures, and external AI/SMTP failures separately.
