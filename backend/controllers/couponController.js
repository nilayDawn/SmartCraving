const Coupon = require("../models/couponModel");
const ErrorHandler = require("../utils/errorHandler");
const catchAsync = require("../middlewares/catchAsyncErrors");
const { calculateCouponDiscount } = require("../utils/coupon");

const buildCouponPayload = (body) => {
  const allowedFields = ["couponName", "subTitle", "minAmount", "maxDiscount", "discount", "details", "expire"];
  const payload = Object.fromEntries(
    allowedFields.filter((field) => Object.prototype.hasOwnProperty.call(body, field))
      .map((field) => [field, body[field]]),
  );

  if (payload.couponName) payload.couponName = String(payload.couponName).trim().toUpperCase();
  if (payload.expire && /^\d{4}-\d{2}-\d{2}$/.test(String(payload.expire))) {
    const expiry = new Date(`${payload.expire}T23:59:59.999Z`);
    payload.expire = expiry;
  }

  return payload;
};

exports.createCoupon = catchAsync(async (req, res, next) => {
  const payload = buildCouponPayload(req.body);
  const coupon = await Coupon.create(payload);
  res.status(200).json({
    status: "success",
    data: coupon,
  });
});

exports.getCoupon = catchAsync(async (req, res, next) => {
  const coupons = await Coupon.find();
  // if(!coupons) return next(new ErrorHandler(''))
  res.status(200).json({
    status: "success",
    data: coupons,
  });
});

exports.updateCoupon = catchAsync(async (req, res, next) => {
  const payload = buildCouponPayload(req.body);
  const coupon = await Coupon.findByIdAndUpdate(req.params.couponId, payload, {
    new: true,
    runValidators: true,
  });

  if (!coupon)
    return next(new ErrorHandler("No Coupon found with that ID", 404));

  res.status(200).json({
    status: "success",
    data: coupon,
  });
});

exports.deleteCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.couponId);
  if (!coupon)
    return next(new ErrorHandler("No coupon found with given Id", 404));

  res.status(204).json({
    status: "success",
  });
});

exports.couponValidate = catchAsync(async (req, res, next) => {
  const { couponCode, cartItemsTotalAmount } = req.body;
  const total = Number(cartItemsTotalAmount);
  if (!couponCode || !Number.isFinite(total) || total < 0) {
    return next(new ErrorHandler("Invalid coupon code.", 404));
  }

  const coupon = await Coupon.findOne({
    couponName: String(couponCode).trim().toUpperCase(),
    expire: { $gt: new Date() },
  }).lean();

  if (!coupon) return next(new ErrorHandler("Invalid or expired coupon code.", 404));

  if (total < coupon.minAmount) {
    return next(
      new ErrorHandler(`Add ₹${(coupon.minAmount - total).toFixed(2)} more to use this coupon`, 400),
    );
  }

  const calculation = calculateCouponDiscount(coupon, total);

  res.status(200).json({
    status: "success",
    data: {
      ...coupon,
      ...calculation,
    },
  });
});
