const Restaurant = require("./models/restaurant.model");
const FoodItem = require("./models/foodItem.model");
const Menu = require("./models/menu.model");
const APIFeatures = require("../../core/utils/apiFeatures");
const AppError = require("../../core/errors/appError");
const { getStorageProvider } = require("../../providers/storage");

class CatalogueService {
  async getAllRestaurants(queryStr) {
    const keyword = queryStr.keyword?.trim();
    let query = Restaurant.find();
    let foodItems = [];

    if (keyword) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape special characters such as . * + ? ^ $ { } ( ) | [ ] \ to prevent regex injection and replace them with \\
      const pattern = new RegExp(escapedKeyword, "i");

      // Search matching food items
      const matchingFoodItems = await FoodItem.find({ name: pattern })
        .populate("restaurant", "name address")
        .sort({ name: 1 })
        .lean(); // it returns a plain JavaScript object instead of a Mongoose document, which can be more efficient for read operations and allows for easier manipulation of the data without the overhead of Mongoose's document methods.

      // Resolve unlinked food items via direct indexed query
      const unlinkedFoodIds = matchingFoodItems
        .filter((item) => !item.restaurant) //returns a new array containing only the food items
        .map((item) => item._id);  //returns a new array containing only the _id values

      if (unlinkedFoodIds.length) {
        const menuLinks = await Menu.find({ "menu.items": { $in: unlinkedFoodIds } })
          .populate("restaurant", "name address")
          .select("restaurant menu"); //returns a new array containing only the _id values

        // Map food item IDs to their respective restaurants and update matchingFoodItems.
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

      // This query will return restaurants that match the keyword in their name or address, or have food items that match the keyword.
      query = query.find({
        $or: [{ name: pattern }, { address: pattern }, { _id: { $in: foodRestaurantIds } }],
      });
    }

    const apiFeatures = new APIFeatures(query, queryStr).sort();
    const restaurants = await apiFeatures.query;

    return {
      count: restaurants.length,
      restaurants,
      foodItems,
    };
  }

  async getRestaurantCount() {
    return Restaurant.countDocuments();
  }

  async getRestaurantById(storeId) {
    const restaurant = await Restaurant.findById(storeId);
    if (!restaurant) {
      throw new AppError("No Restaurant found with that ID", 404);
    }
    return restaurant;
  }

  async createRestaurant(payload) {
    const { name, address, isVeg, location, image, imageUrl, images: providedImages } = payload;
    const body = { name, address, isVeg, location };

    let images = [];
    if (providedImages && Array.isArray(providedImages) && providedImages.length > 0) {
      images = providedImages;
    } else if (image || imageUrl) {
      const rawImg = image || imageUrl;
      const storage = getStorageProvider();
      const uploaded = await storage.uploadImage(rawImg, {
        folder: "restaurants",
        fallbackPublicId: "restaurant_" + Date.now(),
      });
      images = [{ public_id: uploaded.publicId, url: uploaded.url }];
    } else {
      images = [
        {
          public_id: "default_store",
          url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
        },
      ];
    }

    body.images = images;
    return Restaurant.create(body);
  }

  async deleteRestaurant(storeId) {
    const restaurant = await Restaurant.findByIdAndDelete(storeId);
    if (!restaurant) {
      throw new AppError("No Restaurant found with that ID", 404);
    }
    return true;
  }

  // Menus
  async getAllMenus(storeId) {
    const filter = storeId ? { restaurant: storeId } : {};
    return Menu.find(filter).populate("menu.items");
  }

  async createMenu(storeId, menuArray = []) {
    return Menu.create({
      restaurant: storeId,
      menu: Array.isArray(menuArray) ? menuArray : [],
    });
  }

  async deleteMenu(menuId) {
    const menu = await Menu.findByIdAndDelete(menuId);
    if (!menu) {
      throw new AppError("No menu found with that ID", 404);
    }
    return true;
  }

  async addItemToMenu(menuId, category, foodItemId) {
    if (!menuId) throw new AppError("Menu ID is required", 400);

    const menu = await Menu.findById(menuId);
    if (!menu) throw new AppError("Menu not found", 404);
    if (!menu.restaurant) throw new AppError("Menu is not linked to a restaurant", 400);

    const foodItem = await FoodItem.findById(foodItemId);
    if (!foodItem) throw new AppError("Food item not found", 404);

    let cat = menu.menu.find((c) => c.category === category);
    if (!cat) {
      cat = { category, items: [] };
      menu.menu.push(cat);
    }

    cat.items.push(foodItemId);
    await menu.save();

    // Auto-heal direct restaurant link
    if (!foodItem.restaurant || foodItem.restaurant.toString() !== menu.restaurant.toString()) {
      foodItem.restaurant = menu.restaurant;
      await foodItem.save();
    }

    await menu.populate("menu.items");
    return menu;
  }

