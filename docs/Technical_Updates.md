# Technical Update & Architecture Documentation

## Overview of System Improvements

This document summarizes recent backend and frontend enhancements across authentication, cart management, database integrity, and administrative tools.

---

### 1. Cross-Domain Session Preservation & Dual-Auth Strategy
- **Issue Solved**: Users were redirected to `/users/login` after completing payments on Stripe Checkout when deployed across distinct origins (`Vercel` frontend and `Render` backend). Third-party cookie blocking in modern browsers caused HTTP-only cookies to be dropped during external redirects.
- **Implementation**:
  - **Axios Interceptor** ([`api.js`](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/frontend/src/utils/api.js)): Attaches `Authorization: Bearer <token>` from `localStorage` to all outbound requests.
  - **Redux Actions** ([`userActions.js`](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/frontend/src/redux/actions/userActions.js)): Persists session tokens upon `login`, `register`, and `loadUser`, and purges tokens upon `logout`.
  - **Backend Cookie Normalization** ([`sendToken.js`](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/utils/sendToken.js)): Normalizes `NODE_ENV` checks (`production` / `PRODUCTION`) to ensure `SameSite=None; Secure` flags are sent correctly.

---

### 2. Multi-Item Cart Accumulation & Relational Auto-Healing
- **Issue Solved**: Adding a second food item wiped previously added items due to an object-to-string coercion bug (`cart.restaurant.toString() !== targetRestaurantId`) and strict cart-reset behavior.
- **Implementation**:
  - **ID Normalization Helper** ([`cartController.js`](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/controllers/cartController.js)): Implemented `getCleanId()` helper to safely convert Mongoose objects, strings, or ObjectIds into clean string IDs.
  - **Cart Preservation**: Removed destructive `Cart.deleteOne` calls during item addition. New items are appended to `cart.items`, while existing items have their quantities incremented.
  - **Database Auto-Healing** ([`foodItemController.js`](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/controllers/foodItemController.js) & [`cartController.js`](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/controllers/cartController.js)): If a `FoodItem` record lacks a `restaurant` ID, the controllers scan the `Menu` collection, attach the parent restaurant, and update the MongoDB document in the background.

---

### 3. Frontend UX & Quantity Control Flow
- **Issue Solved**: Clicking "Add to Cart" on dish detail pages forcefully redirected users to `/cart`, interrupting navigation.
- **Implementation**:
  - **In-Page Quantity Controls** ([`FoodItemDetails.jsx`](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/frontend/src/components/FoodItemDetails.jsx)): Removed automatic `navigate("/cart")` redirect. Clicking "Add to Cart" now immediately updates Redux state and renders portion controls (`[ - ] quantity [ + ]`) inline.

---

### 4. Admin Orders Dashboard Enhancements
- **Requirement**: Administrators needed visual item details (name, picture, quantity, stock availability) for each incoming order.
- **Implementation**:
  - **Backend Population** ([`orderController.js`](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/controllers/orderController.js)): Populates `orderItems.fooditem` (`name`, `stock`, `images`, `price`) in `allOrders` and `updateOrderStatus`.
  - **Admin Orders Table** ([`AdminOrders.jsx`](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/frontend/src/components/admin/AdminOrders.jsx)): Added an **Ordered Items** column rendering dish thumbnails, quantity/price breakdown, and real-time portion stock indicators (`In stock` / `Out of stock`).
