const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter FoodItem name"],
      trim: true,
      maxLength: [100, "FoodItem name cannot exceed 100 characters"],
    },
    price: {
      type: Number,
      required: [true, "Please enter FoodItem price"],
      default: 0.0,
    },
    description: {
      type: String,
      required: [true, "Please enter FoodItem description"],
    },
    ratings: {
      type: Number,
      default: 0,
    },
    images: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    menu: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
    },
    stock: {
      type: Number,
      required: [true, "Please enter foodItem stock"],
      default: 0,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        name: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          required: true,
        },
        Comment: {
          type: String,
          required: true,
        },
      },
    ],
    reviewSentiment: {
      type: String,
      enum: ["positive", "negative", "mixed"],
    },
    reviewSummaryBullets: [String],
    reviewTopMentions: [String],
    aiDescription: {
      type: String,
      default: "",
    },
    aiTags: {
      type: [String],
      default: [],
    },
    aiAllergens: {
      type: [String],
      default: [],
    },
    aiServes: {
      type: String,
      default: "",
    },
    aiBestFor: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

// Performance Indexes for fast menu lookup and filtered queries
foodSchema.index({ restaurant: 1, name: 1 }); // resturant: 1 means ascending order, name: 1 means ascending order of foodItem name.
foodSchema.index({ ratings: -1 }); // Index for sorting by ratings in descending order

module.exports = mongoose.model("FoodItem", foodSchema);
