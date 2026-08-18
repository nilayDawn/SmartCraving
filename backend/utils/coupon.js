const calculateCouponDiscount = (coupon, subtotal) => {
  const percentageDiscount = (subtotal * Number(coupon.discount)) / 100;
  const maximumDiscount = Number.isFinite(Number(coupon.maxDiscount))
    ? Number(coupon.maxDiscount)
    : percentageDiscount;
  const discount = Math.min(percentageDiscount, maximumDiscount);

  return {
    discount: Number(Math.max(0, discount).toFixed(2)),
    finalTotal: Number(Math.max(0, subtotal - discount).toFixed(2)),
  };
};

module.exports = { calculateCouponDiscount };
