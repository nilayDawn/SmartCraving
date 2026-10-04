# SmartCraving — System Architecture & Flows

## 1. System Topology & Architecture

SmartCraving is engineered as a **modular domain monolith** on the backend paired with a high-performance **React Single-Page Application (SPA)** on the frontend.

```mermaid
graph TD
    Client["React 18 + Vite (SPA)\n[Features: Auth, Catalogue, Cart, Orders, Admin]\nRoute Code Splitting via React.lazy()"]
    APIClient["Centralized Axios Client\n[Bearer Token Interceptor + Credentials]"]
    Gateway["Security Middleware Pipeline\n[Helmet, MongoSanitize, HPP, Compression, RateLimit]"]
    
    subgraph Backend ["Express.js Domain Modular Monolith (/api/v1)"]
        AuthMod["Auth Module (/users)"]
        CatMod["Catalogue Module (/eats)"]
        CartMod["Cart Module (/eats/cart)"]
        OrderMod["Order Module (/eats/orders)"]
        PromoMod["Promotion Module (/coupon)"]
        AIMod["AI Module (/ai)"]
    end
    
    subgraph Providers ["Provider Abstraction Layer (Adapter Pattern)"]
        CacheProvider["CacheProvider (In-Memory / Redis-Ready)"]
        PaymentProvider["PaymentProvider (Stripe / Extensible)"]
        StorageProvider["StorageProvider (Cloudinary / S3-Ready)"]
        NotificationProvider["NotificationProvider (Nodemailer)"]
        AIProvider["AIProvider (Groq Cloud + Heuristic Fallback)"]
    end

    Client --> APIClient --> Gateway --> Backend
    Backend --> Providers
    Providers --> DB[("MongoDB Atlas")]
    Providers --> Stripe["Stripe API"]
    Providers --> Cloudinary["Cloudinary CDN"]
    Providers --> Groq["Groq Cloud"]
```

---

## 2. Technology Stack Specifications

| Layer | Technology | Purpose & Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + Vite 5 | Fast Hot Module Replacement (HMR), optimized ESM production builds. |
| **State Management** | Redux Toolkit | Centralized predictable state container for cart, auth, and restaurant data. |
| **Styling** | Tailwind CSS v4 | Utility-first responsive design with minimal bundle footprint. |
| **Routing** | React Router v6 | Declarative client routing with dynamic route-level lazy loading (`React.lazy`). |
| **Backend Runtime** | Node.js (v20) + Express 4 | High-throughput asynchronous event loop with modular route architecture. |
| **Database** | MongoDB Atlas + Mongoose 7 | Flexible document storage with atomic `$inc` operators and compound indexes. |
| **Third-Party Providers** | Decoupled Adapters | Stripe (Payments), Cloudinary (Images), Groq (AI Insights), Nodemailer (Emails). |

---

## 3. Provider Abstraction Layer (Adapter Pattern)

All third-party services are decoupled behind interface contracts in `backend/src/providers/`. This prevents vendor lock-in and allows seamless swapping of underlying cloud providers:

```text
backend/src/providers/
├── cache/
│   ├── cache.interface.js       # get, set, del, delByPattern, flush
│   ├── memory.provider.js       # In-memory Map with automatic TTL & maxEntries
│   └── index.js                 # Factory singleton (pluggable for Redis)
├── payment/
│   ├── payment.interface.js     # createCheckoutSession, verifyWebhookSignature
│   ├── stripe.provider.js       # Stripe SDK implementation
│   └── index.js                 # Pluggable for Razorpay / PayPal
├── storage/
│   ├── storage.interface.js     # uploadImage, deleteImage
│   ├── cloudinary.provider.js   # Cloudinary v2 implementation
│   └── index.js                 # Pluggable for AWS S3 / GCS
├── notification/
│   ├── notification.interface.js# sendPasswordReset, sendWelcome
│   ├── email.provider.js        # Nodemailer provider
│   └── index.js                 # Pluggable for SendGrid / SES
└── ai/
    ├── ai.interface.js          # generateDishMetadata, analyzeReviews
    ├── groq.provider.js         # Groq LLM with smart heuristic fallbacks
    └── index.js
```

