const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router({ mergeParams: true });

const {
  getFoodItem,
  createFoodItem,
  getAllFoodItems,
  deleteFoodItem,
  updateFoodItem,
  addFoodReview,
} = require("../controllers/foodItemController");

const { protect } = require("../controllers/authController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");
const reviewLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
router.route("/item").post(protect, authorizeRoles("admin"), createFoodItem);

router.route("/items/:storeId").get(getAllFoodItems);
router.route("/item/:foodId/review").put(reviewLimiter, protect, addFoodReview);
router
  .route("/item/:foodId")
  .get(getFoodItem)
  .patch(protect, authorizeRoles("admin"), updateFoodItem)
  .delete(protect, authorizeRoles("admin"), deleteFoodItem);

module.exports = router;
