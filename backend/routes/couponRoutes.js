const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../controllers/authController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

const {
  createCoupon,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  couponValidate,
} = require("../controllers/couponController");
const router = express.Router();
const couponValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.route("/").post(protect, authorizeRoles("admin"), createCoupon).get(getCoupon);
router
  .route("/:couponId")
  .patch(protect, authorizeRoles("admin"), updateCoupon)
  .delete(protect, authorizeRoles("admin"), deleteCoupon);
router.route("/validate").post(couponValidationLimiter, protect, couponValidate);

module.exports = router;
