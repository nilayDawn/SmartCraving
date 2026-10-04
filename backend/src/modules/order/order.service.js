const Order = require("./order.model");
const FoodItem = require("../catalogue/models/foodItem.model");
const Cart = require("../cart/cart.model");
const AppError = require("../../core/errors/appError");

class OrderService {
  getSessionEmail(session) {
    return session.customer_details?.email || session.customer_email || "";
  }

  async finalizePaidOrder({ session, user }) {
    if (!session || session.payment_status !== "paid") {
      throw new AppError("Payment has not been completed", 400);
    }

    const sessionEmail = this.getSessionEmail(session).toLowerCase();
    if (!user || !sessionEmail || sessionEmail !== user.email.toLowerCase()) {
      throw new AppError("Checkout session does not belong to this account", 403);
    }

    // Idempotency check: Return existing order if already finalized
    const existingOrder = await Order.findOne({ stripeSessionId: session.id })
      .populate("user", "name email")
      .populate("restaurant")
      .populate("orderItems.fooditem", "name stock images price");
    if (existingOrder) return existingOrder;

    const cart = await Cart.findOne({ user: user._id })
      .populate({ path: "items.foodItem", select: "name price images stock" })
      .populate({ path: "restaurant", select: "name" });

    if (!cart || !cart.items.length) {
      throw new AppError("Your cart is empty or the order was already created", 400);
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
      address:
        `${deliveryAddress?.line1 || ""} ${deliveryAddress?.line2 || ""}`.trim() ||
        "Not provided",
      city: deliveryAddress?.city || "Unknown",
      phoneNo: session.customer_details?.phone || "Not provided",
      postalCode: deliveryAddress?.postal_code || "Unknown",
      country: deliveryAddress?.country || "Unknown",
    };

    // Atomic stock decrement with rollback guarantee
    const decrementedItems = []; // ---> will use this to rollback stock if order creation fails
    try {
      for (const item of cart.items) {
        const updatedFoodItem = await FoodItem.findOneAndUpdate(
          { _id: item.foodItem._id, stock: { $gte: item.quantity } }, //check if stock is sufficient before decrementing
          { $inc: { stock: -item.quantity } }, // Decrement stock atomically
          { new: true },
        );

        if (!updatedFoodItem) {
          throw new AppError(`Insufficient stock for ${item.foodItem.name}`, 409);
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
        restaurant: cart.restaurant?._id,
        paidAt: new Date(),
      });

      // Clear customer's cart
      await Cart.findOneAndDelete({ user: user._id });

      return order;
    } catch (error) {
      // Rollback decremented stock
      await Promise.all(
        decrementedItems.map((item) =>
          FoodItem.updateOne({ _id: item.foodItem._id }, { $inc: { stock: item.quantity } }),
        ),
      );

      // Handle duplicate key race condition gracefully. If another process created the order with the same stripeSessionId, return that order instead of throwing an error.
      if (error.code === 11000) {
        const order = await Order.findOne({ stripeSessionId: session.id });
        if (order) return order;
      }

      throw error;
    }
  }

  async getOrderById(orderId, currentUser) {
    const order = await Order.findById(orderId)
      .populate("user", "name email")
      .populate("restaurant", "name location images phone")
      .populate("orderItems.fooditem", "name stock images price")
      .lean();

    if (!order) {
      throw new AppError("No Order found with this ID", 404);
    }

    const orderUserId = order.user?._id?.toString() || order.user?.toString();
    if (currentUser.role !== "admin" && orderUserId !== currentUser.id?.toString()) {
      throw new AppError("You are not allowed to view this order", 403);
    }

    return order;
  }

  async getUserOrders(userId) {
    return Order.find({ user: userId })
      .populate("user", "name email")
      .populate("restaurant", "name location images phone")
      .sort({ createdAt: -1 })
      .lean();
  }

  async getAllOrders() {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("restaurant", "name")
      .populate("orderItems.fooditem", "name stock images price")
      .sort({ createdAt: -1 })
      .lean();

    const totalAmount = orders.reduce((sum, order) => sum + (order.finalTotal || 0), 0);

    return {
      totalAmount,
      orders,
    };
  }

  async updateOrderStatus(orderId, { status, adminMessage }) {
    const allowedStatuses = [
      "Processing",
      "Confirmed",
      "Preparing",
      "Out for delivery",
      "Delivered",
      "Cancelled",
    ];
    const statusOrder = ["Processing", "Confirmed", "Preparing", "Out for delivery", "Delivered"];

    if (!allowedStatuses.includes(status)) {
      throw new AppError("Invalid order status", 400);
    }

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      throw new AppError("No Order found with this ID", 404);
    }

    if (["Delivered", "Cancelled"].includes(existingOrder.orderStatus)) {
      throw new AppError("This order has reached its final status and cannot be changed", 400);
    }

    const currentIndex = statusOrder.indexOf(existingOrder.orderStatus);
    const nextStatus = statusOrder[currentIndex + 1];
    if (status !== nextStatus && status !== "Cancelled") {
      throw new AppError(
        `Order status must move to ${nextStatus || "the next stage"}, or be cancelled`,
        400,
      );
    }

    // If order was cancelled, restore stock!
    if (status === "Cancelled" && existingOrder.orderStatus !== "Cancelled") {
      await Promise.all(
        existingOrder.orderItems.map((item) =>
          FoodItem.updateOne({ _id: item.fooditem }, { $inc: { stock: item.quantity } }),
        ),
      );
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        orderStatus: status,
        ...(typeof adminMessage === "string" ? { adminMessage: adminMessage.trim() } : {}),
        ...(status === "Delivered" ? { deliveredAt: Date.now() } : {}),
      },
      { new: true, runValidators: true },
    )
      .populate("user", "name email")
      .populate("restaurant", "name")
      .populate("orderItems.fooditem", "name stock images price");

    return order;
  }
}

module.exports = new OrderService();
