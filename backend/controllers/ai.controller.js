const aiService = require("../services/ai.service")
const FoodItem = require("../models/foodItem");
const catchAsync = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorHandler");

const Restaurant = require("../models/restaurant");
const {analyzeReviewsWithAI}= require("../services/aiReviewAnalyzer")

exports.generateFoodAI = catchAsync(async (req, res) => {
  const { name, category, spiceLevel, price } = req.body;
  if (typeof name !== "string" || !name.trim() || name.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Please enter the Dish Name before generating AI description.",
    });
  }

  const aiData = await aiService.generateDishDescription({
    name,
    category: category || "Main Course",
    spiceLevel: spiceLevel || "Medium",
    price: price || 10,
  });

  res.status(200).json({
    success: true,
    data: aiData,
  });
});

exports.generateAndSaveFoodAI = catchAsync(async(req,res) =>{
    const {foodId} = req.params;

    const food = await FoodItem.findById(foodId);
    if(!food){
        return res.status(404).json({
            success:false,
            message:"Food item not found"
        })
    }

    const aiData = await aiService.generateDishDescription({
        name: food.name,
        category:food.category || "Veg",
        spiceLevel:food.spiceLevel || "Medium",
        price:food.price
    })

    food.aiDescription = aiData.description;
    food.aiTags = aiData.tags;
    food.aiAllergens = aiData.allergens;
    food.aiServes = aiData.serves;
    food.aiBestFor = aiData.bestFor;
    await food.save();
    res.status(200).json({
        success:true,
        message:"AI metadata generated and saved",
        data:aiData,
    })
})

exports.analyzeRestaurantReviews = catchAsync(async(req,res) =>{
    try{
          const {id} = req.params;
          const restaurant = await Restaurant.findById(id);

          if(!restaurant) {
            return res.status(404).json({message:"Restaurant not found"})
          }

          if(!restaurant.reviews.length){
            return res.status(400).json({message:"No reviews to analyze"})
          }

          const aiData = await analyzeReviewsWithAI(restaurant.reviews, `restaurant:${id}`, "restaurant");

          restaurant.reviewSentiment = aiData.sentiment;
          restaurant.reviewSummaryBullets = aiData.summaryBullets;
          restaurant.reviewTopMentions = aiData.topMentions;

          await restaurant.save();
          res.status(200).json({success:true, aiData})
    }catch(error){
        res.status(500).json({message:error.message})
    }
})

exports.getRestaurantReviewSummary = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const restaurant = await Restaurant.findById(id);

  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

  if (restaurant.reviewSummaryBullets?.length || restaurant.reviewSentiment) {
    return res.status(200).json({
      success: true,
      cached: true,
      aiData: {
        sentiment: restaurant.reviewSentiment,
        summaryBullets: restaurant.reviewSummaryBullets || [],
        topMentions: restaurant.reviewTopMentions || [],
      },
    });
  }

  const aiData = await analyzeReviewsWithAI(
    restaurant.reviews,
    `restaurant:${id}`,
    "restaurant",
  );

  restaurant.reviewSentiment = aiData.sentiment;
  restaurant.reviewSummaryBullets = aiData.summaryBullets;
  restaurant.reviewTopMentions = aiData.topMentions;
  await restaurant.save();

  res.status(200).json({ success: true, aiData });
});

exports.getFoodReviewSummary = catchAsync(async (req, res) => {
  const { id } = req.params;
  const food = await FoodItem.findById(id);

  if (!food) return res.status(404).json({ message: "Food item not found" });

  if (food.reviewSummaryBullets?.length || food.reviewSentiment) {
    return res.status(200).json({
      success: true,
      cached: true,
      aiData: {
        sentiment: food.reviewSentiment,
        summaryBullets: food.reviewSummaryBullets || [],
        topMentions: food.reviewTopMentions || [],
      },
    });
  }

  const aiData = await analyzeReviewsWithAI(
    food.reviews,
    `food:${id}`,
    "food item",
  );

  food.reviewSentiment = aiData.sentiment;
  food.reviewSummaryBullets = aiData.summaryBullets;
  food.reviewTopMentions = aiData.topMentions;
  await food.save();

  res.status(200).json({ success: true, aiData });
});



exports.addReview = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { name, rating, Comment } = req.body;

  const restaurant = await Restaurant.findById(id);

  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: "Restaurant not found",
    });
  }

  // Add Review
  restaurant.reviews.push({
    name,
    rating,
    Comment,
  });

  // Update Review Count
  restaurant.numOfReviews =
    restaurant.reviews.length;

  // Update Average Rating
  const totalRatings =
    restaurant.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );

  restaurant.ratings =
    totalRatings / restaurant.reviews.length;

  // Invalidate the persisted summary when the review set changes.
  restaurant.reviewSentiment = undefined;
  restaurant.reviewSummaryBullets = [];
  restaurant.reviewTopMentions = [];

  await restaurant.save();

  res.status(200).json({
    success: true,
    message: "Review Added Successfully",
    restaurant,
  });
});

exports.deleteRestaurantReview = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new ErrorHandler("Restaurant not found", 404));

  const review = restaurant.reviews.id(req.params.reviewId);
  if (!review) return next(new ErrorHandler("Review not found", 404));

  restaurant.reviews.pull(req.params.reviewId);
  restaurant.numOfReviews = restaurant.reviews.length;
  restaurant.ratings = restaurant.numOfReviews
    ? restaurant.reviews.reduce((sum, item) => sum + item.rating, 0) / restaurant.numOfReviews
    : 0;
  restaurant.reviewSentiment = undefined;
  restaurant.reviewSummaryBullets = [];
  restaurant.reviewTopMentions = [];
  await restaurant.save();

  res.status(200).json({ success: true, restaurant });
});

exports.deleteFoodReview = catchAsync(async (req, res, next) => {
  const food = await FoodItem.findById(req.params.id);
  if (!food) return next(new ErrorHandler("Food item not found", 404));

  const review = food.reviews.id(req.params.reviewId);
  if (!review) return next(new ErrorHandler("Review not found", 404));

  food.reviews.pull(req.params.reviewId);
  food.numOfReviews = food.reviews.length;
  food.ratings = food.numOfReviews
    ? food.reviews.reduce((sum, item) => sum + item.rating, 0) / food.numOfReviews
    : 0;
  food.reviewSentiment = undefined;
  food.reviewSummaryBullets = [];
  food.reviewTopMentions = [];
  await food.save();

  res.status(200).json({ success: true, foodItem: food });
});
