# 🔌 SmartCraving REST API Reference

[![API Base](https://img.shields.io/badge/Base_URL-%2Fapi%2Fv1-blue?style=flat-square)](#)
[![Format](https://img.shields.io/badge/Format-JSON-brightgreen?style=flat-square)](#)

All endpoints accept and return `application/json` unless otherwise noted. All requests must pass through the security middleware stack (Helmet, MongoSanitize, HPP, and Rate Limiters).

---

## Standard JSON Response Envelopes

### Success Envelope
```json
{
  "status": "success",
  "data": { ... }
}
```

### Operational Error Envelope
```json
{
  "status": "fail",
  "message": "Human readable error description",
  "errMessage": "Human readable error description"
}
```

---

## 1. Authentication & User Management (`/api/v1/users`)

| Method | Endpoint | Auth | Rate Limit | Description |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/signup` | Public | 15 / 15m | Register customer account & receive JWT session. |
| `POST` | `/login` | Public | 15 / 15m | Authenticate credentials & receive JWT session. |
| `GET` | `/logout` | Public | — | Clears HTTP-Only authentication cookie. |
| `POST` | `/forgetPassword` | Public | 5 / 15m | Request password recovery email. |
| `PATCH`| `/resetPassword/:token` | Public | 10 / 15m | Set new password using email recovery token. |
| `GET` | `/me` | User | — | Get authenticated profile data. |
| `PUT` | `/me/update` | User | — | Update name, email, or avatar. |
| `PUT` | `/password/update` | User | — | Update account password. |

---

## 2. Restaurant Catalogue & Menus (`/api/v1/eats`)

| Method | Endpoint | Auth | Caching | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/restaurants/count` | Public | 10m TTL | Total count of registered restaurants. |
| `GET` | `/stores` | Public | 5m TTL | Search and list restaurants (filters: search, sort). |
| `POST` | `/stores` | Admin | Purge Cache | Register a new restaurant. |
| `GET` | `/stores/:storeId` | Public | 5m TTL | Fetch restaurant details by ObjectId. |
| `DELETE`| `/stores/:storeId` | Admin | Purge Cache | Delete restaurant and linked menus. |
| `GET` | `/stores/:storeId/menus` | Public | 5m TTL | Fetch menu categories and items for a restaurant. |
| `POST` | `/stores/:storeId/menus` | Admin | Purge Cache | Create a new menu for a restaurant. |
| `PATCH`| `/stores/:storeId/menus/:menuId/addItem` | Admin | Purge Cache | Add food item ID to a menu category. |
| `DELETE`| `/stores/:storeId/menus/:menuId` | Admin | Purge Cache | Delete a menu. |
| `POST` | `/item` | Admin | Purge Cache | Create a new food dish. |
| `GET` | `/items/:storeId` | Public | 5m TTL | Fetch all dishes belonging to a restaurant. |
| `GET` | `/item/:foodId` | Public | 5m TTL | Fetch food item details and reviews. |
| `PATCH`| `/item/:foodId` | Admin | Purge Cache | Update food dish details or inventory stock. |
| `DELETE`| `/item/:foodId` | Admin | Purge Cache | Delete food dish. |
| `PUT` | `/item/:foodId/review` | User | Purge Cache | Submit a customer rating and review. |

---

## 3. Cart Management (`/api/v1/eats/cart`)

| Method | Endpoint | Auth | Rate Limit | Description |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/add-to-cart` | User | 100 / 10m | Add dish portion to cart (enforces single-restaurant rule). |
| `POST` | `/update-cart-item` | User | 100 / 10m | Increment/decrement item quantity ($1 \le \text{qty} \le 50$). |
| `DELETE`| `/delete-cart-item` | User | — | Remove food item from cart. |
| `GET` | `/get-cart` | User | — | Fetch current user cart items and pricing. |

---

## 4. Orders & Fulfillment (`/api/v1/eats/orders`)

| Method | Endpoint | Auth | Rate Limit | Description |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/new` | User | 15 / 10m | Finalize and create verified order post-payment. |
| `GET` | `/me/myOrders` | User | — | Fetch order history for authenticated customer. |
| `GET` | `/:id` | User | — | Fetch single order details by ObjectId. |
| `GET` | `/admin` | Admin | — | List all system orders across all restaurants. |
| `PATCH`| `/:id/status` | Admin | — | Update order status (`Processing`, `Dispatched`, `Delivered`, `Cancelled`). |

---

## 5. Payments (`/api/v1`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/payment/process` | User | Validates cart items, applies discounts, creates Stripe Checkout session. |
| `GET` | `/stripeapi` | User | Returns Stripe publishable key to frontend client. |
| `POST` | `/stripe/webhook` | Stripe | Webhook listener verifying Stripe cryptographic signature. |

---

## 6. Promotions & Coupons (`/api/v1/coupon`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/` | Public | Fetch all currently active coupons (cached 5m). |
| `POST` | `/` | Admin | Create a new promotional discount coupon. |
| `PATCH`| `/:couponId` | Admin | Update coupon rules or expiration date. |
| `DELETE`| `/:couponId` | Admin | Delete a coupon. |
| `POST` | `/validate` | User | Validates coupon code and returns calculated discount. |

---

## 7. AI Restaurant Intelligence (`/api/v1/ai`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/stores/:id/summary` | User | Returns cached or generated AI guest sentiment analysis. |
| `POST` | `/items/:id/summary` | User | Returns cached or generated AI dish sentiment summary. |
| `POST` | `/generate-food` | Admin | Generates dish descriptions, allergens, and dietary tags using Llama-3. |
| `PUT` | `/admin/restaurants/:id/analyze` | Admin | Triggers AI batch review sentiment analysis for a restaurant. |
