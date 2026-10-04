const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const { protect } = require("../../core/middlewares/auth.middleware");
const {
  authAttemptLimiter,
  passwordResetRequestLimiter,
  passwordResetSubmitLimiter,
} = require("../../core/middlewares/rateLimiter.middleware");
const {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require("../../core/middlewares/validate.middleware");

router.post("/signup", authAttemptLimiter, validateSignup, authController.signup);
router.post("/login", authAttemptLimiter, validateLogin, authController.login);
router.get("/logout", authController.logout);

router.post(
  "/forgetPassword",
  passwordResetRequestLimiter,
  validateForgotPassword,
  authController.forgotPassword,
);

router.patch(
  "/resetPassword/:token",
  passwordResetSubmitLimiter,
  validateResetPassword,
  authController.resetPassword,
);

router.get("/me", protect, authController.getUserProfile);
router.put("/me/update", protect, authController.updateProfile);
router.put("/password/update", protect, authController.updatePassword);

module.exports = router;
