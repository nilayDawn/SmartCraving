# Security and Operations Guide

## Secret handling

Never commit database URLs, JWT secrets, Stripe keys, Cloudinary secrets, SMTP passwords, or Groq keys. Store them in deployment secret management and inject environment variables. Any credentials previously placed in a tracked/local config file should be treated as compromised and rotated.

The frontend may receive only the Stripe publishable key. It must never receive `STRIPE_SECRET_KEY`, `JWT_SECRET`, database credentials, or provider API keys.

## Authentication hardening

- Use secure, HTTP-only, same-site cookies in production.
- Set a production-specific `JWT_SECRET` and reasonable token expiry.
- Rate-limit login, signup, password reset, and review endpoints.
- Avoid revealing whether an email exists from password recovery.
- Require authentication for customer-owned writes.

## Authorization hardening

Review these current routes before production:

- Cart add/update/delete trust `userId` from the request body.
- Coupon CRUD routes are not protected by admin middleware.
- AI generation/save and review-analysis routes are not protected by admin middleware.
- Order detail checks existence but should also verify ownership unless requester is admin.
- Restaurant and food review endpoints are public writes.

The safe pattern is to call `protect`, derive ownership from `req.user.id`, then apply `authorizeRoles("admin")` where appropriate.

## Input and payment validation

- Validate IDs, quantities, prices, ratings, and nested objects before database/provider calls.
- Do not trust client-provided prices or images for payment; look up product data server-side.
- Use Stripe webhooks to make payment confirmation authoritative.
- Make order creation idempotent using the Stripe session/payment intent ID.
- Handle missing carts, shipping details, empty images, and duplicate success-page requests.
- Add transaction or compensating logic for inventory updates and order creation.

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
