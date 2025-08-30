// utils/performanceOptimizer.js - Comprehensive performance optimization utilities
class PerformanceOptimizer {
  constructor() {
    this.cache = new Map();
    this.metrics = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  // Enhanced caching with TTL and LRU eviction
  static cache = new Map();
  static cacheTTL = new Map();
  static cacheAccess = new Map();
  static maxCacheSize = 1000;
  static defaultTTL = 300000; // 5 minutes

  static set(key, value, ttl = this.defaultTTL) {
    // Clean expired entries
    this.cleanExpiredEntries();
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }

    this.cache.set(key, value);
    this.cacheTTL.set(key, Date.now() + ttl);
    this.cacheAccess.set(key, Date.now());
    
    return value;
  }

  static get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    // Check TTL
    const ttl = this.cacheTTL.get(key);
    if (ttl && Date.now() > ttl) {
      this.delete(key);
      return null;
    }

    // Update access time for LRU
    this.cacheAccess.set(key, Date.now());
    return this.cache.get(key);
  }

  static delete(key) {
    this.cache.delete(key);
    this.cacheTTL.delete(key);
    this.cacheAccess.delete(key);
  }

  static clear() {
    this.cache.clear();
    this.cacheTTL.clear();
    this.cacheAccess.clear();
  }

  static cleanExpiredEntries() {
    const now = Date.now();
    for (const [key, ttl] of this.cacheTTL.entries()) {
      if (ttl && now > ttl) {
        this.delete(key);
      }
    }
  }

  static evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, accessTime] of this.cacheAccess.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  // Memoization decorator
  static memoize(fn, keyGenerator = (...args) => JSON.stringify(args), ttl = this.defaultTTL) {
    return (...args) => {
      const key = `memo_${fn.name}_${keyGenerator(...args)}`;
      const cached = this.get(key);
      
      if (cached !== null) {
        return cached;
      }
      
      const result = fn(...args);
      this.set(key, result, ttl);
      return result;
    };
  }

  // Database query optimization
  static optimizeQuery(model, query = {}, options = {}) {
    // Add indexes hint for common queries
    const optimizedQuery = { ...query };
    const optimizedOptions = { ...options };

    // Add common optimizations
    if (!optimizedOptions.limit && !optimizedOptions.sort) {
      optimizedOptions.limit = 100; // Default limit to prevent large queries
    }

    // Suggest indexes for common query patterns
    if (query.createdAt && !optimizedOptions.sort) {
      optimizedOptions.sort = { createdAt: -1 };
    }

    if (query.userId && !optimizedOptions.hint) {
      optimizedOptions.hint = { userId: 1 };
    }

    return model.find(optimizedQuery, null, optimizedOptions);
  }

  // Batch operations for better performance
  static async batchProcess(items, processor, batchSize = 50) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }
    
    return results;
  }

  // Debounce utility
  static debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  // Throttle utility
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Lazy loading utility
  static createLazyLoader(loader, placeholder = null) {
    let loaded = false;
    let loading = false;
    let data = placeholder;

    return {
      get data() {
        if (!loaded && !loading) {
          loading = true;
          loader().then(result => {
            data = result;
            loaded = true;
            loading = false;
          }).catch(error => {
            console.error('Lazy loading failed:', error);
            loading = false;
          });
        }
        return data;
      },
      get isLoaded() {
        return loaded;
      },
      get isLoading() {
        return loading;
      }
    };
  }

  // Image optimization utilities
  static optimizeImageUrl(url, options = {}) {
    if (!url) return url;
    
    const { width, height, quality = 80, format = 'webp' } = options;
    const params = new URLSearchParams();
    
    if (width) params.append('w', width);
    if (height) params.append('h', height);
    params.append('q', quality);
    params.append('f', format);
    
    // If using a CDN, append optimization parameters
    if (url.includes('cloudinary') || url.includes('imgix')) {
      return `${url}?${params.toString()}`;
    }
    
    return url;
  }

  // Bundle size optimization
  static dynamicImport(modulePath) {
    return this.memoize(
      () => import(modulePath),
      () => modulePath,
      Infinity // Cache forever for dynamic imports
    )();
  }

  // Performance monitoring
  static startTiming(label) {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  }

  // Resource preloading
  static preloadResource(url, type = 'script') {
    if (typeof window === 'undefined') return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    document.head.appendChild(link);
  }

  // Memory usage monitoring
  static getMemoryUsage() {
    if (typeof window === 'undefined' || !window.performance?.memory) {
      return null;
    }
    
    const memory = window.performance.memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    };
  }

  // API request optimization
  static optimizeApiRequest(url, options = {}) {
    const optimizedOptions = {
      ...options,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=300',
        ...options.headers
      }
    };

    // Add request caching
    const cacheKey = `api_${url}_${JSON.stringify(options)}`;
    const cached = this.get(cacheKey);
    
    if (cached) {
      return Promise.resolve(cached);
    }

    return fetch(url, optimizedOptions)
      .then(async response => {
        const data = await response.json();
        if (response.ok) {
          this.set(cacheKey, data, 60000); // Cache for 1 minute
        }
        return data;
      });
  }

  // Virtual scrolling utility
  static createVirtualScrolling(items, itemHeight, containerHeight) {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const bufferSize = Math.floor(visibleCount / 2);
    
    return {
      getVisibleItems: (scrollTop) => {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(
          startIndex + visibleCount + bufferSize * 2,
          items.length
        );
        
        return {
          startIndex: Math.max(0, startIndex - bufferSize),
          endIndex,
          items: items.slice(
            Math.max(0, startIndex - bufferSize),
            endIndex
          )
        };
      },
      getTotalHeight: () => items.length * itemHeight,
      getOffsetY: (startIndex) => startIndex * itemHeight
    };
  }

  // Code splitting utilities
  static createAsyncComponent(importFunc, fallback = null) {
    return {
      component: null,
      loading: false,
      loaded: false,
      error: null,
      
      async load() {
        if (this.loaded || this.loading) return this.component;
        
        this.loading = true;
        try {
          const module = await importFunc();
          this.component = module.default || module;
          this.loaded = true;
          this.loading = false;
          return this.component;
        } catch (error) {
          this.error = error;
          this.loading = false;
          console.error('Async component loading failed:', error);
          return fallback;
        }
      }
    };
  }

  // Service Worker utilities
  static registerServiceWorker(swUrl) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return Promise.resolve(null);
    }

    return navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('SW registered: ', registration);
        return registration;
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
        return null;
      });
  }

  // Cache statistics
  static getCacheStats() {
    return {
      size: this.cache.size,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
      ...this.cacheStats
    };
  }
}

