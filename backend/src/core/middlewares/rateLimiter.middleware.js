const rateLimit = require("express-rate-limit");

const createLimiter = ({ windowMinutes, maxRequests, message, skip }) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: maxRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    validate: { ip: false, xForwardedForHeader: false },
    skip: typeof skip === "function" ? skip : () => false,
    message: {
      success: false,
      message: message || "Too many requests. Please try again later.",
      errMessage: message || "Too many requests. Please try again later.",
    },
  });
};

const authAttemptLimiter = createLimiter({
  windowMinutes: 15,
  maxRequests: 6,
  message: "Too many authentication attempts. Please try again later.",
});

const passwordResetRequestLimiter = createLimiter({
  windowMinutes: 15,
  maxRequests: 5,
  message: "Too many password reset requests. Please try again later.",
});

const passwordResetSubmitLimiter = createLimiter({
  windowMinutes: 15,
  maxRequests: 5,
  message: "Too many reset attempts. Please try again later.",
});

const paymentLimiter = createLimiter({
  windowMinutes: 15,
  maxRequests: 20,
  message: "Too many payment requests. Please try again later.",
});

const couponValidationLimiter = createLimiter({
  windowMinutes: 15,
  maxRequests: 30,
  message: "Too many coupon validation requests. Please try again later.",
});

const aiLimiter = createLimiter({
  windowMinutes: 15,
  maxRequests: 30,
  skip: (req) => req.path?.endsWith("/summary"),
  message: "Too many AI generation requests from this IP. Please try again later.",
});

const reviewLimiter = createLimiter({
  windowMinutes: 15,
  maxRequests: 20,
  message: "Too many review submissions. Please try again later.",
});

const globalLimiter = createLimiter({
  windowMinutes: 15,
  maxRequests: 10000,
  skip: (req) => {
    // Exempt public read-only cached catalogue browsing and health checks from strict global rate limiting
    return (
      req.method === "GET" &&
      (req.baseUrl?.startsWith("/api/v1/eats") ||
        req.baseUrl?.startsWith("/api/v1/coupon") ||
        req.path === "/health")
    );
  },
  message: "Too many requests from this IP. Please try again after 15 minutes.",
});

const orderCreationLimiter = createLimiter({
  windowMinutes: 10,
  maxRequests: 15,
  message: "Too many order creation requests. Please try again in 10 minutes.",
});

const cartLimiter = createLimiter({
  windowMinutes: 10,
  maxRequests: 100,
  message: "Too many cart operations. Please slow down.",
});

module.exports = {
  createLimiter,
  authAttemptLimiter,
  passwordResetRequestLimiter,
  passwordResetSubmitLimiter,
  paymentLimiter,
  couponValidationLimiter,
  aiLimiter,
  reviewLimiter,
  globalLimiter,
  orderCreationLimiter,
  cartLimiter,
};
