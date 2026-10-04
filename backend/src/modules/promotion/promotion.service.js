const Coupon = require("./coupon.model");
const AppError = require("../../core/errors/appError");

class PromotionService {
  buildCouponPayload(body) {
    const allowedFields = [
      "couponName",
      "subTitle",
      "minAmount",
      "maxDiscount",
      "discount",
      "details",
      "expire",
    ];
    // Create a new object containing only the allowed fields from the request body. And use Object.fromEntries() to convert it to a plain object
    const payload = Object.fromEntries(
      allowedFields
        .filter((field) => Object.prototype.hasOwnProperty.call(body, field)) // Filter out fields that are not present in the request body
        .map((field) => [field, body[field]]), // Map the allowed fields to key-value pairs, for example, ["couponName", body.couponName]
    );

    if (payload.couponName) {
      payload.couponName = String(payload.couponName).trim().toUpperCase();
    }

    // Validate and convert the expire date to a Date object if it's in the correct format (YYYY-MM-DD)
    if (payload.expire && /^\d{4}-\d{2}-\d{2}$/.test(String(payload.expire))) {
      payload.expire = new Date(`${payload.expire}T23:59:59.999Z`);
    }

    return payload;
  }

  calculateDiscount(coupon, subtotal) {
    const percentageDiscount = (subtotal * Number(coupon.discount)) / 100;
    const maximumDiscount = Number.isFinite(Number(coupon.maxDiscount))
      ? Number(coupon.maxDiscount)
      : percentageDiscount;
    const discount = Math.min(percentageDiscount, maximumDiscount);

    return {
      discount: Number(Math.max(0, discount).toFixed(2)),
      finalTotal: Number(Math.max(0, subtotal - discount).toFixed(2)),
    };
  }

  async validateCoupon(couponCode, subtotal) {
    const total = Number(subtotal);
    if (!couponCode || !Number.isFinite(total) || total < 0) {
      throw new AppError("Invalid coupon code.", 404);
    }

    const code = String(couponCode).trim().toUpperCase();
    const coupon = await Coupon.findOne({
      couponName: code,
      expire: { $gt: new Date() },
    }).lean();

    if (!coupon) {
      throw new AppError("Invalid or expired coupon code.", 404);
    }

    if (total < coupon.minAmount) {
      throw new AppError(
        `Add ₹${(coupon.minAmount - total).toFixed(2)} more to use this coupon`,
        400,
      );
    }

    const calculation = this.calculateDiscount(coupon, total);
    return {
      ...coupon,
      ...calculation,
    };
  }

  async createCoupon(body) {
    const payload = this.buildCouponPayload(body);
    return Coupon.create(payload);
  }

  async getAllCoupons() {
    return Coupon.find();
  }

  async updateCoupon(couponId, body) {
    const payload = this.buildCouponPayload(body);
    const coupon = await Coupon.findByIdAndUpdate(couponId, payload, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      throw new AppError("No Coupon found with that ID", 404);
    }
    return coupon;
  }

  async deleteCoupon(couponId) {
    const coupon = await Coupon.findByIdAndDelete(couponId);
    if (!coupon) {
      throw new AppError("No coupon found with given Id", 404);
    }
    return true;
  }
}

module.exports = new PromotionService();
