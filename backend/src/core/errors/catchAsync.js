// Wraps async route handlers to eliminate repetitive try/catch boilerplate.
// Express 4 doesn't catch async errors automatically—Promise.resolve().catch(next)
// ensures any rejected Promise or thrown error is piped directly into the global error handler.

module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
