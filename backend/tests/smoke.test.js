const assert = require("assert");
const http = require("http");

async function runTests() {
  console.log("=========================================");
  console.log("   SmartCraving Backend Smoke Tests      ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  };

  // Test 1: App instantiation
  await test("Express App initializes cleanly", async () => {
    const app = require("../src/app");
    assert(typeof app === "function", "App should be an Express function");
  });

  // Test 2: Config and Env loader
  await test("Config loads valid defaults", async () => {
    const env = require("../src/config/env");
    assert(env.port > 0, "Port must be positive integer");
    assert(typeof env.jwt.secret === "string", "JWT secret must be string");
    assert(typeof env.stripe.secretKey === "string", "Stripe secret key must be defined");
  });

  // Test 3: Provider Factory: Payment
  await test("Payment Provider factory returns StripeProvider instance", async () => {
    const { getPaymentProvider } = require("../src/providers/payment");
    const provider = getPaymentProvider();
    assert(typeof provider.createCheckoutSession === "function", "Must implement createCheckoutSession");
    assert(typeof provider.getPublishableKey === "function", "Must implement getPublishableKey");
  });

  // Test 4: Provider Factory: Storage
  await test("Storage Provider factory returns CloudinaryProvider instance", async () => {
    const { getStorageProvider } = require("../src/providers/storage");
    const provider = getStorageProvider();
    assert(typeof provider.uploadImage === "function", "Must implement uploadImage");

    // Test external URL passthrough
    const result = await provider.uploadImage("https://example.com/test.jpg");
    assert.strictEqual(result.url, "https://example.com/test.jpg");
  });

  // Test 5: Provider Factory: Notification
  await test("Notification Provider factory returns EmailProvider instance", async () => {
    const { getNotificationProvider } = require("../src/providers/notification");
    const provider = getNotificationProvider();
    assert(typeof provider.sendPasswordReset === "function", "Must implement sendPasswordReset");
    assert(typeof provider.sendWelcome === "function", "Must implement sendWelcome");
  });

  // Test 6: Provider Factory: AI
  await test("AI Provider generates smart fallback when key is not active", async () => {
    const { getAIProvider } = require("../src/providers/ai");
    const provider = getAIProvider();
    assert(typeof provider.generateDishMetadata === "function", "Must implement generateDishMetadata");
    assert(typeof provider.analyzeReviews === "function", "Must implement analyzeReviews");

    const dishMeta = await provider.generateDishMetadata({ name: "Paneer Butter Masala" });
    assert(typeof dishMeta.description === "string" && dishMeta.description.length > 10);
    assert(Array.isArray(dishMeta.tags));

    const reviewSummary = await provider.analyzeReviews([
      { name: "John", rating: 5, Comment: "Amazing food and great hospitality!" },
    ]);
    assert(["positive", "mixed", "negative"].includes(reviewSummary.sentiment));
    assert(Array.isArray(reviewSummary.summaryBullets));
  });

  // Test 7: Promotion discount calculation
  await test("Promotion engine correctly calculates discounts and caps at maxDiscount", async () => {
    const promotionService = require("../src/modules/promotion/promotion.service");

    const coupon1 = { discount: 20, maxDiscount: 100 };
    const res1 = promotionService.calculateDiscount(coupon1, 200); // 20% of 200 = 40 (under 100)
    assert.strictEqual(res1.discount, 40);
    assert.strictEqual(res1.finalTotal, 160);

    const res2 = promotionService.calculateDiscount(coupon1, 1000); // 20% of 1000 = 200 (capped at 100)
    assert.strictEqual(res2.discount, 100);
    assert.strictEqual(res2.finalTotal, 900);
  });

  // Test 8: HTTP endpoints (/health and 404) via ephemeral server
  await test("HTTP Server responds to /health and returns 404 for unknown endpoints", async () => {
    const app = require("../src/app");
    const server = http.createServer(app);

    await new Promise((resolve, reject) => {
      server.listen(0, "127.0.0.1", () => resolve());
      server.on("error", reject);
    });

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    // Test /health
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.strictEqual(healthJson.status, "success");

    // Test 9: Security Headers (Helmet)
    assert(healthRes.headers.get("x-content-type-options") === "nosniff", "Must include X-Content-Type-Options: nosniff");
    assert(healthRes.headers.get("x-frame-options") === "SAMEORIGIN", "Must include X-Frame-Options: SAMEORIGIN");

    // Test 10: Input Validation: Reject Malformed MongoId
    const invalidIdRes = await fetch(`${baseUrl}/api/v1/eats/stores/invalid-id-12345`);
    assert.strictEqual(invalidIdRes.status, 400, "Malformed ObjectId must return 400 Bad Request");
    const invalidIdJson = await invalidIdRes.json();
    assert(invalidIdJson.message.includes("Invalid identifier format"), "Should inform user of invalid ID format");

    // Test 11: Input Validation: Reject Invalid Login Payload
    const invalidLoginRes = await fetch(`${baseUrl}/api/v1/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "" }),
    });
    assert.strictEqual(invalidLoginRes.status, 400, "Invalid email/password should return 400");

    // Test 12: Password Reset GET Redirect: Browser clicking email link should redirect to frontend React route
    const resetRedirectRes = await fetch(`${baseUrl}/users/resetPassword/sample-token-12345`, {
      redirect: "manual",
    });
    assert.strictEqual(resetRedirectRes.status, 302, "Reset link on backend should 302 redirect to frontend");
    assert(
      resetRedirectRes.headers.get("location").includes("/users/resetPassword/sample-token-12345"),
      "Redirect location must point to frontend /users/resetPassword/:token route",
    );

    server.close();
  });

  // Test 12: Cache Provider (MemoryCacheProvider) operations & TTL
  await test("Cache Provider sets, retrieves, invalidates by pattern, and honors TTL", async () => {
    const { getCacheProvider } = require("../src/providers/cache");
    const cache = getCacheProvider();

    // Set and Get
    await cache.set("test:key1", { hello: "world" }, 60);
    const val1 = await cache.get("test:key1");
    assert.deepStrictEqual(val1, { hello: "world" });

    // Pattern deletion
    await cache.set("test:key2", { sample: 123 }, 60);
    await cache.set("other:key3", { sample: 456 }, 60);
    const deletedCount = await cache.delPattern("test:*");
    assert(deletedCount >= 2, "Pattern deletion should remove matching keys");
    assert.strictEqual(await cache.get("test:key1"), null);
    assert.strictEqual(await cache.get("test:key2"), null);
    assert.notStrictEqual(await cache.get("other:key3"), null);

    // TTL expiry
    await cache.set("test:short", "expiresSoon", 0.01); // 10ms
    await new Promise((r) => setTimeout(r, 20));
    assert.strictEqual(await cache.get("test:short"), null, "Expired key should return null");
  });

  // Test 10: Error Middleware: Duplicate Key 11000 handling
  await test("Error Middleware returns clean 409 message and omits stack trace on duplicate key", async () => {
    const errorMiddleware = require("../src/core/errors/errorMiddleware");
    const mongoErr = new Error("E11000 duplicate key error collection: test.users index: email_1 dup key: { email: \"test@example.com\" }");
    mongoErr.code = 11000;
    mongoErr.keyValue = { email: "test@example.com" };
    mongoErr.stack = "MongoServerError: E11000 duplicate key error...\n    at secret/path/db.js:10:5";

    let statusCalled = null;
    let jsonCalled = null;
    const req = {};
    const res = {
      status(s) {
        statusCalled = s;
        return this;
      },
      json(j) {
        jsonCalled = j;
        return this;
      },
    };

    errorMiddleware(mongoErr, req, res, () => {});

    assert.strictEqual(statusCalled, 409, "Duplicate key error status should be 409");
    assert.strictEqual(jsonCalled.success, false);
    assert.strictEqual(
      jsonCalled.message,
      "An account with this email already exists. Please log in instead.",
    );
    assert.strictEqual(jsonCalled.stack, undefined, "Stack trace must not be exposed for client/operational errors");
  });

  console.log(`\n=========================================`);
  console.log(`Tests Finished: ${passed} Passed, ${failed} Failed`);
  console.log(`=========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
