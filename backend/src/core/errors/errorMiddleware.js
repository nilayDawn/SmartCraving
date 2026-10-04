const AppError = require("./appError");

module.exports = (err, req, res, next) => {
  // Normalize known errors first
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Invalid Mongoose ObjectID
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    error = new AppError(message, 400);
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors || {})
      .map((val) => val.message)
      .join(", ");
    error = new AppError(message, 400);
  }

  // Mongoose / MongoDB Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const message =
      field.toLowerCase() === "email"
        ? "An account with this email already exists. Please log in instead."
        : `${field.charAt(0).toUpperCase() + field.slice(1)} is already in use. Please use another value.`;
    error = new AppError(message, 409);
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    const message = "JSON Web Token is invalid. Please log in again.";
    error = new AppError(message, 401);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Your session has expired. Please log in again.";
    error = new AppError(message, 401);
  }

  const statusCode = error.statusCode || 500;
  const isDev = process.env.NODE_ENV?.toUpperCase() === "DEVELOPMENT";

  const response = {
    success: false,
    message: error.message || "Internal Server Error",
    errMessage: error.message || "Internal Server Error",
  };

  // Only attach technical stack trace in development for unhandled 500 server crashes.
  // Never expose internal stack traces or database errors for client/operational errors or in production.
  if (isDev && !error.isOperational) {
    response.stack = err.stack;
    response.error = err;
  }

  return res.status(statusCode).json(response);
};
