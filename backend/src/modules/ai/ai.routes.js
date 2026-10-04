const express = require("express");
const router = express.Router();
const aiController = require("./ai.controller");
const { protect, authorizeRoles } = require("../../core/middlewares/auth.middleware");
const { aiLimiter } = require("../../core/middlewares/rateLimiter.middleware");
const { validateObjectId } = require("../../core/middlewares/validate.middleware");

// Rate limit all AI routes
router.use(aiLimiter);

// AI Food Generation (Admin only)
router.post("/generate-food", protect, authorizeRoles("admin"), aiController.generateFoodAI);
router.post("/generate-food-ai", protect, authorizeRoles("admin"), aiController.generateFoodAI);

// AI Food Generation + Save (Admin only)
router.post(
  "/generate-food-ai/:foodId",
  protect,
  authorizeRoles("admin"),
  validateObjectId("foodId"),
  aiController.generateAndSaveFoodAI,
);
router.post(
  "/generate-food/:foodId",
  protect,
  authorizeRoles("admin"),
  validateObjectId("foodId"),
  aiController.generateAndSaveFoodAI,
);

// Restaurant Review AI Analytics & Summaries
router.put(
  "/admin/restaurants/:id/analyze",
  protect,
  authorizeRoles("admin"),
  validateObjectId("id"),
  aiController.analyzeRestaurantReviews,
);
router.post(
  "/stores/:id/summary",
  protect,
  validateObjectId("id"),
  aiController.getRestaurantReviewSummary,
);
router.post(
  "/items/:id/summary",
  protect,
  validateObjectId("id"),
  aiController.getFoodReviewSummary,
);
router.delete(
  "/stores/:id/reviews/:reviewId",
  protect,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateObjectId("reviewId"),
  aiController.deleteRestaurantReview,
);
router.delete(
  "/items/:id/reviews/:reviewId",
  protect,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateObjectId("reviewId"),
  aiController.deleteFoodReview,
);

// Store Reviews (Protected user)
router.put(
  "/stores/:id/review",
  protect,
  validateObjectId("id"),
  aiController.addReview,
);

module.exports = router;
