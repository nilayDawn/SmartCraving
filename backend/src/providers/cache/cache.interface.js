/**
 * Cache Provider Interface
 * All caching backends (Memory, Redis, Memcached) must implement this contract.
 */
class CacheProviderInterface {
  async get(key) {
    throw new Error("Method 'get(key)' must be implemented.");
  }

  async set(key, value, ttlSeconds) {
    throw new Error("Method 'set(key, value, ttlSeconds)' must be implemented.");
  }

  async del(key) {
    throw new Error("Method 'del(key)' must be implemented.");
  }

  async delPattern(pattern) {
    throw new Error("Method 'delPattern(pattern)' must be implemented.");
  }

  async flush() {
    throw new Error("Method 'flush()' must be implemented.");
  }
}

module.exports = CacheProviderInterface;
