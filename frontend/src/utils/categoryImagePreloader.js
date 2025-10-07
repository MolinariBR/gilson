/**
 * Category Image Preloader Utility
 * Optimizes loading of critical category images for better performance
 */

/**
 * Preloads critical category images that are likely to be viewed first
 * @param {Array} categories - Array of category objects
 * @param {string} baseUrl - Base URL for image resolution
 * @param {number} maxPreload - Maximum number of images to preload (default: 3)
 */
export const preloadCriticalCategoryImages = (categories, baseUrl, maxPreload = 3) => {
  if (!categories || !Array.isArray(categories) || !baseUrl) return;

  // Sort categories by order or take first few
  const criticalCategories = categories
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .slice(0, maxPreload);

  criticalCategories.forEach((category, index) => {
    if (category.menu_image || category.image) {
      const imagePath = category.menu_image || category.image;
      
      // Skip if already a full URL
      if (imagePath.startsWith('http')) return;
      
      const imageUrl = imagePath.startsWith('/uploads/') 
        ? `${baseUrl}${imagePath}`
        : `${baseUrl}/uploads/${imagePath}`;

      // Create link element for preloading
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = imageUrl;
      link.fetchPriority = index === 0 ? 'high' : 'low';
      
      // Add to document head
      document.head.appendChild(link);
      
      console.log(`🚀 Preloading critical category image: ${category.name || category.menu_name}`);
    }
  });
};

/**
 * Creates an intersection observer for progressive image loading
 * @param {Function} callback - Callback function when images enter viewport
 * @param {Object} options - Observer options
 * @returns {IntersectionObserver} - The created observer
 */
export const createCategoryImageObserver = (callback, options = {}) => {
  const defaultOptions = {
    rootMargin: '200px 0px', // Load images 200px before they enter viewport
    threshold: 0.01
  };

  const observerOptions = { ...defaultOptions, ...options };

  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, observerOptions);
};

/**
 * Optimizes image loading based on connection speed
 * @returns {Object} - Optimized loading configuration
 */
export const getConnectionOptimizedConfig = () => {
  // Check if Network Information API is available
  if ('connection' in navigator && navigator.connection) {
    const connection = navigator.connection;
    const effectiveType = connection.effectiveType;

    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return {
          preloadCount: 1,
          rootMargin: '50px',
          quality: 'low',
          lazy: true
        };
      case '3g':
        return {
          preloadCount: 2,
          rootMargin: '100px',
          quality: 'medium',
          lazy: true
        };
      case '4g':
      default:
        return {
          preloadCount: 3,
          rootMargin: '200px',
          quality: 'high',
          lazy: true
        };
    }
  }

  // Fallback for browsers without Network Information API
  return {
    preloadCount: 2,
    rootMargin: '150px',
    quality: 'medium',
    lazy: true
  };
};

/**
 * Manages category image cache with localStorage
 */
export class CategoryImageCache {
  constructor() {
    this.cacheKey = 'categoryImageCache';
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Stores image metadata in cache
   * @param {string} categoryId - Category ID
   * @param {Object} imageData - Image metadata
   */
  set(categoryId, imageData) {
    try {
      const cache = this.getCache();
      cache[categoryId] = {
        ...imageData,
        timestamp: Date.now()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to cache category image data:', error);
    }
  }

  /**
   * Retrieves image metadata from cache
   * @param {string} categoryId - Category ID
   * @returns {Object|null} - Cached image data or null
   */
  get(categoryId) {
    try {
      const cache = this.getCache();
      const cached = cache[categoryId];
      
      if (cached && (Date.now() - cached.timestamp) < this.maxAge) {
        return cached;
      }
      
      // Remove expired entry
      if (cached) {
        delete cache[categoryId];
        localStorage.setItem(this.cacheKey, JSON.stringify(cache));
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to retrieve cached category image data:', error);
      return null;
    }
  }

  /**
   * Gets the entire cache object
   * @returns {Object} - Cache object
   */
  getCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('Failed to parse category image cache:', error);
      return {};
    }
  }

  /**
   * Clears expired cache entries
   */
  cleanup() {
    try {
      const cache = this.getCache();
      const now = Date.now();
      let hasChanges = false;

      Object.keys(cache).forEach(key => {
        if ((now - cache[key].timestamp) >= this.maxAge) {
          delete cache[key];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        localStorage.setItem(this.cacheKey, JSON.stringify(cache));
      }
    } catch (error) {
      console.warn('Failed to cleanup category image cache:', error);
    }
  }

  /**
   * Clears all cached data
   */
  clear() {
    try {
      localStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.warn('Failed to clear category image cache:', error);
    }
  }
}

// Export singleton instance
export const categoryImageCache = new CategoryImageCache();