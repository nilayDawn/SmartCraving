# 💻 SmartCraving Local Development Setup Guide

[![Node](https://img.shields.io/badge/Node.js-%E2%89%A518.0.0-green?style=flat-square)](#)
[![npm](https://img.shields.io/badge/npm-%E2%89%A59.0.0-red?style=flat-square)](#)

---

## 1. Prerequisites
- **Node.js**: $\ge 18.0.0$ (LTS recommended)
- **MongoDB**: Local MongoDB instance (`mongod`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster URI.
- **Git**

---

## 2. Step-by-Step Installation

### Step 2.1: Clone Repository
```bash
git clone https://github.com/your-username/FoodProject.git
cd FoodProject
```

### Step 2.2: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2.3: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

## 3. Environment Configuration

### Backend: `backend/config/config.env`
Create `backend/config/config.env`:

```env
PORT=4000
NODE_ENV=DEVELOPMENT
DB_LOCAL_URI=mongodb://127.0.0.1:27017/foodproject
JWT_SECRET=super_secure_jwt_secret_key_minimum_32_chars
JWT_EXPIRE=90d
JWT_COOKIE_EXPIRES_DAYS=90
FRONTEND_URL=http://localhost:5173

# Optional: Stripe Payment (Required for live test checkouts)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_API_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Cloudinary Media Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional: AI Review Insights (Groq Cloud)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama3-70b-8192

# Optional: SMTP Password Recovery Emails
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_google_app_password
EMAIL_FROM="SmartCraving <no-reply@smartcraving.com>"
```

### Frontend: `frontend/.env`
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:4000
```

---

## 4. Database Seeding (Optional)
To populate the database with sample restaurants, menus, and dishes:
```bash
cd backend
npm run seeder
```

---

## 5. Verification & Tests
Run the automated test runner to ensure the environment is correctly configured:
```bash
cd backend
npm test
# Expected Output: Tests Finished: 9 Passed, 0 Failed
```

---

## 6. Launching Application Servers

Open two terminal windows:

### Terminal 1: Backend
```bash
cd backend
npm run dev
# Server running on http://localhost:4000
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
# Vite dev server running on http://localhost:5173
```
