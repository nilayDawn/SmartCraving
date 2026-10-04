const express = require("express");
const router = express.Router({ mergeParams: true });
const catalogueController = require("./catalogue.controller");
const { protect, authorizeRoles } = require("../../core/middlewares/auth.middleware");
const { reviewLimiter } = require("../../core/middlewares/rateLimiter.middleware");
const {
  validateObjectId,
  validateFoodReview,
} = require("../../core/middlewares/validate.middleware");
const { cacheResponse } = require("../../core/middlewares/cache.middleware");

// Restaurant Count
router.get(
  "/restaurants/count",
  cacheResponse(600), // Cache for 10 minutes
  catalogueController.getRestaurantCount,
);

// Restaurant Routes
router
  .route("/stores")
  .get(cacheResponse(300), catalogueController.getAllRestaurants)
  .post(protect, authorizeRoles("admin"), catalogueController.createRestaurant);

router
  .route("/stores/:storeId")
  .get(
    validateObjectId("storeId"),
    cacheResponse(300),
    catalogueController.getRestaurant,
  )
  .delete(
    protect,
    authorizeRoles("admin"),
    validateObjectId("storeId"),
    catalogueController.deleteRestaurant,
  );

// Restaurant Menus Sub-routes
router
  .route("/stores/:storeId/menus")
  .get(
    validateObjectId("storeId"),
    cacheResponse(300),
    catalogueController.getAllMenus,
  )
  .post(
    protect,
    authorizeRoles("admin"),
    validateObjectId("storeId"),
    catalogueController.createMenu,
  );

router
  .route("/stores/:storeId/menus/:menuId/addItem")
  .patch(
    protect,
    authorizeRoles("admin"),
    validateObjectId("storeId"),
    validateObjectId("menuId"),
    catalogueController.addItemToMenu,
  );

router
  .route("/stores/:storeId/menus/:menuId")
  .delete(
    protect,
    authorizeRoles("admin"),
    validateObjectId("storeId"),
    validateObjectId("menuId"),
    catalogueController.deleteMenu,
  );

// Standalone Menu Routes (/menus)
router
  .route("/menus")
  .get(cacheResponse(300), catalogueController.getAllMenus)
  .post(protect, authorizeRoles("admin"), catalogueController.createMenu);

router
  .route("/menus/:menuId/addItem")
  .patch(
    protect,
    authorizeRoles("admin"),
    validateObjectId("menuId"),
    catalogueController.addItemToMenu,
  );

router
  .route("/menus/:menuId")
  .delete(
    protect,
    authorizeRoles("admin"),
    validateObjectId("menuId"),
    catalogueController.deleteMenu,
  );

// Food Item Routes
router
  .route("/item")
  .post(protect, authorizeRoles("admin"), catalogueController.createFoodItem);

router
  .route("/items/:storeId")
  .get(
    validateObjectId("storeId"),
    cacheResponse(300),
    catalogueController.getAllFoodItems,
  );

router
  .route("/item/:foodId/review")
  .put(
    validateObjectId("foodId"),
    reviewLimiter,
    protect,
    validateFoodReview,
    catalogueController.addFoodReview,
  );

router
  .route("/item/:foodId")
  .get(
    validateObjectId("foodId"),
    cacheResponse(300),
    catalogueController.getFoodItem,
  )
  .patch(
    protect,
    authorizeRoles("admin"),
    validateObjectId("foodId"),
    catalogueController.updateFoodItem,
  )
  .delete(
    protect,
    authorizeRoles("admin"),
    validateObjectId("foodId"),
    catalogueController.deleteFoodItem,
  );

module.exports = router;
