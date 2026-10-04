const express = require("express");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");

const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const compression = require("compression");

const { corsMiddleware } = require("./core/middlewares/cors.middleware");
const { globalLimiter } = require("./core/middlewares/rateLimiter.middleware");
const errorMiddleware = require("./core/errors/errorMiddleware");
const paymentController = require("./modules/payment/payment.controller");
const env = require("./config/env");

// Domain Routers
const authRoutes = require("./modules/auth/auth.routes");
const catalogueRoutes = require("./modules/catalogue/catalogue.routes");
const cartRoutes = require("./modules/cart/cart.routes");
const orderRoutes = require("./modules/order/order.routes");
const paymentRoutes = require("./modules/payment/payment.routes");
const promotionRoutes = require("./modules/promotion/promotion.routes");
const aiRoutes = require("./modules/ai/ai.routes");

const app = express();

// Trust reverse proxy for client IP resolution behind load balancers/CDNs
app.set("trust proxy", 1);

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  }),
);

// Apply credentialed CORS policy before parsing request bodies
app.use(corsMiddleware);

// Stripe webhook requires the raw Buffer to verify signature
app.post(
  "/api/v1/stripe/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  paymentController.stripeWebhook,
);

// Compress HTTP responses > 1kb
app.use(compression());

// Body and cookie parsers
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());

// NoSQL query injection protection (strips $ and .)
app.use(mongoSanitize());

// HTTP parameter pollution protection
app.use(hpp());

// Global API rate limiting
app.use("/api", globalLimiter);

// Multipart form uploads (5MB ceiling)
app.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    abortOnLimit: true,
    createParentPath: false,
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
    workerPid: process.pid,
    timestamp: new Date().toISOString(),
  });
});

// Domain Routing (/api/v1)
app.use("/api/v1/users", authRoutes);
app.use("/api/v1/eats/cart", cartRoutes);
app.use("/api/v1/eats/orders", orderRoutes);
app.use("/api/v1/eats", catalogueRoutes);
app.use("/api/v1", paymentRoutes);
app.use("/api/v1/coupon", promotionRoutes);
app.use("/api/v1/ai", aiRoutes);

// Password reset link redirect to frontend React application
app.get(
  ["/users/resetPassword/:token", "/api/v1/users/resetPassword/:token"],
  (req, res) => {
    const frontendBase = (env.frontendUrl || "http://localhost:5173").replace(/\/$/, "");
    return res.redirect(302, `${frontendBase}/users/resetPassword/${req.params.token}`);
  },
);

// Unhandled route fallback
app.all("*", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
    errMessage: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Centralized error handling
app.use(errorMiddleware);

module.exports = app;