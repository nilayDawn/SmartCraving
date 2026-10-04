const orderService = require("./order.service");
const catchAsync = require("../../core/errors/catchAsync");
const AppError = require("../../core/errors/appError");
const { getPaymentProvider } = require("../../providers/payment");

exports.newOrder = catchAsync(async (req, res, next) => {
  const { session_id } = req.body;

  if (typeof session_id !== "string" || !session_id.startsWith("cs_")) {
    return next(new AppError("Invalid checkout session", 400));
  }

  const paymentProvider = getPaymentProvider();
  const session = await paymentProvider.retrieveSession(session_id);

  const order = await orderService.finalizePaidOrder({ session, user: req.user });
  res.status(200).json({ success: true, order });
});

exports.getSingleOrder = catchAsync(async (req, res, next) => {
  const order = await orderService.getOrderById(req.params.id, req.user);
  res.status(200).json({
    success: true,
    order,
  });
});

exports.myOrders = catchAsync(async (req, res, next) => {
  const orders = await orderService.getUserOrders(req.user.id);
  res.status(200).json({
    success: true,
    orders,
  });
});

exports.allOrders = catchAsync(async (req, res, next) => {
  const { totalAmount, orders } = await orderService.getAllOrders();
  res.status(200).json({
    success: true,
    totalAmount,
    orders,
  });
});

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, adminMessage } = req.body;
  const order = await orderService.updateOrderStatus(req.params.id, { status, adminMessage });

  res.status(200).json({ success: true, order });
});
