const Cart = require("../models/cartModel");
const FoodItem = require("../models/foodItem");
const Restaurant = require("../models/restaurant");
const Menu = require("../models/menu");

const getCleanId = (val) => {
  if (!val) return "";
  if (typeof val === "object") {
    return (val._id || val).toString();
  }
  return val.toString();
};

async function addItemToCart(req, res) {
  const { foodItemId, restaurantId, quantity } = req.body;
  const userId = req.user._id;

  const requestedRestaurantId = getCleanId(restaurantId);

  try {
    const foodItem = await FoodItem.findById(foodItemId);
    if (!foodItem) {
      return res.status(404).json({ message: "Food item not found" });
    }

    // 1. Resolve actual restaurant ID from foodItem directly or via Menu relation
    let actualRestaurantId = getCleanId(foodItem.restaurant);

    if (!actualRestaurantId) {
      let menu = await Menu.findOne({ "menu.items": foodItem._id }).select("restaurant");
      if (!menu) {
        const allMenus = await Menu.find().select("restaurant menu");
        for (const m of allMenus) {
          if (m.menu && Array.isArray(m.menu)) {
            const found = m.menu.some((cat) =>
              cat.items && cat.items.some((it) => getCleanId(it) === foodItemId.toString())
            );
            if (found) {
              menu = m;
              break;
            }
          }
        }
      }

      if (menu?.restaurant) {
        actualRestaurantId = getCleanId(menu.restaurant);
      }
    }

    // 2. Validate target restaurant existence in DB (prefer actual, fallback to requested)
    let targetRestaurant = null;
    let targetRestaurantId = null;

    if (actualRestaurantId) {
      targetRestaurant = await Restaurant.findById(actualRestaurantId);
      if (targetRestaurant) {
        targetRestaurantId = actualRestaurantId;
      }
    }

    if (!targetRestaurant && requestedRestaurantId) {
      targetRestaurant = await Restaurant.findById(requestedRestaurantId);
      if (targetRestaurant) {
        targetRestaurantId = requestedRestaurantId;
      }
    }

    if (!targetRestaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Auto-heal missing/stale restaurant reference on the FoodItem record in DB
    if (getCleanId(foodItem.restaurant) !== targetRestaurantId) {
      foodItem.restaurant = targetRestaurantId;
      await foodItem.save();
    }

    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    let cart = await Cart.findOne({ user: userId });

    if (cart) {
      if (targetRestaurantId) {
        cart.restaurant = targetRestaurantId;
      }
      const itemIndex = cart.items.findIndex(
        (item) => getCleanId(item.foodItem) === foodItemId.toString()
      );
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += Number(quantity);
      } else {
        cart.items.push({ foodItem: foodItemId, quantity: Number(quantity) });
      }
    } else {
      cart = new Cart({
        user: userId,
        restaurant: targetRestaurantId,
        items: [{ foodItem: foodItemId, quantity: Number(quantity) }],
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
    res.status(500).json({ message: "Server error", error: error.message });
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
