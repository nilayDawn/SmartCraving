const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const authController = require("../controllers/authController");

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset requests. Please try again later.",
  },
});

const passwordResetSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many reset attempts. Please try again later.",
  },
});

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post(
  "/forgetPassword",
  passwordResetRequestLimiter,
  authController.forgotPassword
);
router.patch(
  "/resetPassword/:token",
  passwordResetSubmitLimiter,
  authController.resetPassword
);

router.route("/logout").get(authController.logout);

router.route("/me").get(authController.protect, authController.getUserProfile);
router
  .route("/password/update")
  .put(authController.protect, authController.updatePassword);
router
  .route("/me/update")
  .put(authController.protect, authController.updateProfile);

module.exports = router;
