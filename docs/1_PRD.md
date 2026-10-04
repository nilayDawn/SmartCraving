# SmartCraving — Product Requirements Document (PRD)

## 1. Overview & Product Vision

**SmartCraving** is a full-stack, multi-vendor food delivery and intelligence platform built to provide a fast, reliable, and transparent dining experience.

Traditional food ordering systems often suffer from operational issues during peak meal-time rush hours:
- Customers add items from multiple restaurants into a single cart, leading to cross-kitchen delivery conflicts.
- High-concurrency ordering causes inventory overselling when two users buy the last available dish at the same moment.
- Users face hundreds of unstructured, mixed reviews with no quick way to know which dishes are actually good.
- Unvalidated promo code submissions cause checkout failures or coupon misuse.

SmartCraving eliminates these issues through server-enforced business invariants: single-restaurant cart boundaries, atomic inventory deductions, server-side financial checkout, and cached AI review summaries.

---

## 2. Target User Personas

| Persona | Access Level | Core Responsibilities & Features |
| :--- | :--- | :--- |
| **Guest / Diner** | Public (Unauthenticated) | Search restaurants, filter by dietary preferences (e.g. Veg), browse menus and dish details, read AI-generated review summaries. |
| **Customer (`user`)** | Authenticated (JWT) | Manage account profile, add dishes to single-store cart, apply promo coupons, checkout securely via Stripe, view live order history, submit dish ratings & reviews. |
| **Administrator (`admin`)** | Elevated (JWT Role Guard) | Create/update/delete restaurants, manage menu categories and dishes, update stock quantities, update order statuses (`Processing` $\rightarrow$ `Dispatched` $\rightarrow$ `Delivered` $\rightarrow$ `Cancelled`), create and manage coupons. |

---

## 3. Core System Invariants

All platform features must strictly respect these system rules:

### 3.1 Single-Restaurant Cart Isolation
- A customer cart can only contain dishes from **one restaurant at a time**.
- If a user has items from Restaurant A in their cart and adds a dish from Restaurant B, the system prompts or atomically replaces the old items with the new restaurant's dish. Items from different kitchens are never mixed into one order.

### 3.2 Atomic Inventory Decrement
- Dish inventory is decremented atomically upon confirmed payment using MongoDB `$inc` operators with conditional stock checks (`stock: { $gte: quantity }`).
- If an order is canceled, the deducted inventory is automatically restored.
- Dishes with zero stock cannot be added to cart or checked out.

### 3.3 Server-Verified Pricing & Discounts
- The server never trusts client-side prices, subtotals, or discount totals.
- Dish prices are fetched fresh from the database at checkout time.
- Coupon rules (active dates, minimum order spend, discount percentage, and maximum discount caps) are re-validated on the server before creating payment sessions.

### 3.4 Deduplicated Order Creation (Idempotency)
- Each order is linked to a unique payment session identifier (`stripeSessionId`).
- If a user refreshes the order confirmation page or re-submits a payment confirmation, the system returns the existing order rather than creating duplicate orders or double-deducting stock.

### 3.5 Fast AI Review Summaries with Heuristic Fallback
- Review summaries digest all customer reviews into overall sentiment, key bullet highlights, and top food mentions.
- Results are cached in server memory to ensure sub-5ms read speeds.
- If the external LLM provider encounters rate limits or errors, the system automatically falls back to an internal heuristic sentiment analyzer, ensuring 100% uptime for diners.

---

## 4. Key Functional Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SMARTCRAVING PLATFORM                           │
├─────────────────────┬───────────────────────────┬───────────────────────────┤
│  DISCOVERY & INTEL  │     INTEGRITY & CART      │    FULFILLMENT & SCALE    │
│  • Fast Restaurant  │ • Single-Store Cart       │ • Atomic Stock Decrement  │
│    Search & Filter  │ • Real-Time Stock Check   │ • Stripe Payment Checkout │
│  • AI Review Points │ • Server-Side Coupons     │ • Idempotent Orders       │
│  • Memory Caching   │ • Profile Management      │ • Order History Tracking  │
└─────────────────────┴───────────────────────────┴───────────────────────────┘
```

1. **Restaurant & Menu Browsing**:
   - Filter by cuisine, veg/non-veg, ratings, and keyword search.
   - Public catalogue responses are cached in memory for sub-10ms response times.
2. **Cart Management**:
   - Add, increment, decrement, and remove items with real-time subtotal calculation.
   - Single-restaurant cart validation enforced both on client and server.
3. **Checkout & Stripe Integration**:
   - Real-time calculation of taxes, delivery fees, and coupon discounts.
   - Seamless Stripe Checkout redirection and secure verification.
4. **Order Tracking & Admin Management**:
   - Customers view real-time status transitions.
   - Admins can manage catalogue items and update dispatch stages.
5. **AI Review Summaries**:
   - Generates bulleted summaries and sentiment scores for restaurants and dishes using Groq cloud models.
   - Cached in memory for rapid repeated access without consuming external API quotas.

---

## 5. Acceptance Criteria

| Feature | Scenario | Expected Result |
| :--- | :--- | :--- |
| **Multi-Store Conflict** | User with items from Store A adds an item from Store B | System replaces Store A items with Store B item without errors or data corruption. |
| **Stock Boundary** | User attempts to order quantity greater than available stock | Request rejected with `400 Bad Request` ("Requested quantity exceeds available stock"). |
| **Coupon Cap** | User applies 50% discount coupon on $200 order with `maxDiscount` = $30 | Final discount is capped at exactly $30 (not $100). |
| **Duplicate Success Refresh** | User refreshes the checkout success page multiple times | Exactly one order is created; stock is deducted only once; subsequent requests return the existing order. |
| **External AI Outage** | External LLM API is unavailable or rate-limited | System transparently falls back to local heuristic scoring, returning valid sentiment data without crashing. |
| **Role Protection** | Standard customer tries to access `POST /api/v1/eats/stores` | Request rejected with `403 Forbidden` ("User role user is not authorized to access this route"). |
