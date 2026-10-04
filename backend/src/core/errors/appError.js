class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // to be handled by the global error handler, safe to send to the client, not a programming error.

    Error.captureStackTrace(this, this.constructor);   // capture stack trace, excluding the constructor call from it and shows where the error was instantiated
  }
}

module.exports = AppError;
