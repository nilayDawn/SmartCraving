const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  couponName: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 40,
  },
  subTitle: {
    type: "String",
    required: true,
  },
  minAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  maxDiscount: {
    type: Number,
    min: 0,
  },
  discount: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  details: {
    type: String,
    required: true,
  },
  expire: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model("coupon", couponSchema);
