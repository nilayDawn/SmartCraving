const CacheProviderInterface = require("./cache.interface");

/**
 * In-Memory Cache Provider with TTL and Pattern Deletion
 */
class MemoryCacheProvider extends CacheProviderInterface {
  constructor(maxEntries = 1000) {
    super();
    this.store = new Map(); // Map of { key: { value, expiresAt }}
    this.maxEntries = maxEntries;

    // Background cleanup every 60 seconds to prune expired items
    this.cleanupInterval = setInterval(() => {
      this._purgeExpired();
    }, 60 * 1000);

    // Allow node to exit without being blocked by this timer.Even if your server has finished everything else, this interval is still running, so Node may stay alive.
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

// Purge expired items from the cache
  _purgeExpired() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && item.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

// Get a value from the cache, returning null if not found or expired and delte it from the cache if expired
  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key, value, ttlSeconds = 300) {
    // If cache reached capacity, remove the oldest key (FIFO/LRU-ish eviction)
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return true;
  }

  async del(key) {
    return this.store.delete(key);
  }

  async delPattern(pattern) {
    // pattern can be regex string or prefix like "catalogue:*"
    const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);  // Convert wildcard pattern to regex, i.e. "catalogue:*" becomes /^catalogue:.*$/
    let deletedCount = 0;

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  async flush() {
    this.store.clear();
    return true;
  }
}

module.exports = MemoryCacheProvider;
