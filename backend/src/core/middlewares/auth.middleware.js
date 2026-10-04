const jwt = require("jsonwebtoken");
const { promisify } = require("util"); // lets use callback bsed functions as modern async/await functions
const AppError = require("../errors/appError");
const catchAsync = require("../errors/catchAsync");
const env = require("../../config/env");
const { getCacheProvider } = require("../../providers/cache");

// Helper to check if password changed after token was issued (supports both Mongoose instance and cached doc)
const hasPasswordChangedAfter = (user, jwtTimestamp) => {
  if (typeof user.changedPasswordAfter === "function") {
    return user.changedPasswordAfter(jwtTimestamp);
  }
  if (user.passwordChangedAt) {
    const changedTimestamp = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

// Protect routes middleware
const protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("You are not logged in! Please log in to get access.", 401));
  }

  const decoded = await promisify(jwt.verify)(token, env.jwt.secret);

  // Check cache first for user session to eliminate repetitive MongoDB Atlas roundtrips
  const cacheKey = `user:session:${decoded.id}`;
  const cache = getCacheProvider();
  let currentUser = await cache.get(cacheKey);

  if (!currentUser) {
    // Lazy-require User model to avoid circular dependency
    const User = require("../../modules/auth/user.model");
    currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(new AppError("User no longer exists. Please log in again.", 401));
    }

    // Cache user session for 60 seconds
    await cache.set(cacheKey, currentUser, 60);
  }

  if (hasPasswordChangedAfter(currentUser, decoded.iat)) {
    return next(new AppError("User recently changed password! Please log in again.", 401));
  }

  req.user = currentUser;
  next();
});

// Authorize roles middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`Role (${req.user.role}) is not authorized to access this resource`, 403),
      );
    }

    next();
  };
};

module.exports = {
  protect,
  authorizeRoles,
};
