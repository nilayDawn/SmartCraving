const express = require("express");
const router = express.Router();
const promotionController = require("./promotion.controller");
const { protect, authorizeRoles } = require("../../core/middlewares/auth.middleware");
const { couponValidationLimiter } = require("../../core/middlewares/rateLimiter.middleware");
const {
  validateObjectId,
  validateCoupon,
} = require("../../core/middlewares/validate.middleware");
const { cacheResponse } = require("../../core/middlewares/cache.middleware");

router
  .route("/")
  .post(protect, authorizeRoles("admin"), promotionController.createCoupon)
  .get(cacheResponse(300), promotionController.getCoupon);

router
  .route("/:couponId")
  .patch(
    protect,
    authorizeRoles("admin"),
    validateObjectId("couponId"),
    promotionController.updateCoupon,
  )
  .delete(
    protect,
    authorizeRoles("admin"),
    validateObjectId("couponId"),
    promotionController.deleteCoupon,
  );

router.post(
  "/validate",
  couponValidationLimiter,
  protect,
  validateCoupon,
  promotionController.couponValidate,
);

module.exports = router;
