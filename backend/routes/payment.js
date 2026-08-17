const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

const {
  processPayment,
  sendStripApi,
  // paymentDetails,
} = require("../controllers/paymentController");

router.route("/payment/process").post(authController.protect, processPayment);
router.route("/stripeapi").get(authController.protect, sendStripApi);
// router.route("/retrieveUser").get(paymentDetails);

module.exports = router;
