const Restaurant = require("../models/restaurant");
const ErrorHandler = require("../utils/errorHandler");
const catchAsync = require("../middlewares/catchAsyncErrors");
const APIFeatures = require("../utils/apiFeatures");
const { analyzeReviewsWithAI } = require("../services/aiReviewAnalyzer");

exports.getAllRestaurants = catchAsync(async (req, res, next) => {
  const apiFeatures = new APIFeatures(Restaurant.find(), req.query)
    .search()
    .sort();
  const restaurants = await apiFeatures.query;
  res.status(200).json({
    status: "success",
    count: restaurants.length,
    restaurants: restaurants,
  });
});

exports.createRestaurant = catchAsync(async (req, res, next) => {
  const body = { ...req.body };

  // Process photo upload or image link
  let images = [];
  if (body.images && Array.isArray(body.images) && body.images.length > 0) {
    images = body.images;
  } else if (body.image || body.imageUrl) {
    const rawImg = body.image || body.imageUrl;
    let uploadedUrl = rawImg;
    let publicId = "restaurant_" + Date.now();

    if (typeof rawImg === "string" && rawImg.startsWith("data:image")) {
      try {
        const cloudinary = require("../config/cloudinary");
        const result = await cloudinary.uploader.upload(rawImg, {
          folder: "restaurants",
        });
        publicId = result.public_id;
        uploadedUrl = result.secure_url;
      } catch (err) {
        uploadedUrl = rawImg;
      }
    }
    images = [{ public_id: publicId, url: uploadedUrl }];
  } else {
    images = [{ public_id: "default_store", url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800" }];
  }

  body.images = images;
  delete body.image;
  delete body.imageUrl;

  const restaurant = await Restaurant.create(body);
  res.status(201).json({
    status: "success",
    data: restaurant,
  });
});

//Get restaurant by id
exports.getRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.storeId);

  if (!restaurant)
    return next(new ErrorHandler("No Restaurant found with that ID", 404));

  // Backfill the cached AI summary for restaurants that already have reviews.
  // This runs only once per restaurant, then future reads use the stored fields.
  const hasUsefulSummary = restaurant.reviewSummaryBullets?.length > 0 &&
    !restaurant.reviewSummaryBullets.includes("AI analysis failed");
  if (restaurant.reviews?.length > 0 && !hasUsefulSummary) {
    const aiData = await analyzeReviewsWithAI(restaurant.reviews);
    restaurant.reviewSentiment = aiData.sentiment;
    restaurant.reviewSummaryBullets = aiData.summaryBullets;
    restaurant.reviewTopMentions = aiData.topMentions;
    await restaurant.save();
  }

  res.status(200).json({
    status: "success",
    data: restaurant,
  });
});

exports.deleteRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findByIdAndDelete(req.params.storeId);

  if (!restaurant)
    return next(new ErrorHandler("No document found with that ID", 404));

  res.status(204).json({
    status: "success",
  });
});
