const express = require("express");
const router = express.Router();
const cartController = require("./cart.controller");
const { protect, authorizeRoles } = require("../../core/middlewares/auth.middleware");
const { cartLimiter } = require("../../core/middlewares/rateLimiter.middleware");
const {
  validateAddToCart,
  validateUpdateCart,
} = require("../../core/middlewares/validate.middleware");

const customerOnly = [protect, authorizeRoles("user", "restaurant-owner")];

router.post(
  "/add-to-cart",
  cartLimiter,
  customerOnly,
  validateAddToCart,
  cartController.addItemToCart,
);

router.post(
  "/update-cart-item",
  cartLimiter,
  customerOnly,
  validateUpdateCart,
  cartController.updateCartItemQuantity,
);

router.delete("/delete-cart-item", customerOnly, cartController.deleteCartItem);
router.get("/get-cart", customerOnly, cartController.getCartItem);

module.exports = router;
