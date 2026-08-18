const Order = require("../models/order");
const { ObjectId } = require("mongodb");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const dotenv = require("dotenv");
const { finalizePaidOrder } = require("../services/orderFinalization");
const User = require("../models/user");

//setting up config file
dotenv.config({ path: "./config/config.env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Create a new order   =>  /api/v1/order/new
exports.newOrder = catchAsyncErrors(async (req, res, next) => {
  const { session_id } = req.body;

  if (typeof session_id !== "string" || !session_id.startsWith("cs_")) {
    return next(new ErrorHandler("Invalid checkout session", 400));
  }

  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ["customer"],
  });

  const order = await finalizePaidOrder({ session, user: req.user });
  return res.status(200).json({ success: true, order });
});

// Stripe webhook fallback for customers who close the success page.
exports.stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(503).json({ received: false, message: "Stripe webhook is not configured" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    return res.status(400).json({ received: false, message: `Webhook signature verification failed: ${error.message}` });
  }

  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    return res.status(200).json({ received: true });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
    if (session.payment_status !== "paid") {
      return res.status(200).json({ received: true, ignored: "payment_not_paid" });
    }

    const sessionEmail = session.customer_details?.email || session.customer_email;
    const user = sessionEmail ? await User.findOne({ email: sessionEmail.toLowerCase() }) : null;
    if (!user) {
      return res.status(400).json({ received: false, message: "No customer account matches this checkout session" });
    }

    await finalizePaidOrder({ session, user });
    return res.status(200).json({ received: true });
  } catch (error) {
    // Return 5xx so Stripe retries transient finalization failures.
    return res.status(500).json({ received: false, message: error.message || "Order finalization failed" });
  }
};

// Get single order   =>   /api/v1/orders/:id
exports.getSingleOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("restaurant")
    .exec();

  if (!order) {
    return next(new ErrorHandler("No Order found with this ID", 404));
  }

  const orderUserId = order.user?._id?.toString() || order.user?.toString();
  if (req.user.role !== "admin" && orderUserId !== req.user.id.toString()) {
    return next(new ErrorHandler("You are not allowed to view this order", 403));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// Get logged in user orders   =>   /api/v1/orders/me
exports.myOrders = catchAsyncErrors(async (req, res, next) => {
  // Get the user ID from req.user
  const userId = new ObjectId(req.user.id);
  // Find orders for the specific user using the retrieved user ID
  const orders = await Order.find({ user: userId })
    .populate("user", "name email")
    .populate("restaurant")
    .exec();

  res.status(200).json({
    success: true,
    orders,
  });
});

// Get all orders - ADMIN  =>   /api/v1/admin/orders/
exports.allOrders = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find()
    .populate("user", "name email")
    .populate("restaurant", "name")
    .populate("orderItems.fooditem", "name stock images price")
    .sort({ createdAt: -1 });

  let totalAmount = 0;

  orders.forEach((order) => {
    totalAmount += order.finalTotal;
  });

  res.status(200).json({
    success: true,
    totalAmount,
    orders,
  });
});

exports.updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
  const allowedStatuses = ["Processing", "Confirmed", "Preparing", "Out for delivery", "Delivered", "Cancelled"];
  const statusOrder = ["Processing", "Confirmed", "Preparing", "Out for delivery", "Delivered"];
  const { status, adminMessage } = req.body;

  if (!allowedStatuses.includes(status)) {
    return next(new ErrorHandler("Invalid order status", 400));
  }

  const existingOrder = await Order.findById(req.params.id);
  if (!existingOrder) return next(new ErrorHandler("No Order found with this ID", 404));

  if (["Delivered", "Cancelled"].includes(existingOrder.orderStatus)) {
    return next(new ErrorHandler("This order has reached its final status and cannot be changed", 400));
  }

  const currentIndex = statusOrder.indexOf(existingOrder.orderStatus);
  const nextStatus = statusOrder[currentIndex + 1];
  if (status !== nextStatus && status !== "Cancelled") {
    return next(
      new ErrorHandler(
        `Order status must move to ${nextStatus || "the next stage"}, or be cancelled`,
        400,
      ),
    );
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
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

  if (!order) return next(new ErrorHandler("No Order found with this ID", 404));
  res.status(200).json({ success: true, order });
});
