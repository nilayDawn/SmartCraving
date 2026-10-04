# 🛡️ SmartCraving Security Architecture & Hardening Guide

[![Security Posture](https://img.shields.io/badge/Security-Defense_in_Depth-brightgreen?style=flat-square)](#)
[![Compliance](https://img.shields.io/badge/OWASP-Top_10_Mitigated-blue?style=flat-square)](#)

---

## 1. Security Architecture (Defense-in-Depth)

```mermaid
graph TD
    Request["Incoming HTTP Request"]
    
    subgraph Perimeter ["Layer 1: Perimeter & Transport Defense"]
        RateLimit["Multi-Tier Rate Limiting\n[1000 req/15m DDoS protection]"]
        CORS["Strict Dynamic CORS\n[Credentialed origin whitelist]"]
        Helmet["Helmet HTTP Headers\n[nosniff, SAMEORIGIN, DNS prefetch]"]
    end

    subgraph Sanitization ["Layer 2: Payload Sanitization & Body Parsers"]
        MongoSanitize["express-mongo-sanitize\n[Strips $ and . query operators]"]
        HPP["HTTP Parameter Pollution\n[Protects array poisoning]"]
        SizeLimits["Payload Limits\n[JSON: 5MB, URL-Encoded: 100kB]"]
    end

    subgraph Validation ["Layer 3: Input Validation Layer"]
        IdValidator["ObjectId Pre-Validator\n[isMongoId check before Mongoose]"]
        SchemaValidator["Schema Validators\n[Email syntax, password length, order shapes]"]
    end

    subgraph Auth ["Layer 4: Authentication & Authorization"]
        DualAuth["Dual-Auth JWT\n[HTTP-Only Cookie + Bearer Fallback]"]
        RoleGuard["RBAC Authorization\n[Customer vs Administrator]"]
    end

    subgraph Persistence ["Layer 5: Safe Persistence Layer"]
        Bcrypt["Bcrypt Password Hashing (Salt = 10)"]
        Atomic["Atomic Operations\n[$inc concurrency locking]"]
    end

    Request --> Perimeter
    Perimeter --> Sanitization
    Sanitization --> Validation
    Validation --> Auth
    Auth --> Persistence
```

---

## 2. OWASP Top 10 Mitigations Implemented

### 2.1 Injection Defense (A03:2021)
- **NoSQL Operator Sanitization**: `express-mongo-sanitize` strips `$` and `.` operators from `req.body`, `req.query`, and `req.params`. Payloads like `{ "email": { "$gt": "" } }` are completely neutralized.
- **ObjectId Validation**: `validateObjectId` runs before any MongoDB query. Malformed hexadecimal strings immediately return `400 Bad Request` rather than triggering internal database driver exceptions.

### 2.2 Broken Authentication (A07:2021)
- **Dual-Auth Token Architecture**: Issues signed JWTs inside `httpOnly`, `secure` (in production), and `sameSite` cookies to prevent XSS exfiltration. For cross-domain payment redirects (e.g. Stripe Hosted Checkout), the frontend Axios client falls back to an `Authorization: Bearer <token>` header.
- **Brute-Force Rate Limiting**: `/api/v1/users/login` and `/api/v1/users/signup` are limited to **15 attempts per 15 minutes per IP**.

### 2.3 Broken Access Control (A01:2021)
- **Role-Based Access Control (RBAC)**: All administrative routes (`/admin/*`, `/stores` write operations, `/item` write operations) require the `authorizeRoles("admin")` middleware.
- **Customer Ownership Enforcement**: Order history queries (`/api/v1/eats/orders/me/myOrders`) strictly bind to `req.user.id`, preventing horizontal privilege escalation.

### 2.4 Denial of Service & Resource Exhaustion (A04:2021)
- **Multi-Tier Rate Limiting**:
  - `globalLimiter`: 1000 requests per 15 minutes.
  - `orderCreationLimiter`: 15 orders per 10 minutes on `/api/v1/eats/orders/new`.
  - `cartLimiter`: 100 cart operations per 10 minutes.
  - `aiLimiter`: 10 AI operations per 15 minutes.

### 2.5 Security Misconfiguration (A05:2021)
- **HTTP Security Headers (`helmet`)**:
  - `X-Content-Type-Options: nosniff` (stops MIME sniffing).
  - `X-Frame-Options: SAMEORIGIN` (mitigates clickjacking).
  - `X-DNS-Prefetch-Control: off`.
- **Environment Isolation**: Production runs strictly enforce validated variables via `src/config/env.js`.

---

## 3. Concurrency & Inventory Protection

```mermaid
sequenceDiagram
    autonumber
    actor User1 as Customer A
    actor User2 as Customer B
    participant Server as ⚙️ Order Service
    participant DB as 🗄️ MongoDB

    Note over DB: Dish Stock = 1
    User1->>Server: Checkout Dish (Qty: 1)
    User2->>Server: Checkout Dish (Qty: 1)
    Server->>DB: findOneAndUpdate({ _id, stock: { $gte: 1 } }, { $inc: { stock: -1 } })
    DB-->>Server: User 1: Matched & Decremented (Stock: 0)
    Server->>DB: findOneAndUpdate({ _id, stock: { $gte: 1 } }, { $inc: { stock: -1 } })
    DB-->>Server: User 2: No Match Found (Stock is 0)
    Server-->>User2: 400 Bad Request: "Dish is out of stock"
```

Inventory adjustments are performed atomically using conditional `$gte` criteria and `$inc` operators, completely eliminating double-ordering race conditions without expensive distributed database locking.
