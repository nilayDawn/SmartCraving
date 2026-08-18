const Cart = require("../models/cartModel");
const FoodItem = require("../models/foodItem");
const Restaurant = require("../models/restaurant");
const Menu = require("../models/menu");

async function addItemToCart(req, res) {
  const { foodItemId, restaurantId, quantity } = req.body;
  const userId = req.user._id;

  try {
    const foodItem = await FoodItem.findById(foodItemId);
    if (!foodItem) {
      return res.status(404).json({ message: "Food item not found" });
    }

    let foodRestaurantId = foodItem.restaurant?.toString();
    if (!foodRestaurantId) {
      const menu = await Menu.findOne({ "menu.items": foodItem._id }).select("restaurant");
      foodRestaurantId = menu?.restaurant?.toString();
    }
    if (!foodRestaurantId || foodRestaurantId !== restaurantId) {
      return res.status(400).json({ message: "Food item does not belong to this restaurant" });
    }

    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    let cart = await Cart.findOne({ user: userId });

    if (cart) {
      if (cart.restaurant.toString() !== restaurantId) {
        await Cart.deleteOne({ _id: cart._id });
        cart = new Cart({
          user: userId,
          restaurant: restaurantId,
          items: [{ foodItem: foodItemId, quantity }],
        });
      } else {
        const itemIndex = cart.items.findIndex(
          (item) => item.foodItem.toString() === foodItemId
        );
        if (itemIndex > -1) {
          cart.items[itemIndex].quantity += quantity;
        } else {
          cart.items.push({ foodItem: foodItemId, quantity });
        }
      }
    } else {
      cart = new Cart({
        user: userId,
        restaurant: restaurantId,
        items: [{ foodItem: foodItemId, quantity }],
      });
    }

    await cart.save();

    // Fetch and return the populated cart
    const updatedCart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.foodItem",
        select: "name price images",
      })
      .populate({
        path: "restaurant",
        select: "name",
      });

    res.status(200).json({ message: "Cart updated", cart: updatedCart });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
}

// Update Cart

async function updateCartItemQuantity(req, res) {
  const { foodItemId, quantity } = req.body;
  const userId = req.user._id;

  try {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.foodItem.toString() === foodItemId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Food item not found in cart" });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    // Fetch and return the populated cart
    const updatedCart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.foodItem",
        select: "name price images",
      })
      .populate({
        path: "restaurant",
        select: "name",
      });

    res
      .status(200)
      .json({ message: "Cart item quantity updated", cart: updatedCart });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
}

//Delete cart

async function deleteCartItem(req, res) {
  const { foodItemId } = req.body;
  const userId = req.user._id;

  try {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.foodItem.toString() === foodItemId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Food item not found in cart" });
    }

    cart.items.splice(itemIndex, 1);

    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id });
      return res.status(200).json({ message: "Cart deleted" });
    } else {
      await cart.save();

      // Fetch and return the populated cart
      const updatedCart = await Cart.findOne({ user: userId })
        .populate({
          path: "items.foodItem",
          select: "name price images",
        })
        .populate({
          path: "restaurant",
          select: "name",
        });

      res.status(200).json({ message: "Cart item deleted", cart: updatedCart });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
}

//Fetch cart Item

async function getCartItem(req, res) {
  const userId = req.user._id;
  try {
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.foodItem",
        select: "name price images",
      })
      .populate({
        path: "restaurant",
        select: "name",
      });

    if (!cart) {
      return res.status(404).json({ message: "No cart found" });
    } else {
      return res.status(200).json({ status: "success", data: cart });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
}

module.exports = {
  addItemToCart,
  updateCartItemQuantity,
  deleteCartItem,
  getCartItem,
};
