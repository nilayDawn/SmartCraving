const aiService = require("./ai.service");
const catchAsync = require("../../core/errors/catchAsync");

exports.generateFoodAI = catchAsync(async (req, res, next) => {
  const { name, category, spiceLevel, price } = req.body;
  const aiData = await aiService.generateFoodAI({
    name,
    category,
    spiceLevel,
    price,
  });

  res.status(200).json({
    success: true,
    data: aiData,
  });
});

exports.generateAndSaveFoodAI = catchAsync(async (req, res, next) => {
  const aiData = await aiService.generateAndSaveFoodAI(req.params.foodId);
  res.status(200).json({
    success: true,
    message: "AI metadata generated and saved",
    data: aiData,
  });
});

exports.analyzeRestaurantReviews = catchAsync(async (req, res, next) => {
  const aiData = await aiService.analyzeRestaurantReviews(req.params.id);
  res.status(200).json({
    success: true,
    aiData,
  });
});

exports.getRestaurantReviewSummary = catchAsync(async (req, res, next) => {
  const result = await aiService.getRestaurantReviewSummary(req.params.id);
  res.status(200).json({
    success: true,
    cached: result.cached,
    aiData: result.aiData,
  });
});

exports.getFoodReviewSummary = catchAsync(async (req, res, next) => {
  const result = await aiService.getFoodReviewSummary(req.params.id);
  res.status(200).json({
    success: true,
    cached: result.cached,
    aiData: result.aiData,
  });
});

exports.addReview = catchAsync(async (req, res, next) => {
  const { name, rating, Comment } = req.body;
  const restaurant = await aiService.addStoreReview(req.params.id, { name, rating, Comment });

  res.status(200).json({
    success: true,
    message: "Review Added Successfully",
    restaurant,
  });
});

exports.deleteRestaurantReview = catchAsync(async (req, res, next) => {
  const restaurant = await aiService.deleteRestaurantReview(req.params.id, req.params.reviewId);
  res.status(200).json({
    success: true,
    restaurant,
  });
});

exports.deleteFoodReview = catchAsync(async (req, res, next) => {
  const foodItem = await aiService.deleteFoodReview(req.params.id, req.params.reviewId);
  res.status(200).json({
    success: true,
    foodItem,
  });
});
