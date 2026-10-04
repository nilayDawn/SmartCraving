const { getCacheProvider } = require("../../providers/cache");
const logger = require("../utils/logger");

/**
 * Cache middleware that stores and serves GET responses.
 * @param {number} ttlSeconds - Time to live in seconds (default 300 = 5 min)
 * @param {Function} [keyGenerator] - Optional custom key generator (req) => string
 */
const cacheResponse = (ttlSeconds = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const cache = getCacheProvider();
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `http:${req.originalUrl || req.url}`;

    try {
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        res.setHeader("X-Cache", "HIT");
        return res.status(200).json(cachedData);
      }

      // Cache MISS - intercept res.json to capture response body
      res.setHeader("X-Cache", "MISS");
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        // Only cache successful 200 responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, body, ttlSeconds).catch((err) => {
            logger.error(`[Cache Error] Failed to cache key ${cacheKey}:`, err.message);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      logger.error("[Cache Middleware Error]:", err.message);
      next();
    }
  };
};

/**
 * Invalidate cache patterns (e.g. ['http:/api/v1/eats/stores*', 'http:/api/v1/coupon*'])
 */
const invalidateCache = async (patterns = []) => {
  const cache = getCacheProvider();
  const list = Array.isArray(patterns) ? patterns : [patterns];
  for (const pattern of list) {
    try {
      await cache.delPattern(pattern);
    } catch (err) {
      logger.error(`[Cache Invalidation Error] Failed to invalidate pattern ${pattern}:`, err.message);
    }
  }
};

module.exports = {
  cacheResponse,
  invalidateCache,
};
