const express = require("express");
const router = express.Router();
const paymentController = require("./payment.controller");
const { protect, authorizeRoles } = require("../../core/middlewares/auth.middleware");
const { paymentLimiter } = require("../../core/middlewares/rateLimiter.middleware");

router
  .route("/payment/process")
  .post(
    paymentLimiter,
    protect,
    authorizeRoles("user", "restaurant-owner"),
    paymentController.processPayment,
  );

router.route("/stripeapi").get(protect, paymentController.sendStripeApi);

module.exports = router;
