const validator = require("validator");
const AppError = require("../errors/appError");

/**
 * Validates whether a specific request parameter is a valid MongoDB ObjectId.
 */
const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const val = req.params[paramName];
    if (!val || !validator.isMongoId(String(val))) {
      return next(new AppError(`Invalid identifier format for '${paramName}'. Must be a valid 24-character hexadecimal ID.`, 400));
    }
    next();
  };
};

/**
 * Validates user signup payload.
 */
const validateSignup = (req, res, next) => {
  const { name, email, password, passwordConfirm, phoneNumber } = req.body || {};

  if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50) {
    return next(new AppError("Name must be between 2 and 50 characters.", 400));
  }

  if (!email || typeof email !== "string" || !validator.isEmail(email.trim())) {
    return next(new AppError("Please provide a valid email address.", 400));
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return next(new AppError("Password must be at least 6 characters long.", 400));
  }

  if (passwordConfirm && password !== passwordConfirm) {
    return next(new AppError("Passwords do not match.", 400));
  }

  if (phoneNumber && typeof phoneNumber === "string") {
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
    if (!validator.isNumeric(cleanPhone) || cleanPhone.length < 9 || cleanPhone.length > 15) {
      return next(new AppError("Please provide a valid phone number.", 400));
    }
  }

  // Normalize email
  req.body.email = email.trim().toLowerCase();
  req.body.name = name.trim();

  next();
};

/**
 * Validates user login payload.
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== "string" || !validator.isEmail(email.trim())) {
    return next(new AppError("Please provide a valid email address.", 400));
  }

  if (!password || typeof password !== "string" || password.length === 0) {
    return next(new AppError("Please provide your password.", 400));
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validates forgot password payload.
 */
const validateForgotPassword = (req, res, next) => {
  const { email } = req.body || {};

  if (!email || typeof email !== "string" || !validator.isEmail(email.trim())) {
    return next(new AppError("Please provide a valid email address.", 400));
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validates reset password payload.
 */
const validateResetPassword = (req, res, next) => {
  const { password, passwordConfirm } = req.body || {};

  if (!password || typeof password !== "string" || password.length < 6) {
    return next(new AppError("Password must be at least 6 characters long.", 400));
  }

  if (passwordConfirm && password !== passwordConfirm) {
    return next(new AppError("Passwords do not match.", 400));
  }

  next();
};

/**
 * Validates add-to-cart payload.
 */
const validateAddToCart = (req, res, next) => {
  const { foodItemId, restaurantId, quantity } = req.body || {};

  if (!foodItemId || !validator.isMongoId(String(foodItemId))) {
    return next(new AppError("Invalid or missing foodItemId.", 400));
  }

  if (restaurantId && !validator.isMongoId(String(restaurantId))) {
    return next(new AppError("Invalid restaurantId format.", 400));
  }

  if (quantity !== undefined) {
    const num = Number(quantity);
    if (!Number.isInteger(num) || num < 1 || num > 50) {
      return next(new AppError("Quantity must be an integer between 1 and 50.", 400));
    }
  }

  next();
};

/**
 * Validates update-cart-item payload.
 */
const validateUpdateCart = (req, res, next) => {
  const { foodItemId, quantity } = req.body || {};

  if (!foodItemId || !validator.isMongoId(String(foodItemId))) {
    return next(new AppError("Invalid or missing foodItemId.", 400));
  }

  const num = Number(quantity);
  if (!Number.isInteger(num) || num < 1 || num > 50) {
    return next(new AppError("Quantity must be an integer between 1 and 50.", 400));
  }

  next();
};

/**
 * Validates new order payload.
 */
const validateCreateOrder = (req, res, next) => {
  const { orderItems, deliveryInfo, finalTotal, restaurant } = req.body || {};

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return next(new AppError("Order must contain at least one item.", 400));
  }

  for (const item of orderItems) {
    const itemId = item.fooditem || item.foodItem || item._id;
    if (!itemId || !validator.isMongoId(String(itemId))) {
      return next(new AppError("Each order item must reference a valid fooditem ID.", 400));
    }
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return next(new AppError("Item quantity must be a positive integer.", 400));
    }
  }

  if (!deliveryInfo || typeof deliveryInfo !== "object") {
    return next(new AppError("Delivery information is required.", 400));
  }

  const { address, city, phoneNo, postalCode } = deliveryInfo;
  if (!address || typeof address !== "string" || address.trim().length < 3) {
    return next(new AppError("Please provide a valid delivery address.", 400));
  }
  if (!city || typeof city !== "string" || city.trim().length < 2) {
    return next(new AppError("Please provide a valid city.", 400));
  }
  if (!phoneNo || typeof phoneNo !== "string" || phoneNo.trim().length < 7) {
    return next(new AppError("Please provide a valid contact phone number.", 400));
  }
  if (!postalCode || typeof postalCode !== "string" || postalCode.trim().length < 3) {
    return next(new AppError("Please provide a valid postal code.", 400));
  }

  if (restaurant && !validator.isMongoId(String(restaurant))) {
    return next(new AppError("Invalid restaurant identifier format.", 400));
  }

  next();
};

/**
 * Validates coupon validation payload.
 */
const validateCoupon = (req, res, next) => {
  const { couponCode, code } = req.body || {};
  const target = couponCode || code;

  if (!target || typeof target !== "string" || target.trim().length < 2 || target.trim().length > 30) {
    return next(new AppError("Coupon code must be between 2 and 30 characters.", 400));
  }

  if (!validator.isAlphanumeric(target.trim())) {
    return next(new AppError("Coupon code must be alphanumeric.", 400));
  }

  if (req.body.couponCode) req.body.couponCode = target.trim().toUpperCase();
  if (req.body.code) req.body.code = target.trim().toUpperCase();

  next();
};

/**
 * Validates review submission payload.
 */
const validateFoodReview = (req, res, next) => {
  const { rating, comment } = req.body || {};

  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    return next(new AppError("Review rating must be a number between 1 and 5.", 400));
  }

  if (!comment || typeof comment !== "string" || comment.trim().length < 2 || comment.trim().length > 1000) {
    return next(new AppError("Review comment must be between 2 and 1000 characters.", 400));
  }

  req.body.comment = comment.trim();
  next();
};

module.exports = {
  validateObjectId,
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateAddToCart,
  validateUpdateCart,
  validateCreateOrder,
  validateCoupon,
  validateFoodReview,
};
