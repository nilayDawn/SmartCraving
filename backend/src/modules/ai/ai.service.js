const Restaurant = require("../catalogue/models/restaurant.model");
const FoodItem = require("../catalogue/models/foodItem.model");
const AppError = require("../../core/errors/appError");
const { getAIProvider } = require("../../providers/ai");
const { getCacheProvider } = require("../../providers/cache");

// In-Memory cache for AI Review sentiment analysis
const reviewSentimentCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Compute a hash of the reviews for cache key generation. This ensures that if the reviews change, the hash will change, and a new analysis will be performed.
const computeReviewsHash = (reviews = []) => {
  if (!reviews || !reviews.length) return "empty";
  const signature = reviews
    .map((r) => `${r.name || ""}_${r.rating || 0}_${(r.Comment || "").trim()}`)
    .sort()
    .join("||");

  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    const char = signature.charCodeAt(i); // Get the Unicode value of the character
    hash = (hash << 5) - hash + char; // Left shift hash by 5 bits and subtract the original hash, then add the character code
    hash |= 0; // Convert to 32-bit integer
  }
  return `hash_${hash}`;
};

class AIService {
  async generateFoodAI({ name, category, spiceLevel, price }) {
    if (typeof name !== "string" || !name.trim() || name.length > 100) {
      throw new AppError("Please enter the Dish Name before generating AI description.", 400);
    }

    const aiProvider = getAIProvider();
    return aiProvider.generateDishMetadata({
      name,
      category: category || "Main Course",
      spiceLevel: spiceLevel || "Medium",
      price: price || 10,
    });
  }

  async generateAndSaveFoodAI(foodId) {
    const food = await FoodItem.findById(foodId);
    if (!food) {
      throw new AppError("Food item not found", 404);
    }

    const aiData = await this.generateFoodAI({
      name: food.name,
      category: food.category || "Veg",
      spiceLevel: food.spiceLevel || "Medium",
      price: food.price,
    });

    food.aiDescription = aiData.description;
    food.aiTags = aiData.tags;
    food.aiAllergens = aiData.allergens;
    food.aiServes = aiData.serves;
    food.aiBestFor = aiData.bestFor;
    await food.save();

    return aiData;
  }

  async _getCachedOrAnalyzedReviews(reviews, cacheKey, subject) {
    const fullKey = `${cacheKey}:${computeReviewsHash(reviews)}`;
    const cached = reviewSentimentCache.get(fullKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }

    const aiProvider = getAIProvider();
    const result = await aiProvider.analyzeReviews(reviews, subject);

    reviewSentimentCache.set(fullKey, {
      result,
      timestamp: Date.now(),
    });

    return result;
  }

