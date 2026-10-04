const paymentService = require("./payment.service");
const catchAsync = require("../../core/errors/catchAsync");

exports.processPayment = catchAsync(async (req, res, next) => {
  const { couponCode } = req.body;
  const result = await paymentService.processPayment({
    user: req.user,
    couponCode,
  });

  res.status(200).json(result);
});

exports.sendStripeApi = catchAsync(async (req, res, next) => {
  const stripeApiKey = paymentService.getPublishableKey();
  res.status(200).json({
    stripeApiKey,
  });
});

exports.stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  try {
    const result = await paymentService.handleWebhook(req.body, signature);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("signature verification failed")) {
      return res.status(400).json({ received: false, message: error.message });
    }
    // Return 500 so payment gateway retries transient errors
    return res.status(500).json({ received: false, message: error.message || "Webhook processing failed" });
  }
};