---

## 4. Frontend Route Splitting & Chunk Optimization

To ensure fast first-paint times, the frontend lazily loads all feature views inside `AppRoutes.jsx`:

```javascript
const Home = lazy(() => import("../features/catalogue/Home"));
const Menu = lazy(() => import("../features/catalogue/Menu"));
const Cart = lazy(() => import("../features/cart/Cart"));
const AdminDashboard = lazy(() => import("../features/admin/AdminDashboard"));
```

### Rollup Manual Chunk Partitioning (`vite.config.js`)
External dependencies are partitioned into dedicated vendor chunks:
- `vendor`: React, React-DOM, React Router, Axios
- `redux`: `@reduxjs/toolkit`, `react-redux`
- `icons`: `react-icons`
- `utils`: UI helper libraries and formatters

**Production Build Results**:
- Main entry chunk: **~72.9 kB** (~19.7 kB gzip).
- Users only download code for the page they are actively visiting.

---

## 5. System Sequence Diagrams

### 5.1 End-to-End Order & Payment Flow

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
    Frontend->>Stripe: Redirect Customer to Stripe Hosted Checkout
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

### 5.2 Authentication & Dual-Auth Strategy Flow

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
    AuthMW->>AuthMW: Check Rate Limits & Validate Formats
    AuthMW->>Service: Authenticate Credentials
    Service->>DB: Find User by Email (+password)
    Service->>Service: Verify Bcrypt Hash (Asynchronous C++ Native)
    Service-->>Client: Sets HTTP-Only Cookie + Returns JWT in JSON Body
    Client->>Client: Stores Fallback Bearer Token in localStorage
    Note over Client,AuthMW: Subsequent Protected Requests:
    Client->>AuthMW: GET /api/v1/users/me (Cookie + Bearer Header)
    AuthMW->>AuthMW: Verify Token (Cookie first, Fallback to Header)
    AuthMW-->>Client: Return 200 with Authenticated User Context
```

### 5.3 In-Memory Cached AI Review Summary Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Customer / Guest
    participant Server as ⚙️ Express Backend
    participant Cache as ⚡ In-Memory Cache
    participant DB as 🗄️ MongoDB Atlas
    participant Groq as 🤖 Groq Cloud AI

    User->>Server: POST /api/v1/ai/stores/:id/summary
    Server->>Cache: Check Memory: `ai:summary:store:<id>`
    alt Cache HIT (Sub-5ms)
        Cache-->>Server: Return Pre-Computed Summary
        Server-->>User: Instant 200 OK ({ cached: true, aiData })
    else Cache MISS
        Server->>DB: Find Store with Lean Summary Fields
        alt Document Has Existing AI Data
            DB-->>Server: Return Stored Summary
            Server->>Cache: Save into Memory (TTL 1 Hour)
            Server-->>User: Fast 200 OK ({ cached: true, aiData })
        else Needs Generation
            Server->>Groq: Generate Sentiment & Bullets from Reviews
            alt Groq Success
                Groq-->>Server: AI Summary Payload
            else Groq Rate Limited or Error
                Server->>Server: Fallback to Heuristic Sentiment Analyzer
            end
            Server->>DB: Save Generated Summary into Store Document
            Server->>Cache: Cache in Memory (TTL 1 Hour)
            Server-->>User: 200 OK ({ cached: false, aiData })
        end
    end
```

### 5.4 Catalogue Invalidation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 👨‍💼 Administrator
    participant Server as ⚙️ Express Backend
    participant Cache as ⚡ In-Memory Cache
    participant DB as 🗄️ MongoDB Atlas

    Admin->>Server: POST /api/v1/eats/stores/:id/menus (New Menu)
    Server->>DB: Save New Menu Document
    Server->>Cache: Invalidate Keys by Pattern (*stores*, *menus*, *items*)
    Server-->>Admin: 200 Success Response
    Note over Server,Cache: Next Customer Request:
    User->>Server: GET /api/v1/eats/stores/:id/menus
    Server->>DB: Fetch Fresh Updated Menu
    Server->>Cache: Prime Cache with Fresh Content (TTL 5 Mins)
    Server-->>User: Updated Menu Data
```
