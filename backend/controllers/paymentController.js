const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Cart = require("../models/cartModel");
const Coupon = require("../models/couponModel");
const ErrorHandler = require("../utils/errorHandler");
const { calculateCouponDiscount } = require("../utils/coupon");

exports.processPayment = catchAsyncErrors(async (req, res, next) => {
  const { couponCode } = req.body;
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({ path: "items.foodItem", select: "name price images" })
    .populate({ path: "restaurant", select: "name" });

  if (!cart || !cart.items.length) {
    return next(new ErrorHandler("Your cart is empty", 400));
  }

  const subtotal = cart.items.reduce(
    (sum, item) => {
      if (!item.foodItem || !Number.isFinite(Number(item.foodItem.price))) {
        throw new ErrorHandler("Cart contains an invalid food item", 400);
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > item.foodItem.stock) {
        throw new ErrorHandler(`Insufficient stock for ${item.foodItem.name}`, 400);
      }
      return sum + Number(item.foodItem.price) * item.quantity;
    },
    0,
  );
  let stripeDiscount;

  if (couponCode) {
    const coupon = await Coupon.findOne({
      couponName: String(couponCode).trim().toUpperCase(),
      expire: { $gt: new Date() },
    });

    if (!coupon || subtotal < coupon.minAmount) {
      return next(new ErrorHandler("This coupon is invalid or cannot be used for this cart", 400));
    }

    const { discount } = calculateCouponDiscount(coupon, subtotal);

    stripeDiscount = await stripe.coupons.create({
      name: coupon.couponName,
      amount_off: Math.round(discount * 100),
      currency: "inr",
      duration: "once",
    });
  }

  const lineItems = cart.items.map((item) => {
    if (!item.foodItem || !Number.isFinite(Number(item.foodItem.price)) || Number(item.foodItem.price) <= 0) {
      throw new ErrorHandler("Cart contains an invalid food item", 400);
    }

    const imageUrl = item.foodItem.images?.[0]?.url;
    const productData = { name: item.foodItem.name };
    if (/^https?:\/\//i.test(imageUrl || "")) productData.images = [imageUrl];

    return {
      price_data: {
        currency: "inr",
        product_data: productData,
        unit_amount: Math.round(Number(item.foodItem.price) * 100),
      },
      quantity: item.quantity,
    };
  });

  const session = await stripe.checkout.sessions.create({
    customer_email: req.user.email,
    phone_number_collection: {
      enabled: true,
    },
    line_items: lineItems,
    mode: "payment",
    shipping_address_collection: {
      allowed_countries: ["US", "IN"],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Delivery Charges",
          type: "fixed_amount",
          fixed_amount: {
            amount: 5500, // Amount in paise (e.g., 5500 = 55 INR)
            currency: "inr",
          },
          delivery_estimate: {
            minimum: {
              unit: "hour",
              value: 1,
            },
            maximum: {
              unit: "hour",
              value: 3,
            },
          },
        },
      },
    ],
    ...(stripeDiscount ? { discounts: [{ coupon: stripeDiscount.id }] } : {}),
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/cart`,
  });
  res.status(200).json({ url: session.url });
});

// exports.paymentDetails = catchAsyncErrors(async (req, res, next) => {
//   const session = await stripe.checkout.sessions.retrieve(
//     "cs_test_b1wjqczdc5wwaNj5FjvxipLWeKZIvZQvsbC2OjfC5FEZw5vJ8aJbdMPRYC",
//     {
//       expand: ["customer"],
//     }
//   );
//   res.json({
//     session,
//   });
// });

// Send stripe API Key   =>   /api/v1/stripeapi
exports.sendStripApi = catchAsyncErrors(async (req, res, next) => {
  res.status(200).json({
    stripeApiKey: process.env.STRIPE_API_KEY,
  });
});
