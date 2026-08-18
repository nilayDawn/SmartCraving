const Restaurant = require("../models/restaurant");
const FoodItem = require("../models/foodItem");
const Menu = require("../models/menu");
const ErrorHandler = require("../utils/errorHandler");
const catchAsync = require("../middlewares/catchAsyncErrors");
const APIFeatures = require("../utils/apiFeatures");

exports.getAllRestaurants = catchAsync(async (req, res, next) => {
  const keyword = req.query.keyword?.trim();
  let query = Restaurant.find();
  let foodItems = [];

  if (keyword) {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escapedKeyword, "i");
    const matchingFoodItems = await FoodItem.find({ name: pattern })
      .populate("restaurant", "name address")
      .sort({ name: 1 })
      .lean();

    const unlinkedFoodIds = matchingFoodItems
      .filter((item) => !item.restaurant)
      .map((item) => item._id);
    if (unlinkedFoodIds.length) {
      const menuLinks = await Menu.find({ "menu.items": { $in: unlinkedFoodIds } })
        .populate("restaurant", "name address")
        .select("restaurant menu");
      const restaurantByFoodId = new Map();
      menuLinks.forEach((menuDoc) => {
        menuDoc.menu.forEach((category) => {
          category.items.forEach((foodId) => {
            if (!restaurantByFoodId.has(foodId.toString())) {
              restaurantByFoodId.set(foodId.toString(), menuDoc.restaurant);
            }
          });
        });
      });
      matchingFoodItems.forEach((item) => {
        const rest = restaurantByFoodId.get(item._id.toString());
        if (rest) item.restaurant = rest;
      });
    }

    foodItems = matchingFoodItems;
    const foodRestaurantIds = matchingFoodItems
      .map((item) => item.restaurant?._id || item.restaurant)
      .filter(Boolean);

    query = query.find({
      $or: [{ name: pattern }, { address: pattern }, { _id: { $in: foodRestaurantIds } }],
    });
  }

  const apiFeatures = new APIFeatures(query, req.query).sort();
  const restaurants = await apiFeatures.query;
  res.status(200).json({
    status: "success",
    count: restaurants.length,
    restaurants: restaurants,
    foodItems,
  });
});

exports.createRestaurant = catchAsync(async (req, res, next) => {
  const { name, address, isVeg, location, image, imageUrl, images: providedImages } = req.body;
  const body = { name, address, isVeg, location, image, imageUrl, images: providedImages };

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
