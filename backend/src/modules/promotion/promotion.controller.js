const promotionService = require("./promotion.service");
const catchAsync = require("../../core/errors/catchAsync");
const { invalidateCache } = require("../../core/middlewares/cache.middleware");

exports.createCoupon = catchAsync(async (req, res, next) => {
  const coupon = await promotionService.createCoupon(req.body);
  await invalidateCache(["*coupon*"]);
  res.status(200).json({
    status: "success",
    data: coupon,
  });
});

exports.getCoupon = catchAsync(async (req, res, next) => {
  const coupons = await promotionService.getAllCoupons();
  res.set("Cache-Control", "public, max-age=180, stale-while-revalidate=600");
  res.status(200).json({
    status: "success",
    data: coupons,
  });
});

exports.updateCoupon = catchAsync(async (req, res, next) => {
  const coupon = await promotionService.updateCoupon(req.params.couponId, req.body);
  await invalidateCache(["*coupon*"]);
  res.status(200).json({
    status: "success",
    data: coupon,
  });
});

exports.deleteCoupon = catchAsync(async (req, res, next) => {
  await promotionService.deleteCoupon(req.params.couponId);
  await invalidateCache(["*coupon*"]);
  res.status(204).json({
    status: "success",
  });
});

exports.couponValidate = catchAsync(async (req, res, next) => {
  const { couponCode, cartItemsTotalAmount } = req.body;
  const result = await promotionService.validateCoupon(couponCode, cartItemsTotalAmount);

  res.status(200).json({
    status: "success",
    data: result,
  });
});