  // Food Items
  async getAllFoodItems(storeId) {
    const filter = storeId ? { restaurant: storeId } : {};
    return FoodItem.find(filter).populate("restaurant");
  }

  async getFoodItemById(foodId) {
    const foodItem = await FoodItem.findById(foodId).populate("restaurant", "name address");
    if (!foodItem) {
      throw new AppError("No foodItem found with that ID", 404);
    }

    const foodItemObj = foodItem.toObject();

    // If restaurant is missing, auto-heal via direct indexed lookup (No full collection scan!)
    if (!foodItemObj.restaurant) {
      const menu = await Menu.findOne({ "menu.items": foodItem._id }).populate(
        "restaurant",
        "name address",
      );

      if (menu?.restaurant) {
        foodItemObj.restaurant = menu.restaurant;
        const targetRestId = menu.restaurant._id || menu.restaurant;
        await FoodItem.findByIdAndUpdate(foodItem._id, { restaurant: targetRestId });
      }
    }

    return foodItemObj;
  }

  async createFoodItem(payload) {
    const {
      name,
      price,
      description,
      category,
      stock,
      restaurant,
      menu,
      image,
      imageUrl,
      images: providedImages,
    } = payload;

    const body = { name, price, description, category, stock, restaurant, menu };

    let images = [];
    if (providedImages && Array.isArray(providedImages) && providedImages.length > 0) {
      images = providedImages;
    } else if (image || imageUrl) {
      const rawImg = image || imageUrl;
      const storage = getStorageProvider();
      const uploaded = await storage.uploadImage(rawImg, {
        folder: "food_items",
        fallbackPublicId: "food_" + Date.now(),
      });
      images = [{ public_id: uploaded.publicId, url: uploaded.url }];
    } else {
      images = [
        {
          public_id: "default_food",
          url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
        },
      ];
    }

    body.images = images;
    const fooditem = await FoodItem.create(body);

    if (body.restaurant) {
      let menuDoc = await Menu.findOne({ restaurant: body.restaurant });
      const categoryName = body.category || "Recommended";
      if (!menuDoc) {
        await Menu.create({
          restaurant: body.restaurant,
          menu: [{ category: categoryName, items: [fooditem._id] }],
        });
      } else {
        let cat = menuDoc.menu.find(
          (c) => c.category && c.category.toLowerCase() === categoryName.toLowerCase(),
        );
        if (!cat) {
          menuDoc.menu.push({ category: categoryName, items: [fooditem._id] });
        } else {
          cat.items.push(fooditem._id);
        }
        await menuDoc.save();
      }
    }

    return fooditem;
  }

  async updateFoodItem(foodId, updates) {
    const allowedFields = ["name", "price", "description", "category", "stock", "restaurant", "menu", "images"];
    const sanitizedUpdates = Object.fromEntries(
      allowedFields
        .filter((field) => Object.prototype.hasOwnProperty.call(updates, field))
        .map((field) => [field, updates[field]]),
    );

    const foodItem = await FoodItem.findByIdAndUpdate(foodId, sanitizedUpdates, {
      new: true,
      runValidators: true,
    });

    if (!foodItem) {
      throw new AppError("No document found with that ID", 404);
    }

    return foodItem;
  }

  async deleteFoodItem(foodId) {
    const foodItem = await FoodItem.findByIdAndDelete(foodId);
    if (!foodItem) {
      throw new AppError("No document found with that ID", 404);
    }
    return true;
  }

  async addFoodReview(foodId, { name, rating, Comment }) {
    const foodItem = await FoodItem.findById(foodId);
    if (!foodItem) {
      throw new AppError("No foodItem found with that ID", 404);
    }

    if (!name || !Comment || !rating) {
      throw new AppError("Name, rating, and comment are required", 400);
    }

    const safeRating = Number(rating);
    if (safeRating < 1 || safeRating > 5) {
      throw new AppError("Rating must be between 1 and 5", 400);
    }

    foodItem.reviews.push({ name, rating: safeRating, Comment });
    foodItem.numOfReviews = foodItem.reviews.length;
    foodItem.ratings =
      foodItem.reviews.reduce((total, review) => total + review.rating, 0) / foodItem.numOfReviews;

    // Invalidate stale AI summaries on review change
    foodItem.reviewSentiment = undefined;
    foodItem.reviewSummaryBullets = [];
    foodItem.reviewTopMentions = [];

    await foodItem.save();
    return foodItem;
  }
}

module.exports = new CatalogueService();
