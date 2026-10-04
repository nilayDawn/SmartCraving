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

// Trust reverse proxy (Render, Vercel, Nginx) for rate-limit IP detection
app.set("trust proxy", 1);   // trust first proxy, so that req.ip returns the correct client IP address when behind a reverse proxy

// Set security HTTP headers (disable crossOriginResourcePolicy for Cloudinary asset delivery)
app.use(
  helmet({
    crossOriginResourcePolicy: false,// Prevents blocking of Cloudinary images or other external assets
    contentSecurityPolicy: false, // Prevents interfering with external CDNs or APIs in hybrid dev
  }),
);

// Apply credentialed CORS policy before body parsers and routes
app.use(corsMiddleware);

// Stripe signed raw webhook must run before global express.json()
app.post(
  "/api/v1/stripe/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  paymentController.stripeWebhook,
);

// Compress all HTTP response bodies (> 1kb)
app.use(compression());

// Standard body and cookie parsers
app.use(express.json({ limit: "5mb" })); // Limit JSON payloads to 5MB to prevent abuse and DoS attacks
app.use(express.urlencoded({ extended: true, limit: "100kb" })); // Limit URL-encoded payloads to 100KB
app.use(cookieParser()); // Parse cookies for authentication and session management

// Data sanitization against NoSQL query injection (strips $ and . from req.body, req.query, req.params),so that malicious users cannot inject MongoDB operators into queries
app.use(mongoSanitize());

// Prevent HTTP parameter pollution, for example, if a user sends multiple query parameters with the same name, only the last one will be used. This prevents attackers from exploiting duplicate parameters to bypass security checks or manipulate application logic.
app.use(hpp());

// Global API rate limiter across all /api routes
app.use("/api", globalLimiter);

app.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5MB, 1 file
    abortOnLimit: true,
    createParentPath: false,
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Domain API Routing (Preserving exact 100% backward-compatible /api/v1 contracts)
app.use("/api/v1/users", authRoutes);
app.use("/api/v1/eats/cart", cartRoutes);
app.use("/api/v1/eats/orders", orderRoutes);
app.use("/api/v1/eats", catalogueRoutes);
app.use("/api/v1", paymentRoutes);
app.use("/api/v1/coupon", promotionRoutes);
app.use("/api/v1/ai", aiRoutes);

// Browser redirect for password reset links: if a user clicks a reset link that lands on the backend,
// redirect them directly to the frontend React form (/users/resetPassword/:token)
app.get(
  ["/users/resetPassword/:token", "/api/v1/users/resetPassword/:token"],
  (req, res) => {
    const frontendBase = (env.frontendUrl || "http://localhost:5173").replace(/\/$/, "");
    return res.redirect(302, `${frontendBase}/users/resetPassword/${req.params.token}`);
  },
);

// Fallback 404 for unhandled routes
app.all("*", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
    errMessage: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Centralized Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;