// React-specific optimizations
export const ReactOptimizations = {
  // Prevent unnecessary re-renders
  arePropsEqual: (prevProps, nextProps) => {
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  },

  // Optimize component updates
  shouldComponentUpdate: (prevProps, prevState, nextProps, nextState) => {
    return !ReactOptimizations.arePropsEqual(prevProps, nextProps) ||
           !ReactOptimizations.arePropsEqual(prevState, nextState);
  },

  // Create optimized event handlers
  createOptimizedHandler: (handler, deps = []) => {
    return PerformanceOptimizer.memoize(handler, () => JSON.stringify(deps));
  }
};

// Export convenience functions
export const memoize = PerformanceOptimizer.memoize.bind(PerformanceOptimizer);
export const debounce = PerformanceOptimizer.debounce.bind(PerformanceOptimizer);
export const throttle = PerformanceOptimizer.throttle.bind(PerformanceOptimizer);
export const cache = {
  get: PerformanceOptimizer.get.bind(PerformanceOptimizer),
  set: PerformanceOptimizer.set.bind(PerformanceOptimizer),
  delete: PerformanceOptimizer.delete.bind(PerformanceOptimizer),
  clear: PerformanceOptimizer.clear.bind(PerformanceOptimizer)
};

export default PerformanceOptimizer;