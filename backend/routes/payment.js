const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const authController = require("../controllers/authController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const {
  processPayment,
  sendStripApi,
  // paymentDetails,
} = require("../controllers/paymentController");

router
  .route("/payment/process")
  .post(paymentLimiter, authController.protect, authorizeRoles("user", "restaurant-owner"), processPayment);
router.route("/stripeapi").get(authController.protect, sendStripApi);
// router.route("/retrieveUser").get(paymentDetails);

module.exports = router;
