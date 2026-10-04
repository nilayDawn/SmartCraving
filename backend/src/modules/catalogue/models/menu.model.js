const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
  {
    menu: [
      {
        category: { type: String, required: true },
        items: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FoodItem",
          },
        ],
      },
    ],
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

menuSchema.index({ "menu.items": 1 });

module.exports = mongoose.model("Menu", menuSchema);
