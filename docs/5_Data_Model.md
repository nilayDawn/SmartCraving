# 🗄️ SmartCraving Data Model & Schema Invariants

[![Database](https://img.shields.io/badge/Database-MongoDB_Atlas-green?style=flat-square)](#)
[![ODM](https://img.shields.io/badge/ODM-Mongoose_7-blue?style=flat-square)](#)

---

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER ||--o| CART : owns
    RESTAURANT ||--o{ MENU : contains
    RESTAURANT ||--o{ ORDER : receives
    MENU ||--|{ FOOD_ITEM : categorizes
    CART ||--|{ CART_ITEM : holds
    ORDER ||--|{ ORDER_ITEM : snapshots
    FOOD_ITEM ||--o{ REVIEW : receives

    USER {
        ObjectId _id PK
        string name
        string email UK
        string password
        string role "user | admin | restaurant-owner"
        object avatar
        date passwordChangedAt
    }

    RESTAURANT {
        ObjectId _id PK
        string name
        boolean isVeg
        string address
        number ratings
        number numOfReviews
        array images
    }

    MENU {
        ObjectId _id PK
        ObjectId restaurant FK
        array categories
    }

    FOOD_ITEM {
        ObjectId _id PK
        ObjectId restaurant FK
        string name
        number price
        number stock
        string description
        string aiDescription
        array aiTags
    }

    CART {
        ObjectId _id PK
        ObjectId user FK
        ObjectId restaurant FK
        array items
    }

    ORDER {
        ObjectId _id PK
        ObjectId user FK
        ObjectId restaurant FK
        string stripeSessionId UK
        number finalTotal
        string orderStatus "Processing | Dispatched | Delivered | Cancelled"
        object deliveryInfo
    }

    COUPON {
        ObjectId _id PK
        string couponName UK
        number discount
        number maxDiscount
        number minAmount
        date expireDate
    }
```

---

## 2. Collection Schemas & Indexing Strategies

### 2.1 `User`
- **Unique Indexes**: `email` (lowercase, trimmed).
- **Security Invariant**: `password` is hashed using `bcryptjs` with salt rounds = 10 and has `select: false` by default.

### 2.2 `Restaurant`
- **Text Index**: `{ name: "text", address: "text" }` for high-speed multi-term fuzzy matching.
- **Geo Index**: `location: "2dsphere"` for geospatial radius queries.

### 2.3 `FoodItem`
- **Compound Indexes**: `{ restaurant: 1, name: 1 }` for high-throughput menu browsing.
- **Inventory Invariant**: `stock >= 0`. Stock updates are performed via atomic `$inc` operators.

### 2.4 `Cart`
- **Unique Index**: `{ user: 1 }` ensuring one active cart per customer.
- **Single-Restaurant Invariant**: If a customer adds an item with `restaurant_id !== cart.restaurant_id`, existing items are atomically cleared.

### 2.5 `Order`
- **Unique Index**: `stripeSessionId` prevents duplicate order records on checkout success page refreshes.
- **Data Immobility Invariant**: Order items snapshot `name`, `price`, and `image` at the time of purchase so historical receipts are unaffected by future menu edits.

### 2.6 `Coupon`
- **Unique Index**: `couponName` (uppercase, alphanumeric).
- **Discount Invariant**: Calculated discount cannot exceed `maxDiscount` and requires cart total $\ge \text{minAmount}$.
