# Backend documentation

## Overview

The backend is a CommonJS Express API using MongoDB through Mongoose. It handles authentication, restaurants, menus, food items, carts, orders, Stripe payment setup, Cloudinary configuration, and review/AI workflows.

## Local development

```bash
cd backend
npm install
npm run dev
```

The API listens on the `PORT` defined in `config/config.env` (normally `4000`). The frontend expects the API prefix `/api/v1`.

## Environment configuration

Create or update `backend/config/config.env` locally. Required values include:

```env
PORT=4000
NODE_ENV=DEVELOPMENT
DB_LOCAL_URI=<mongodb-connection-string>
JWT_SECRET=<secret>
JWT_EXPIRE=90d
FRONTEND_URL=http://localhost:5173
```

Optional integrations use Cloudinary, SMTP, Stripe, and `GROQ_API_KEY`. Never commit real credentials, tokens, database URLs, or payment keys. Use deployment secret storage and rotate any credentials that have been exposed.

## Application structure

```text
app.js              Middleware and route mounting
server.js           Environment loading, database connection, server startup
routes/             Express route definitions
controllers/        Request handlers and response contracts
models/             Mongoose schemas
middlewares/        Authentication, role authorization, and error handling
services/           AI and external-service integrations
config/             Database and service configuration
```

## API route groups

| Prefix | Purpose |
| --- | --- |
| `/api/v1/users` | Signup, login, logout, profile, password flows |
| `/api/v1/eats/stores` | Restaurant listing, details, admin management |
| `/api/v1/eats/menus` | Menu operations |
| `/api/v1/eats/item` | Food item details and admin management |
| `/api/v1/eats/cart` | Add, update, remove, and fetch cart items |
| `/api/v1/eats/orders` | Create and read orders |
| `/api/v1/ai` | Food generation and review analysis |

Important cart endpoints:

```text
POST   /api/v1/eats/cart/add-to-cart
POST   /api/v1/eats/cart/update-cart-item
DELETE /api/v1/eats/cart/delete-cart-item
GET    /api/v1/eats/cart/get-cart
```

## API conventions

- Preserve the `/api/v1` prefix and existing frontend contracts.
- Use `protect` and `authorizeRoles("admin")` for protected operations.
- Keep cookie credentials enabled for authenticated frontend requests.
- Pass unexpected errors to the shared error middleware.
- Configure allowed frontend origins through `FRONTEND_URL`; comma-separated origins are supported.

## Verification

```bash
node --check app.js
node --check server.js
node --check routes/<changed-route>.js
```

Run the frontend build and lint as an integration check when changing API response shapes or routes.
