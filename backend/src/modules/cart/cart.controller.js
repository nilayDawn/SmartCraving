const cartService = require("./cart.service");
const catchAsync = require("../../core/errors/catchAsync");

exports.addItemToCart = catchAsync(async (req, res, next) => {
  const { foodItemId, restaurantId, quantity } = req.body;
  const updatedCart = await cartService.addItemToCart({
    userId: req.user._id,
    foodItemId,
    restaurantId,
    quantity,
  });

  res.status(200).json({
    message: "Cart updated",
    cart: updatedCart,
  });
});

exports.updateCartItemQuantity = catchAsync(async (req, res, next) => {
  const { foodItemId, quantity } = req.body;
  const updatedCart = await cartService.updateItemQuantity({
    userId: req.user._id,
    foodItemId,
    quantity,
  });

  res.status(200).json({
    message: "Cart item quantity updated",
    cart: updatedCart,
  });
});

exports.deleteCartItem = catchAsync(async (req, res, next) => {
  const { foodItemId } = req.body;
  const updatedCart = await cartService.removeItemFromCart({
    userId: req.user._id,
    foodItemId,
  });

  if (!updatedCart) {
    return res.status(200).json({ message: "Cart deleted" });
  }

  res.status(200).json({
    message: "Cart item deleted",
    cart: updatedCart,
  });
});

exports.getCartItem = catchAsync(async (req, res, next) => {
  const cart = await cartService.getCart(req.user._id);

  if (!cart) {
    return res.status(404).json({ message: "No cart found" });
  }

  res.status(200).json({
    status: "success",
    data: cart,
  });
});
