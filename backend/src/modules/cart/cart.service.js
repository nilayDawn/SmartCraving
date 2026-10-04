const Cart = require("./cart.model");
const FoodItem = require("../catalogue/models/foodItem.model");
const Restaurant = require("../catalogue/models/restaurant.model");
const Menu = require("../catalogue/models/menu.model");
const AppError = require("../../core/errors/appError");

const getCleanId = (val) => {
  if (!val) return "";
  if (typeof val === "object") {
    return (val._id || val).toString();
  }
  return val.toString();
};

class CartService {
  async getPopulatedCart(userId) {
    return Cart.findOne({ user: userId })
      .populate({
        path: "items.foodItem",
        select: "name price images stock",
      })
      .populate({
        path: "restaurant",
        select: "name address",
      });
  }

  async addItemToCart({ userId, foodItemId, restaurantId, quantity }) {
    const qty = parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new AppError("Quantity must be at least 1", 400);
    }

    const foodItem = await FoodItem.findById(foodItemId);
    if (!foodItem) {
      throw new AppError("Food item not found", 404);
    }

    // 1. Resolve actual restaurant ID (direct or via indexed Menu query)
    let actualRestaurantId = getCleanId(foodItem.restaurant);
    if (!actualRestaurantId) {
      const menu = await Menu.findOne({ "menu.items": foodItem._id }).select("restaurant");
      if (menu && menu.restaurant) {
        actualRestaurantId = getCleanId(menu.restaurant);
      }
    }

    // 2. Validate target restaurant existence
    const requestedRestaurantId = getCleanId(restaurantId);
    let targetRestaurant = null;
    let targetRestaurantId = null;

    if (actualRestaurantId) {
      targetRestaurant = await Restaurant.findById(actualRestaurantId);
      if (targetRestaurant) targetRestaurantId = actualRestaurantId;
    }

    if (!targetRestaurant && requestedRestaurantId) {
      targetRestaurant = await Restaurant.findById(requestedRestaurantId);
      if (targetRestaurant) targetRestaurantId = requestedRestaurantId;
    }

    if (!targetRestaurant) {
      throw new AppError("Restaurant not found", 404);
    }

    // Auto-heal foodItem.restaurant if missing or mismatched
    if (getCleanId(foodItem.restaurant) !== targetRestaurantId) {
      foodItem.restaurant = targetRestaurantId;
      await foodItem.save();
    }

    let cart = await Cart.findOne({ user: userId });

    if (cart) {
      const existingRestId = getCleanId(cart.restaurant);

      // PRD Compliance: Adding food from another restaurant replaces the existing cart
      if (existingRestId && existingRestId !== targetRestaurantId) {
        cart.restaurant = targetRestaurantId;
        cart.items = [{ foodItem: foodItemId, quantity: qty }];
      } else {
        cart.restaurant = targetRestaurantId;
        const itemIndex = cart.items.findIndex(
          (item) => getCleanId(item.foodItem) === foodItemId.toString(),
        );

        if (itemIndex > -1) {
          cart.items[itemIndex].quantity += qty;
        } else {
          cart.items.push({ foodItem: foodItemId, quantity: qty });
        }
      }
    } else {
      cart = new Cart({
        user: userId,
        restaurant: targetRestaurantId,
        items: [{ foodItem: foodItemId, quantity: qty }],
      });
    }

    await cart.save();
    return this.getPopulatedCart(userId);
  }

  async updateItemQuantity({ userId, foodItemId, quantity }) {
    const qty = parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new AppError("Quantity must be at least 1", 400);
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new AppError("Cart not found", 404);
    }

    const itemIndex = cart.items.findIndex(
      (item) => getCleanId(item.foodItem) === foodItemId.toString(),
    );

    if (itemIndex === -1) {
      throw new AppError("Food item not found in cart", 404);
    }

    cart.items[itemIndex].quantity = qty;
    await cart.save();

    return this.getPopulatedCart(userId);
  }

  async removeItemFromCart({ userId, foodItemId }) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new AppError("Cart not found", 404);
    }

    const itemIndex = cart.items.findIndex(
      (item) => getCleanId(item.foodItem) === foodItemId.toString(),
    );

    if (itemIndex === -1) {
      throw new AppError("Food item not found in cart", 404);
    }

    cart.items.splice(itemIndex, 1); // .splice() returns the removed item, 1 is the number of items to remove

    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id });
      return null;
    }

    await cart.save();
    return this.getPopulatedCart(userId);
  }

  async getCart(userId) {
    const cart = await this.getPopulatedCart(userId);
    return cart;
  }
}

module.exports = new CartService();
