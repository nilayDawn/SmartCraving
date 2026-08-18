const Order = require("../models/order");
const FoodItem = require("../models/foodItem");
const Cart = require("../models/cartModel");
const ErrorHandler = require("../utils/errorHandler");

const getSessionEmail = (session) =>
  session.customer_details?.email || session.customer_email || "";

const finalizePaidOrder = async ({ session, user }) => {
  if (!session || session.payment_status !== "paid") {
    throw new ErrorHandler("Payment has not been completed", 400);
  }

  const sessionEmail = getSessionEmail(session).toLowerCase();
  if (!user || !sessionEmail || sessionEmail !== user.email.toLowerCase()) {
    throw new ErrorHandler("Checkout session does not belong to this account", 403);
  }

  const existingOrder = await Order.findOne({ stripeSessionId: session.id });
  if (existingOrder) return existingOrder;

  const cart = await Cart.findOne({ user: user._id })
    .populate({ path: "items.foodItem", select: "name price images stock" })
    .populate({ path: "restaurant", select: "name" });

  if (!cart || !cart.items.length) {
    throw new ErrorHandler("Your cart is empty or the order was already created", 400);
  }

  const orderItems = cart.items.map((item) => ({
    name: item.foodItem.name,
    quantity: item.quantity,
    image: item.foodItem.images?.[0]?.url || "",
    price: item.foodItem.price,
    fooditem: item.foodItem._id,
  }));

  const deliveryAddress = session.shipping_details?.address;
  const deliveryInfo = {
    address: `${deliveryAddress?.line1 || ""} ${deliveryAddress?.line2 || ""}`.trim() || "Not provided",
    city: deliveryAddress?.city || "Unknown",
    phoneNo: session.customer_details?.phone || "Not provided",
    postalCode: deliveryAddress?.postal_code || "Unknown",
    country: deliveryAddress?.country || "Unknown",
  };

  const decrementedItems = [];
  try {
    for (const item of cart.items) {
      const updatedFoodItem = await FoodItem.findOneAndUpdate(
        { _id: item.foodItem._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true },
      );
      if (!updatedFoodItem) {
        throw new ErrorHandler(`Insufficient stock for ${item.foodItem.name}`, 409);
      }
      decrementedItems.push(item);
    }

    const order = await Order.create({
      orderItems,
      deliveryInfo,
      paymentInfo: { id: session.payment_intent, status: session.payment_status },
      stripeSessionId: session.id,
      deliveryCharge: Number(session.shipping_cost?.amount_subtotal || 0) / 100,
      itemsPrice: Number(session.amount_subtotal || 0) / 100,
      finalTotal: Number(session.amount_total || 0) / 100,
      user: user._id,
      restaurant: cart.restaurant._id,
      paidAt: new Date(),
    });

    await Cart.findOneAndDelete({ user: user._id });
    return order;
  } catch (error) {
    await Promise.all(
      decrementedItems.map((item) =>
        FoodItem.updateOne({ _id: item.foodItem._id }, { $inc: { stock: item.quantity } }),
      ),
    );

    if (error.code === 11000) {
      const order = await Order.findOne({ stripeSessionId: session.id });
      if (order) return order;
    }
    throw error;
  }
};

module.exports = { finalizePaidOrder, getSessionEmail };
