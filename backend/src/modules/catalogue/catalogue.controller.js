const catalogueService = require("./catalogue.service");
const catchAsync = require("../../core/errors/catchAsync");
const { invalidateCache } = require("../../core/middlewares/cache.middleware");

// Restaurants : Gets all restaurants with their menus and food items, with caching
exports.getAllRestaurants = catchAsync(async (req, res, next) => {
  const result = await catalogueService.getAllRestaurants(req.query);
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120"); // Cache for 1 minute, allow stale data for 2 minutes
  res.status(200).json({
    status: "success",
    count: result.count,
    restaurants: result.restaurants,
    foodItems: result.foodItems,
  });
});

exports.getRestaurantCount = catchAsync(async (req, res, next) => {
  const count = await catalogueService.getRestaurantCount();
  res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=300"); 
  res.status(200).json({
    success: true,
    count,
  });
});

exports.createRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await catalogueService.createRestaurant(req.body);
  await invalidateCache(["*eats/stores*", "*restaurants/count*"]);
  res.status(201).json({
    status: "success",
    data: restaurant,
  });
});

exports.getRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await catalogueService.getRestaurantById(req.params.storeId);
  res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
  res.status(200).json({
    status: "success",
    data: restaurant,
  });
});

exports.deleteRestaurant = catchAsync(async (req, res, next) => {
  await catalogueService.deleteRestaurant(req.params.storeId);
  await invalidateCache(["*eats/stores*", "*restaurants/count*"]);
  res.status(204).json({
    status: "success",
  });
});

// Menus
exports.getAllMenus = catchAsync(async (req, res, next) => {
  const menus = await catalogueService.getAllMenus(req.params.storeId);
  res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
  res.status(200).json({
    status: "success",
    count: menus.length,
    data: menus,
  });
});

exports.createMenu = catchAsync(async (req, res, next) => {
  const storeId = req.params.storeId || req.body.restaurant;
  const menu = await catalogueService.createMenu(storeId, req.body.menu);
  await invalidateCache(["*menus*", "*stores*"]);
  res.status(201).json({
    status: "success",
    data: menu,
  });
});

exports.deleteMenu = catchAsync(async (req, res, next) => {
  await catalogueService.deleteMenu(req.params.menuId);
  await invalidateCache(["*menus*", "*stores*"]);
  res.status(204).json({
    status: "success",
  });
});

exports.addItemToMenu = catchAsync(async (req, res, next) => {
  const { category, foodItemId } = req.body;
  const menu = await catalogueService.addItemToMenu(req.params.menuId, category, foodItemId);
  await invalidateCache(["*menus*", "*stores*"]);
  res.status(200).json({
    status: "success",
    data: menu,
  });
});

// Food Items
exports.getAllFoodItems = catchAsync(async (req, res, next) => {
  const foodItems = await catalogueService.getAllFoodItems(req.params.storeId);
  res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
  res.status(200).json({
    status: "success",
    results: foodItems.length,
    data: foodItems,
  });
});

exports.getFoodItem = catchAsync(async (req, res, next) => {
  const foodItem = await catalogueService.getFoodItemById(req.params.foodId);
  res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
  res.status(200).json({
    status: "success",
    data: foodItem,
  });
});

exports.createFoodItem = catchAsync(async (req, res, next) => {
  const foodItem = await catalogueService.createFoodItem(req.body);
  await invalidateCache(["*items*", "*menus*", "*stores*"]);
  res.status(201).json({
    status: "success",
    data: foodItem,
  });
});

exports.updateFoodItem = catchAsync(async (req, res, next) => {
  const foodItem = await catalogueService.updateFoodItem(req.params.foodId, req.body);
  await invalidateCache(["*items*", "*menus*", "*stores*"]);
  res.status(200).json({
    status: "success",
    data: foodItem,
  });
});

exports.deleteFoodItem = catchAsync(async (req, res, next) => {
  await catalogueService.deleteFoodItem(req.params.foodId);
  await invalidateCache(["*items*", "*menus*", "*stores*"]);
  res.status(204).json({
    status: "success",
  });
});

exports.addFoodReview = catchAsync(async (req, res, next) => {
  const foodItem = await catalogueService.addFoodReview(req.params.foodId, req.body);
  await invalidateCache([`*item/${req.params.foodId}*`]);
  res.status(201).json({
    success: true,
    data: foodItem,
  });
});
