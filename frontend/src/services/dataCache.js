/**
 * Data Cache Service
 * Caches CSV data to prevent repeated fetches and improve performance
 * Provides global data store for dashboard and homepage
 */

const CACHE_KEY = 'bda_csv_cache_v1';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

class DataCache {
  constructor() {
    this.cache = this.loadFromStorage();
    this.loading = new Map();
    this.callbacks = new Map();
  }

  /**
   * Load cache from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (!stored) return {};

      const parsed = JSON.parse(stored);
      const now = Date.now();

      // Check if cache is expired
      if (parsed.timestamp && (now - parsed.timestamp) > CACHE_EXPIRY) {
        localStorage.removeItem(CACHE_KEY);
        return {};
      }

      return parsed.data || {};
    } catch (error) {
      console.warn('Failed to load data cache:', error);
      return {};
    }
  }

  /**
   * Save cache to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        timestamp: Date.now(),
        data: this.cache
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save data cache:', error);
    }
  }

  /**
   * Get cached data or fetch if not available
   */
  async getData(key, fetchFn) {
    // Return cached data if available
    if (this.cache[key]) {
      return this.cache[key];
    }

    // Return existing promise if already loading
    if (this.loading.has(key)) {
      return this.loading.get(key);
    }

    // Start loading
    const loadingPromise = this.fetchAndCache(key, fetchFn);
    this.loading.set(key, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      this.loading.delete(key);
    }
  }

  /**
   * Fetch data and cache it
   */
  async fetchAndCache(key, fetchFn) {
    try {
      const data = await fetchFn();
      this.cache[key] = data;
      this.saveToStorage();

      // Notify subscribers
      this.notifyCallbacks(key, data);

      return data;
    } catch (error) {
      console.error(`Failed to fetch data for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to data updates
   */
  subscribe(key, callback) {
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, new Set());
    }
    this.callbacks.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.callbacks.delete(key);
        }
      }
    };
  }

  /**
   * Notify subscribers of data updates
   */
  notifyCallbacks(key, data) {
    const callbacks = this.callbacks.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in data cache callback:', error);
        }
      });
    }
  }

  /**
   * Clear cache (useful for development/testing)
   */
  clearCache() {
    this.cache = {};
    this.loading.clear();
    localStorage.removeItem(CACHE_KEY);
  }

  /**
   * Get cache stats for debugging
   */
  getStats() {
    return {
      cachedKeys: Object.keys(this.cache),
      loadingKeys: Array.from(this.loading.keys()),
      subscriberKeys: Array.from(this.callbacks.keys()),
      cacheSize: JSON.stringify(this.cache).length
    };
  }
}

// Global instance
const dataCache = new DataCache();

export default dataCache;
