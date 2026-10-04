const express = require("express");
const router = express.Router();
const orderController = require("./order.controller");
const { protect, authorizeRoles } = require("../../core/middlewares/auth.middleware");
const { orderCreationLimiter } = require("../../core/middlewares/rateLimiter.middleware");
const {
  validateCreateOrder,
  validateObjectId,
} = require("../../core/middlewares/validate.middleware");

router.route("/new").post(
  orderCreationLimiter,
  protect,
  authorizeRoles("user", "restaurant-owner"),
  validateCreateOrder,
  orderController.newOrder,
);

router.route("/me/myOrders").get(protect, orderController.myOrders);

router
  .route("/admin")
  .get(protect, authorizeRoles("admin"), orderController.allOrders);

router
  .route("/:id/status")
  .patch(
    protect,
    authorizeRoles("admin"),
    validateObjectId("id"),
    orderController.updateOrderStatus,
  );

router
  .route("/:id")
  .get(protect, validateObjectId("id"), orderController.getSingleOrder);

module.exports = router;
