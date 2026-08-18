# Local Setup Guide

## 1. Prerequisites

- Node.js 18 or newer is recommended.
- npm.
- MongoDB reachable from the backend.
- Stripe test-mode keys for checkout.
- Optional: Cloudinary, SMTP/Mailtrap, and Groq credentials.

## 2. Install dependencies

```bash
cd backend
npm install
cd ../frontend
npm install
```

## 3. Configure the backend

Create `backend/config/config.env` locally. Do not commit it.

```env
PORT=4000
NODE_ENV=DEVELOPMENT
DB_LOCAL_URI=mongodb://127.0.0.1:27017/smartcraving
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRE=90d
JWT_COOKIE_EXPIRES_DAYS=90
FRONTEND_URL=http://localhost:5173

# Optional integrations
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-gmail-address@gmail.com
EMAIL_PASSWORD=your-16-character-google-app-password
EMAIL_FROM=your-gmail-address@gmail.com
# Optional alternative to SMTP. If set, password-reset emails use Resend.
RESEND_API_KEY=
# Optional explicit frontend origin used in reset links.
RESET_URL_ORIGIN=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_API_KEY=pk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
GROQ_API_KEY=
# Optional; defaults to openai/gpt-oss-20b. Override only with a currently supported Groq model.
GROQ_MODEL=openai/gpt-oss-20b
```

`FRONTEND_URL` supports comma-separated origins for CORS. The backend loads this file from `backend/server.js` and payment/order code reads it directly too.

For Stripe webhook testing, create a webhook endpoint at `/api/v1/stripe/webhook` and subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Store the signing secret in `STRIPE_WEBHOOK_SECRET`. Locally, Stripe CLI can forward events with `stripe listen --forward-to localhost:4000/api/v1/stripe/webhook`.

## 4. Configure the frontend

Create `frontend/.env.local` only if the API is not at the default host:

```env
VITE_API_URL=http://localhost:4000
```

The Axios client appends `/api`, resulting in `http://localhost:4000/api/v1/users/login`.

## 5. Run the applications

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## 6. Seed data

The current seeder imports `backend/data/foodItem.json`, but the repository sample JSON files are at the project root. Verify the import path and dataset before using it. The seeder deletes all existing food items before inserting data; use only with a disposable development database.

## 7. Verification

```bash
cd frontend
npm run build
npm run lint
cd ../backend
node --check app.js
node --check server.js
```

## 8. Troubleshooting

| Symptom | Checks |
| --- | --- |
| CORS error | Confirm the exact frontend origin is in `FRONTEND_URL`. |
| Database failure | Check `DB_LOCAL_URI`, network access, and credentials. |
| Login does not persist | Confirm Axios `withCredentials`, backend CORS credentials, and cookie settings. |
| Stripe checkout fails | Confirm test keys and valid item image URLs. |
| Password reset fails | Verify `RESEND_API_KEY` or all `EMAIL_*` values, plus `RESET_URL_ORIGIN` / `FRONTEND_URL`. |
| AI generation fails | Confirm `GROQ_API_KEY`; review analysis has a local fallback, food generation does not. |
