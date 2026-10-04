const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    deliveryInfo: {
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      phoneNo: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    orderItems: [
      {
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        image: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        fooditem: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "FoodItem",
        },
      },
    ],
    paymentInfo: {
      id: {
        type: String,
      },
      status: {
        type: String,
      },
    },
    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    paidAt: {
      type: Date,
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    taxPrice: {
      type: Number,
      default: 0.0,
    },
    deliveryCharge: {
      type: Number,
      default: 0.0,
    },
    finalTotal: {
      type: Number,
      required: true,
      default: 0.0,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ["Processing", "Confirmed", "Preparing", "Out for delivery", "Delivered", "Cancelled"],
      default: "Processing",
    },
    adminMessage: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    deliveredAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