  async analyzeRestaurantReviews(restaurantId) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }

    if (!restaurant.reviews.length) {
      throw new AppError("No reviews to analyze", 400);
    }

    const aiData = await this._getCachedOrAnalyzedReviews(
      restaurant.reviews,
      `restaurant:${restaurantId}`,
      "restaurant",
    );

    restaurant.reviewSentiment = aiData.sentiment;
    restaurant.reviewSummaryBullets = aiData.summaryBullets;
    restaurant.reviewTopMentions = aiData.topMentions;
    await restaurant.save();

    return aiData;
  }

  async getRestaurantReviewSummary(restaurantId) {
    const cache = getCacheProvider();
    const cacheKey = `ai:summary:store:${restaurantId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return {
        cached: true,
        aiData: cached,
      };
    }

    const restaurant = await Restaurant.findById(
      restaurantId,
      "reviewSentiment reviewSummaryBullets reviewTopMentions reviews",
    ).lean();
    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }

    if (restaurant.reviewSummaryBullets?.length || restaurant.reviewSentiment) {
      const aiData = {
        sentiment: restaurant.reviewSentiment,
        summaryBullets: restaurant.reviewSummaryBullets || [],
        topMentions: restaurant.reviewTopMentions || [],
      };
      await cache.set(cacheKey, aiData, 3600);
      return {
        cached: true,
        aiData,
      };
    }

    const aiData = await this._getCachedOrAnalyzedReviews(
      restaurant.reviews,
      `restaurant:${restaurantId}`,
      "restaurant",
    );

    await Restaurant.updateOne(
      { _id: restaurantId },
      {
        reviewSentiment: aiData.sentiment,
        reviewSummaryBullets: aiData.summaryBullets,
        reviewTopMentions: aiData.topMentions,
      },
    );

    await cache.set(cacheKey, aiData, 3600);

    return { cached: false, aiData };
  }

  async getFoodReviewSummary(foodId) {
    const cache = getCacheProvider();
    const cacheKey = `ai:summary:food:${foodId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return {
        cached: true,
        aiData: cached,
      };
    }

    const food = await FoodItem.findById(
      foodId,
      "reviewSentiment reviewSummaryBullets reviewTopMentions reviews",
    ).lean();
    if (!food) {
      throw new AppError("Food item not found", 404);
    }

    if (food.reviewSummaryBullets?.length || food.reviewSentiment) {
      const aiData = {
        sentiment: food.reviewSentiment,
        summaryBullets: food.reviewSummaryBullets || [],
        topMentions: food.reviewTopMentions || [],
      };
      await cache.set(cacheKey, aiData, 3600);
      return {
        cached: true,
        aiData,
      };
    }

    const aiData = await this._getCachedOrAnalyzedReviews(
      food.reviews,
      `food:${foodId}`,
      "food item",
    );

    await FoodItem.updateOne(
      { _id: foodId },
      {
        reviewSentiment: aiData.sentiment,
        reviewSummaryBullets: aiData.summaryBullets,
        reviewTopMentions: aiData.topMentions,
      },
    );

    await cache.set(cacheKey, aiData, 3600);

    return { cached: false, aiData };
  }

  async addStoreReview(restaurantId, { name, rating, Comment }) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }

    restaurant.reviews.push({ name, rating, Comment });
    restaurant.numOfReviews = restaurant.reviews.length;
    restaurant.ratings =
      restaurant.reviews.reduce((sum, r) => sum + r.rating, 0) / restaurant.numOfReviews;

    // Invalidate cached summary
    restaurant.reviewSentiment = undefined;
    restaurant.reviewSummaryBullets = [];
    restaurant.reviewTopMentions = [];

    await restaurant.save();
    await getCacheProvider().del(`ai:summary:store:${restaurantId}`);
    return restaurant;
  }

  async deleteRestaurantReview(restaurantId, reviewId) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }

    const review = restaurant.reviews.id(reviewId);
    if (!review) {
      throw new AppError("Review not found", 404);
    }

    restaurant.reviews.pull(reviewId);
    restaurant.numOfReviews = restaurant.reviews.length;
    restaurant.ratings = restaurant.numOfReviews
      ? restaurant.reviews.reduce((sum, item) => sum + item.rating, 0) / restaurant.numOfReviews
      : 0;

    restaurant.reviewSentiment = undefined;
    restaurant.reviewSummaryBullets = [];
    restaurant.reviewTopMentions = [];
    await restaurant.save();
    await getCacheProvider().del(`ai:summary:store:${restaurantId}`);

    return restaurant;
  }

  async deleteFoodReview(foodId, reviewId) {
    const food = await FoodItem.findById(foodId);
    if (!food) {
      throw new AppError("Food item not found", 404);
    }

    const review = food.reviews.id(reviewId);
    if (!review) {
      throw new AppError("Review not found", 404);
    }

    food.reviews.pull(reviewId);
    food.numOfReviews = food.reviews.length;
    food.ratings = food.numOfReviews
      ? food.reviews.reduce((sum, item) => sum + item.rating, 0) / food.numOfReviews
      : 0;

    food.reviewSentiment = undefined;
    food.reviewSummaryBullets = [];
    food.reviewTopMentions = [];
    await food.save();
    await getCacheProvider().del(`ai:summary:food:${foodId}`);

    return food;
  }
}

module.exports = new AIService();
