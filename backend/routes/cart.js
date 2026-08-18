const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const cartController = require("../controllers/cartController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

const customerOnly = [
  authController.protect,
  authorizeRoles("user", "restaurant-owner"),
];

// Add to cart
router.post("/add-to-cart", customerOnly, cartController.addItemToCart);

// Update cart item quantity
router.post("/update-cart-item", customerOnly, cartController.updateCartItemQuantity);
router.delete("/delete-cart-item", customerOnly, cartController.deleteCartItem);
router.get("/get-cart", customerOnly, cartController.getCartItem);

module.exports = router;
