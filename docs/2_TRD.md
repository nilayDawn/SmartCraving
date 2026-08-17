# SmartCraving Technical Requirements Document

## 1. Architecture

```text
Browser
  └── React + Vite frontend
        ├── React Router
        ├── Redux Toolkit (user, restaurant, menu, cart, order)
        └── Axios (credentials-enabled API client)
              │ HTTP/JSON + cookies
              ▼
        Express backend (/api/v1)
          ├── Controllers and routes
          ├── Auth, role, and error middleware
          ├── Mongoose models
          └── Stripe, Cloudinary, SMTP, and Groq integrations
                │
                └── MongoDB
```

## 2. Repository layout

```text
backend/
  app.js                 middleware and route mounting
  server.js              environment loading, DB connection, startup
  config/                database, Cloudinary, environment config
  controllers/           request and response logic
  middlewares/           auth, roles, async/error handling
  models/                Mongoose schemas
  routes/                API route definitions
  services/              Groq AI integrations
  utils/                 email, JWT response, API features, errors
frontend/
  src/components/        pages and reusable UI
  src/redux/actions/      async API workflows
  src/redux/slices/       Redux state and reducers
  src/utils/api.js        shared Axios instance
docs/                     product and engineering documentation
```

## 3. Runtime and dependencies

- Node.js and npm are required for both applications.
- Backend uses CommonJS and Express 4.
- Frontend uses ES modules, React 18, Vite, React Router, Redux Toolkit, Axios, Tailwind CSS, and Stripe browser libraries.
- MongoDB is required for runtime data.
- Stripe, Cloudinary, SMTP, and Groq are optional by feature; payment and AI flows require their corresponding credentials.

## 4. Frontend requirements

| Route | Screen |
| --- | --- |
| `/` | Landing page |
| `/restaurants` | Restaurant list |
| `/eats/stores/search/:keyword` | Search results |
| `/eats/stores/:id/menus` | Restaurant menu |
| `/eats/food/:id` | Food details and reviews |
| `/users/login` | Login |
| `/users/signup` | Registration |
| `/users/me` | Profile |
| `/users/me/update` | Profile update |
| `/users/forgetPassword` | Password recovery |
| `/users/resetPassword/:token` | New password |
| `/cart` | Cart and checkout |
| `/success` | Post-payment order creation |
| `/eats/orders/me/myOrders` | Customer order history |
| `/eats/orders/:id` | Order details |

The API client base URL is `${VITE_API_URL || "http://localhost:4000"}/api`, with `withCredentials: true`. Array query parameters are serialized with repeated keys.

The Redux store contains `restaurants`, `menus`, `user`, `cart`, and `order` slices. Async actions should preserve each slice’s loading, success, and error conventions.

## 5. Backend requirements

- Load `backend/config/config.env` before creating the server.
- Connect to MongoDB before relying on persistence.
- Parse JSON, URL-encoded bodies, cookies, uploads, and CORS credentials.
- Mount endpoints under `/api/v1`.
- Return JSON 404 responses for unknown routes.
- Pass asynchronous failures to shared error middleware.
- Use `protect` for customer-owned resources and `authorizeRoles("admin")` for admin catalogue operations.

## 6. Authentication design

1. Signup/login creates a JWT containing the user ID.
2. `sendToken` returns/sends the token according to the current implementation.
3. Protected routes accept `Authorization: Bearer <token>` or the `jwt` cookie.
4. The backend verifies the signature, loads the user, and rejects tokens issued before `passwordChangedAt`.
5. The frontend calls `/v1/users/me` at startup to restore session state.

Passwords are hashed with bcrypt before save and excluded from normal queries with `select: false`.

## 7. Payment design

The backend creates a Stripe Checkout Session from cart items. The session uses INR, collects phone and shipping address, adds a fixed delivery option, and redirects to the configured frontend URL. The success page sends `session_id` to `/v1/eats/orders/new`, where the server retrieves the session, creates an order, and deletes the cart.

Payment amounts must be calculated and validated server-side. Never expose `STRIPE_SECRET_KEY` or use it in frontend code.

## 8. Response conventions

Existing controllers use both direct fields and `data` wrappers. New endpoints should prefer:

```json
{
  "success": true,
  "data": {},
  "message": "Optional human-readable message"
}
```

Client code should handle existing `message`, `errMessage`, `data`, `restaurants`, `orders`, and `order` contracts.

## 9. Verification

```bash
cd frontend && npm run build && npm run lint
cd backend && node --check app.js && node --check server.js
```

For route/controller changes, run `node --check` on every changed JavaScript file and manually verify the affected flow with MongoDB running.

The repository CI workflow applies these checks automatically on pushes to `main` and pull requests targeting `main`. See [8_CI_CD.md](./8_CI_CD.md) for the workflow design and branch-protection recommendations.
