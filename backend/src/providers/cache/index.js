const MemoryCacheProvider = require("./memory.provider");

let cacheInstance = null;

const getCacheProvider = () => {
  if (!cacheInstance) {
    // If REDIS_URL is provided in the future, return RedisProvider here.
    cacheInstance = new MemoryCacheProvider();
  }
  return cacheInstance;
};

module.exports = {
  getCacheProvider,
};
