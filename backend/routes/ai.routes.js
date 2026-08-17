const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");


// router.post("/generate-food-ai", aiController.generateFoodAI);
router.get("/test", (req, res) => {
  res.send("AI route working");
});
// router.post(
//   "/generate-food-ai/:foodId",
//   aiController.generateAndSaveFoodAI
// );

// GENERATE ONLY
router.post("/generate-food-ai", aiController.generateFoodAI);

// GENERATE + SAVE
router.post("/generate-food-ai/:foodId", (req, res, next) => {
  console.log("FOOD ID:", req.params.foodId);
  next();
}, aiController.generateAndSaveFoodAI);

//analyzer
router.put("/admin/restaurants/:id/analyze", aiController.analyzeRestaurantReviews)




// const restaurantController = require(
//   "../controllers/restaurant.controller"
// );

router.put(
  "/stores/:id/review",
  aiController.addReview
);



module.exports = router;