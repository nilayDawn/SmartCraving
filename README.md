# 🥗 SmartCraving - An AI-Powered Food Ordering and Restaurant Intelligence Platform

**SmartCraving** is a full-stack, state-of-the-art food ordering and restaurant management platform built using React 18, Vite, Redux Toolkit, Node.js, Express, and MongoDB.

---

## 📚 System Documentation & Specifications

| Document | Description |
|---|---|
| 📋 [Product Requirements (PRD)](./docs/1_PRD.md) | Product scope, user personas, functional requirements, and target metrics |
| 🛠️ [Technical Requirements (TRD)](./docs/2_TRD.md) | System architecture, frontend/backend stack, security, and directory layout |
| 🔄 [System Flows & Sequences](./docs/3_Flow.md) | User authentication, order fulfillment, admin operations, and failure recovery flows |
| 🔌 [API Reference & Specifications](./docs/4_API.md) | REST API endpoints catalog, request/response payload examples, and auth rules |
| 🗄️ [Data Model & Schemas](./docs/5_Data_Model.md) | MongoDB collections, schema fields, relationships, and data invariants |
| 💻 [Local Setup Guide](./docs/6_Local_Setup.md) | Installation prerequisites, environment variables configuration, and dev commands |
| 🛡️ [Security & Deployment](./docs/7_Security.md) | Secret management, security hardening checklist, testing, and production deployment |

---

## ✨ Key Features

### 👤 Role-Based Authentication & Access Control
- **Role Selection during Registration**: Users select their role (`Customer (user)` or `Administrator (admin)`) marked with a required field symbol (`*`).
- **Protected Admin Routes**: Access to management routes (`/admin/dashboard`, `/admin/restaurants/new`, `/admin/items/new`) is strictly restricted to verified `admin` accounts via `AdminRoute` middleware.

### 📸 Direct Photo Upload Beside Image URL Links (Admin Feature)
- **Side-by-Side Dual Photo Input**: Admins creating restaurants or menu items can directly upload photo files from their computer (with live instant previews) side-by-side with an Image URL link input.
- **Resilient Image Handling**: Seamlessly handles Base64 Data URIs and external URL links with Cloudinary upload integration and automatic fallbacks.
- **Automatic Menu Linkage**: Adding a food item automatically links it to the restaurant's menu collection under the specified category.

### 🤖 AI-Powered Restaurant Insights & Sentiment Caching
- **Automated Review Sentiment Analysis**: Generates guest sentiment (`positive`, `negative`, `mixed`), key summary bullets, and top mention tags.
- **In-Memory Review Sentiment Caching**: Implemented a content-hash fingerprint cache (`reviewSentimentCache`) with a 1-hour TTL. Re-uses sentiment analysis results for unchanged reviews to eliminate redundant API calls and optimize latency.

### 🛒 Complete E-Commerce Experience
- **Interactive Restaurant Catalog**: Filtering by category, vegetarian preferences, and search keywords.
- **Cart & Checkout Flow**: Live item quantity adjustments, subtotal calculations, coupon codes, and order placement.
- **Order Tracking**: Order status breakdown (`Processing`, `Delivered`, etc.) and history.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Redux Toolkit, Tailwind CSS v4, React Router v6, React Toastify |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose, JWT (Cookies/Header) |
| **Cloud & Media** | Cloudinary v2, Express FileUpload, Body Parser (50MB payload limit) |
| **AI Integration** | Google Gemini API (Review summarization & menu generation) |

---

## 📂 Project Architecture

```
FoodProject/
├── backend/
│   ├── config/          # Database & Cloudinary configuration
│   ├── controllers/     # Auth, Restaurant, FoodItem, Menu, Order controllers
│   ├── middlewares/     # Auth (protect), Role authorization (authorizeRoles), Error handlers
│   ├── models/          # Mongoose Schemas (User, Restaurant, FoodItem, Menu, Order)
│   ├── routes/          # API Route endpoints
│   ├── services/        # AI Review Analyzer service
│   ├── app.js           # Express app setup & middleware stack
│   └── server.js        # HTTP Server entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/  # React Components
│   │   │   ├── admin/   # Admin Dashboard, AddRestaurant, AddFoodItem, AdminRoute
│   │   │   ├── cart/    # Cart & Order Success
│   │   │   ├── layout/  # Header (Nav & Role Links), Footer, Search
│   │   │   ├── order/   # ListOrders & OrderDetails
│   │   │   └── user/    # Login, Register (Role selector *), Profile
│   │   ├── redux/       # Redux Toolkit Slices & Thunk Actions
│   │   ├── utils/       # Axios API client setup
│   │   ├── App.jsx      # Main Application & Router configuration
│   │   └── index.css    # Global CSS & Tailwind Design Tokens
│   ├── index.html
│   └── vite.config.js
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally or a MongoDB Atlas URI

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:

```env
PORT=4000
NODE_ENV=DEVELOPMENT
DB_LOCAL_URI=mongodb://127.0.0.1:27017/foodproject
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
COOKIE_EXPIRES_TIME=7
FRONTEND_URL=http://localhost:5173

# Optional: Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start the backend server:

```bash
npm run dev
```

### 2. Frontend Setup

In a new terminal tab:

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` folder:

```env
VITE_API_URL=http://localhost:4000
```

Start the frontend development server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔐 Role Authorization & API Endpoints

### Authentication
- `POST /api/v1/users/signup` - Register user with role selector (`user` / `admin`) *
- `POST /api/v1/users/login` - User authentication
- `GET /api/v1/users/me` - Get logged-in user profile
- `GET /api/v1/users/logout` - Sign out

### Admin Endpoints (Protected - Admin Role Required)
- `POST /api/v1/eats/stores` - Create a restaurant (supports direct photo upload & image link)
- `DELETE /api/v1/eats/stores/:storeId` - Delete a restaurant
- `POST /api/v1/eats/item` - Add a food item (supports direct photo upload & image link)
- `PATCH /api/v1/eats/item/:foodId` - Update a food item
- `DELETE /api/v1/eats/item/:foodId` - Delete a food item

### Public & Customer Endpoints
- `GET /api/v1/eats/stores` - List all restaurants
- `GET /api/v1/eats/stores/:storeId/menus` - Get menu & dishes for a restaurant
- `GET /api/v1/eats/food/:id` - Get food item details
- `POST /api/v1/eats/orders/new` - Create a new order

---

## 📄 License
Copyright (C) 2026  Nilay Dawn

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See the [LICENSE](LICENSE) file for more details.
