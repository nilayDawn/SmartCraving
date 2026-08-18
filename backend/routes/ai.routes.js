const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const { protect } = require("../controllers/authController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

// All AI requests can consume provider quota, so rate-limit every AI route.
const aiRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 AI generations per window
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many AI generation requests from this IP. Please try again later.",
  },
});

router.use(aiRequestLimiter);

// AI Food Generation (Admin only)
router.post("/generate-food", protect, authorizeRoles("admin"), aiController.generateFoodAI);
router.post("/generate-food-ai", protect, authorizeRoles("admin"), aiController.generateFoodAI);

// AI Food Generation + Save (Admin Only)
router.post(
  "/generate-food-ai/:foodId",
  protect,
  authorizeRoles("admin"),
  aiController.generateAndSaveFoodAI
);
router.post(
  "/generate-food/:foodId",
  protect,
  authorizeRoles("admin"),
  aiController.generateAndSaveFoodAI
);

// Restaurant Review AI Analytics & Summaries
router.put(
  "/admin/restaurants/:id/analyze",
  protect,
  authorizeRoles("admin"),
  aiController.analyzeRestaurantReviews
);
router.post("/stores/:id/summary", protect, aiController.getRestaurantReviewSummary);
router.post("/items/:id/summary", protect, aiController.getFoodReviewSummary);

// Store Reviews (Protected)
router.put("/stores/:id/review", protect, aiController.addReview);

module.exports = router;
