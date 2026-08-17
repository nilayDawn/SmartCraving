const Fooditem = require("../models/foodItem");
const ErrorHandler = require("../utils/errorHandler");
const catchAsync = require("../middlewares/catchAsyncErrors");
const APIFeatures = require("../utils/apiFeatures");
const Menu = require("../models/menu");

exports.getAllFoodItems = catchAsync(async (req, res, next) => {
  let restaurantId = {};
  if (req.params.storeId) {
    restaurantId = { restaurant: req.params.storeId };
  }

  const foodItems = await Fooditem.find(restaurantId).populate("restaurant");
  res.status(200).json({
    status: "success",
    results: foodItems.length,
    data: foodItems,
  });
});

// /v1/eats/stores/{store_id}/menus
exports.createFoodItem = catchAsync(async (req, res, next) => {
  const body = { ...req.body };
  const cloudinary = require("../config/cloudinary");

  let images = [];
  if (body.images && Array.isArray(body.images) && body.images.length > 0) {
    images = body.images;
  } else if (body.image || body.imageUrl) {
    const rawImg = body.image || body.imageUrl;
    let uploadedUrl = rawImg;
    let publicId = "food_" + Date.now();

    if (typeof rawImg === "string" && rawImg.startsWith("data:image")) {
      try {
        const result = await cloudinary.uploader.upload(rawImg, {
          folder: "food_items",
        });
        publicId = result.public_id;
        uploadedUrl = result.secure_url;
      } catch (err) {
        uploadedUrl = rawImg;
      }
    }
    images = [{ public_id: publicId, url: uploadedUrl }];
  } else {
    images = [{ public_id: "default_food", url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" }];
  }

  body.images = images;
  delete body.image;
  delete body.imageUrl;

  const fooditem = await Fooditem.create(body);

  if (body.restaurant) {
    let menuDoc = await Menu.findOne({ restaurant: body.restaurant });
    const categoryName = body.category || "Recommended";
    if (!menuDoc) {
      menuDoc = await Menu.create({
        restaurant: body.restaurant,
        menu: [{ category: categoryName, items: [fooditem._id] }],
      });
    } else {
      let cat = menuDoc.menu.find(
        (c) => c.category && c.category.toLowerCase() === categoryName.toLowerCase()
      );
      if (!cat) {
        menuDoc.menu.push({ category: categoryName, items: [fooditem._id] });
      } else {
        cat.items.push(fooditem._id);
      }
      await menuDoc.save();
    }
  }

  res.status(201).json({
    status: "success",
    data: fooditem,
  });
});

exports.getFoodItem = catchAsync(async (req, res, next) => {
  const foodItem = await Fooditem.findById(req.params.foodId).populate("restaurant", "name address");

  if (!foodItem)
    return next(new ErrorHandler("No foodItem found with that ID", 404));

  if (!foodItem.restaurant) {
    const menu = await Menu.findOne({ "menu.items": foodItem._id }).select("restaurant");
    if (menu?.restaurant) foodItem.restaurant = menu.restaurant;
  }

  res.status(200).json({
    status: "success",
    data: foodItem,
  });
});

exports.addFoodReview = catchAsync(async (req, res, next) => {
  const { name, rating, Comment } = req.body;
  const foodItem = await Fooditem.findById(req.params.foodId);

  if (!foodItem) return next(new ErrorHandler("No foodItem found with that ID", 404));
  if (!name || !Comment || !rating) {
    return next(new ErrorHandler("Name, rating, and comment are required", 400));
  }

  const safeRating = Number(rating);
  if (safeRating < 1 || safeRating > 5) {
    return next(new ErrorHandler("Rating must be between 1 and 5", 400));
  }

  foodItem.reviews.push({ name, rating: safeRating, Comment });
  foodItem.numOfReviews = foodItem.reviews.length;
  foodItem.ratings = foodItem.reviews.reduce((total, review) => total + review.rating, 0) / foodItem.numOfReviews;
  await foodItem.save();

  res.status(201).json({ success: true, data: foodItem });
});

exports.updateFoodItem = catchAsync(async (req, res, next) => {
  const foodItem = await Fooditem.findByIdAndUpdate(
    req.params.foodId,
    req.body,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!foodItem)
    return next(new ErrorHandler("No document found with that ID", 404));

  res.status(200).json({
    status: "success",
    data: foodItem,
  });
});

exports.deleteFoodItem = catchAsync(async (req, res, next) => {
  const foodItem = await Fooditem.findByIdAndDelete(req.params.foodId);

  if (!foodItem)
    return next(new ErrorHandler("No document found with that ID", 404));

  res.status(204).json({
    status: "success",
  });
});
