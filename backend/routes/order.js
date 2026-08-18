const express = require("express");
const router = express.Router();

const {
  newOrder,
  getSingleOrder,
  myOrders,
  allOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const authController = require("../controllers/authController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

router
  .route("/new")
  .post(authController.protect, authorizeRoles("user", "restaurant-owner"), newOrder);

router.route("/me/myOrders").get(authController.protect, myOrders);
router
  .route("/admin")
  .get(authController.protect, authorizeRoles("admin"), allOrders);
router
  .route("/:id/status")
  .patch(authController.protect, authorizeRoles("admin"), updateOrderStatus);
router.route("/:id").get(authController.protect, getSingleOrder);

module.exports = router;
