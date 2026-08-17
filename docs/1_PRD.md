# SmartCraving Product Requirements Document

## 1. Product summary

SmartCraving is an AI-powered web application for discovering restaurants, browsing their menus, adding food to a single-restaurant cart, paying online, and reviewing previous orders. The current product is configured around the Zyka restaurant use case, but the data model supports multiple restaurants.

The product has two primary audiences: customers who want a fast food-ordering experience, and administrators/restaurant operators who maintain restaurants, menus, food items, coupons, and review insights.

## 2. Goals

1. Let visitors discover restaurants without signing in.
2. Let customers create accounts, sign in, and keep authenticated sessions.
3. Make menus and food details easy to browse on mobile and desktop.
4. Keep a cart scoped to one restaurant at a time.
5. Use Stripe Checkout to collect payment, delivery address, and phone number.
6. Persist completed orders and make them available in customer order history.
7. Give operators basic catalogue administration and AI-assisted content/review summaries.

## 3. Non-goals in the current implementation

- Multi-restaurant checkout in one order.
- Driver assignment, live delivery tracking, or delivery-partner workflows.
- A customer-facing restaurant-owner dashboard.
- Refunds, cancellations, order-status updates, or Stripe webhooks.
- Inventory reservation during checkout.
- A complete coupon application flow in Stripe Checkout.

## 4. Personas and permissions

### Visitor

Can view the landing page, restaurant listings, menus, food details, and public reviews. A visitor can access login, registration, and password-recovery screens.

### Customer (`user`)

Can manage a profile, maintain a cart, start checkout, create an order after successful payment, view orders, view order details, and submit food or restaurant reviews.

### Restaurant owner (`restaurant-owner`)

The role exists in the user schema. Current route guards primarily grant catalogue administration to `admin`; owner-specific authorization is not implemented.

### Administrator (`admin`)

Can create/delete restaurants, create/delete menus, create/update/delete food items, manage coupons, and run restaurant review analysis. These actions should be protected by authentication plus the admin-role middleware.

## 5. Functional requirements

### Restaurant discovery

- Show restaurant count and restaurant cards.
- Support keyword search through the `keyword` query parameter.
- Allow client-side sorting by ratings or review count.
- Allow a vegetarian-only view based on `isVeg`.
- Open a restaurant detail/menu view.

### Menu and food browsing

- Load menus for a restaurant and populate food items.
- Display food name, description, price, images, stock, rating, and reviews.
- Expose optional AI metadata: description, tags, allergens, serving size, and best-for meal times.

### Account management

- Register with name, email, password confirmation, and a ten-digit phone number.
- Log in and log out using an HTTP-only JWT cookie or Bearer token.
- Load the current user when the React app starts.
- Update profile information and avatar.
- Change password.
- Request and complete a password reset through an emailed token.

### Cart

- Add an item with a quantity, increase or replace its quantity, remove it, and fetch it.
- If an item from another restaurant is added, replace the existing cart with the new restaurant’s cart.

### Checkout and orders

- Send cart line items to Stripe Checkout.
- Collect customer email, phone number, and delivery address.
- Apply the configured fixed delivery charge in the Stripe session.
- Redirect to `/success` after payment or `/cart` after cancellation.
- Retrieve the completed Stripe session and persist an Order document.
- Delete the cart after order creation.
- Show customer order history and individual order details.

### Reviews and AI

- Accept restaurant and food-item reviews and update average ratings/counts.
- Generate food metadata without saving it, or generate and save it to a food item.
- Analyze restaurant reviews into sentiment, summary bullets, and top mentions.
- Fall back to a local review summary if the external review-AI call fails or returns invalid JSON.

## 6. Non-functional requirements

- Frontend: React single-page application, responsive layout, keyboard-accessible controls, visible loading/error states.
- Backend: Express API with a stable `/api/v1` prefix.
- Persistence: MongoDB through Mongoose.
- Authentication: hashed passwords and signed JWTs; authenticated browser requests use credentials.
- Payments: Stripe Checkout; secret keys remain server-side.
- Integrations: Cloudinary for images, SMTP/Mailtrap for password reset, and Groq for AI enrichment.
- CORS allows only configured frontend origins.

## 7. Success criteria

- A new customer can register, browse, add food, pay in Stripe test mode, and see the resulting order.
- An authenticated customer can reload the page and remain signed in while the JWT is valid.
- Admin catalogue changes are rejected for unauthenticated/non-admin users.
- Public restaurant and food pages remain usable when optional AI services are unavailable.
- Frontend production build and lint complete successfully.

## 8. Risks and open decisions

- Payment-to-order creation currently depends on the success-page request rather than a Stripe webhook. A customer could pay successfully while order creation is interrupted.
- Cart mutation endpoints accept `userId` from the request body. They should use `req.user.id` after authentication is added.
- Order creation assumes a cart, Stripe shipping details, and at least one item image exist; validation is needed before production use.
- Reviews are public write endpoints. Decide whether reviews require authentication and whether duplicate reviews are allowed.
- Coupon validation needs a coupon-code filter and integration with Stripe amount calculation before it is advertised as a checkout feature.
