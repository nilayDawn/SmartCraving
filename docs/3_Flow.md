# 🔄 SmartCraving System Flows & Sequence Diagrams

[![Diagrams](https://img.shields.io/badge/Diagrams-Mermaid_JS-blue?style=flat-square)](#)

---

## 1. End-to-End Customer Order & Payment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as 🛒 Customer
    participant Frontend as 💻 React App (Vite)
    participant Server as ⚙️ Express Backend
    participant DB as 🗄️ MongoDB Atlas
    participant Stripe as 💳 Stripe Checkout

    Customer->>Frontend: Select Restaurant Dishes & Click "Checkout"
    Frontend->>Server: POST /api/v1/payment/process (Items, Restaurant, Coupon)
    Server->>Server: Revalidate Cart Prices & Coupon Constraints
    Server->>Stripe: Create Stripe Checkout Session
    Stripe-->>Server: Return Checkout URL & Session ID
    Server-->>Frontend: Return Session URL
    Frontend->>Stripe: Redirect Customer to Stripe
    Customer->>Stripe: Submits Payment Details
    Stripe-->>Customer: Redirect to /eats/orders/success?session_id=...
    Customer->>Frontend: Loads Success Page with Session ID
    Frontend->>Server: POST /api/v1/eats/orders/new (sessionId, orderItems)
    Server->>Server: Validate Session Status & Deduplicate Request
    Server->>DB: Atomic Inventory Decrement ($inc: -qty)
    Server->>DB: Save Order (Status: 'Processing') & Clear User Cart
    Server-->>Frontend: Order Confirmed Response
    Frontend-->>Customer: Render Order Confirmation & Receipt
```

---

## 2. Authentication & Dual-Auth Strategy Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User / Admin
    participant Client as 💻 React (Axios)
    participant AuthMW as 🛡️ Auth Middleware
    participant Service as 🔐 Auth Service
    participant DB as 🗄️ MongoDB

    User->>Client: Enters Credentials (Email & Password)
    Client->>AuthMW: POST /api/v1/users/login
    AuthMW->>AuthMW: Validate Email Format & Password Length
    AuthMW->>Service: Authenticate Credentials
    Service->>DB: Find User by Email (+password select)
    Service->>Service: Verify Bcrypt Hash
    Service-->>Client: Sets HTTP-Only Cookie + Returns JWT in JSON Body
    Client->>Client: Stores Fallback Bearer Token in localStorage
    Note over Client,AuthMW: Subsequent Protected Requests:
    Client->>AuthMW: GET /api/v1/users/me (Cookie + Bearer Header)
    AuthMW->>AuthMW: Verify Token (Cookie first, Fallback to Header)
    AuthMW-->>Client: Return 200 with User Context
```

---

## 3. AI Sentiment Analysis with Content-Hash Caching

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User / Admin
    participant Server as ⚙️ Express Backend
    participant Cache as ⚡ Memory Cache
    participant Groq as 🤖 Groq Llama-3 AI
    participant DB as 🗄️ MongoDB

    User->>Server: POST /api/v1/ai/stores/:id/summary
    Server->>DB: Fetch Approved Customer Reviews
    Server->>Server: Compute Content Hash: MD5(reviews)
    Server->>Cache: Check Key: `store:<id>:<hash>`
    alt Cache HIT (Valid within 1 Hour)
        Cache-->>Server: Return Cached Sentiment & Highlights
        Server-->>User: Instant Response (X-Cache: HIT)
    else Cache MISS or Expired
        Server->>Groq: Generate Sentiment & Summaries (Llama-3)
        alt Groq Upstream Success
            Groq-->>Server: JSON (Sentiment, Bullets, Keywords)
        else Groq Rate Limited / Error
            Server->>Server: Execute Smart Local Heuristic Fallback
        end
        Server->>Cache: Set Key with 1 Hour TTL
        Server-->>User: Generated Insights (X-Cache: MISS)
    end
```

---

## 4. Admin Catalog Write & Cache Invalidation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 👨‍💼 Administrator
    participant Gateway as 🛡️ Express Gateway
    participant CatController as 📦 Catalogue Controller
    participant Cache as ⚡ Memory Cache Provider
    participant DB as 🗄️ MongoDB Atlas

    Admin->>Gateway: POST /api/v1/eats/item (New Dish Details)
    Gateway->>Gateway: Verify Admin Role & Validate Inputs
    Gateway->>CatController: Execute createFoodItem()
    CatController->>DB: Insert FoodItem & Update Menu Category
    CatController->>Cache: Invalidate Patterns: `*items*`, `*menus*`, `*stores*`
    Cache-->>CatController: Purged Affected Keys
    CatController-->>Admin: Return 201 Created Response
    Note over Admin,Gateway: Subsequent Customer Reads:
    Customer->>Gateway: GET /api/v1/eats/stores
    Gateway->>DB: Fetch Fresh Catalog & Re-populate Cache
```
