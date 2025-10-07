/**
 * Tests for category image performance optimizations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  isCategoryImage, 
  getCategoryLazyLoadConfig, 
  getCacheOptimizedImageUrl 
} from '../utils/imageUtils';
import { 
  preloadCriticalCategoryImages,
  getConnectionOptimizedConfig,
  CategoryImageCache
} from '../utils/categoryImagePreloader';

describe('Category Image Performance Optimizations', () => {
  beforeEach(() => {
    // Clear DOM
    document.head.innerHTML = '';
    
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isCategoryImage', () => {
    it('should identify category images correctly', () => {
      expect(isCategoryImage('/uploads/categories/cat_123_456.jpg')).toBe(true);
      expect(isCategoryImage('/uploads/categories/category_test.png')).toBe(true);
      expect(isCategoryImage('cat_507f1f77bcf86cd799439011_1704067200000.jpg')).toBe(true);
      expect(isCategoryImage('/uploads/food/food_123.jpg')).toBe(false);
      expect(isCategoryImage('/uploads/other/image.png')).toBe(false);
      expect(isCategoryImage(null)).toBe(false);
    });
  });

  describe('getCategoryLazyLoadConfig', () => {
    it('should return optimized config for category images', () => {
      const categoryConfig = getCategoryLazyLoadConfig(true);
      const normalConfig = getCategoryLazyLoadConfig(false);

      expect(categoryConfig.rootMargin).toBe('200px');
      expect(categoryConfig.threshold).toBe(0.05);
      expect(categoryConfig.priority).toBe('high');

      expect(normalConfig.rootMargin).toBe('100px');
      expect(normalConfig.threshold).toBe(0.1);
      expect(normalConfig.priority).toBe('normal');
    });
  });

  describe('getCacheOptimizedImageUrl', () => {
    it('should add cache parameter for category images', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const imagePath = '/uploads/categories/cat_507f1f77bcf86cd799439011_1704067200000.jpg';
      const baseUrl = 'http://localhost:4000';

      const result = getCacheOptimizedImageUrl(imagePath, baseUrl, categoryId);
      
      expect(result).toContain('v=99439011'); // Last 8 chars of categoryId
      expect(result).toContain(baseUrl);
    });

    it('should not add cache parameter for non-category images', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const imagePath = '/uploads/food/food_123.jpg';
      const baseUrl = 'http://localhost:4000';

      const result = getCacheOptimizedImageUrl(imagePath, baseUrl, categoryId);
      
      expect(result).not.toContain('v=');
      expect(result).toBe(`${baseUrl}${imagePath}`);
    });
  });

  describe('preloadCriticalCategoryImages', () => {
    it('should create preload links for critical categories', () => {
      const categories = [
        { _id: '1', menu_image: '/uploads/categories/cat_1.jpg', menu_name: 'Category 1', order: 1 },
        { _id: '2', menu_image: '/uploads/categories/cat_2.jpg', menu_name: 'Category 2', order: 2 },
        { _id: '3', menu_image: '/uploads/categories/cat_3.jpg', menu_name: 'Category 3', order: 3 },
        { _id: '4', menu_image: '/uploads/categories/cat_4.jpg', menu_name: 'Category 4', order: 4 }
      ];
      const baseUrl = 'http://localhost:4000';

      preloadCriticalCategoryImages(categories, baseUrl, 2);

      const preloadLinks = document.head.querySelectorAll('link[rel="preload"]');
      expect(preloadLinks).toHaveLength(2);
      
      expect(preloadLinks[0].href).toBe('http://localhost:4000/uploads/categories/cat_1.jpg');
      expect(preloadLinks[0].fetchPriority).toBe('high');
      
      expect(preloadLinks[1].href).toBe('http://localhost:4000/uploads/categories/cat_2.jpg');
      expect(preloadLinks[1].fetchPriority).toBe('low');
    });

    it('should handle categories without images gracefully', () => {
      const categories = [
        { _id: '1', menu_name: 'Category 1', order: 1 }, // No image
        { _id: '2', menu_image: '/uploads/categories/cat_2.jpg', menu_name: 'Category 2', order: 2 }
      ];
      const baseUrl = 'http://localhost:4000';

      preloadCriticalCategoryImages(categories, baseUrl, 2);

      const preloadLinks = document.head.querySelectorAll('link[rel="preload"]');
      expect(preloadLinks).toHaveLength(1); // Only one category has an image
    });
  });

  describe('getConnectionOptimizedConfig', () => {
    it('should return default config when Network Information API is not available', () => {
      // Mock navigator without connection
      const originalNavigator = global.navigator;
      global.navigator = {};

      const config = getConnectionOptimizedConfig();
      
      expect(config.preloadCount).toBe(2);
      expect(config.rootMargin).toBe('150px');
      expect(config.quality).toBe('medium');

      // Restore original navigator
      global.navigator = originalNavigator;
    });

    it('should return optimized config for slow connections', () => {
      // Mock slow connection
      Object.defineProperty(global.navigator, 'connection', {
        value: { effectiveType: '2g' },
        configurable: true
      });

      const config = getConnectionOptimizedConfig();
      
      expect(config.preloadCount).toBe(1);
      expect(config.rootMargin).toBe('50px');
      expect(config.quality).toBe('low');
    });

    it('should return optimized config for fast connections', () => {
      // Mock fast connection
      Object.defineProperty(global.navigator, 'connection', {
        value: { effectiveType: '4g' },
        configurable: true
      });

      const config = getConnectionOptimizedConfig();
      
      expect(config.preloadCount).toBe(3);
      expect(config.rootMargin).toBe('200px');
      expect(config.quality).toBe('high');
    });
  });

  describe('CategoryImageCache', () => {
    let cache;

    beforeEach(() => {
      cache = new CategoryImageCache();
    });

    it('should store and retrieve cache data', () => {
      const categoryId = 'test-category-id';
      const imageData = { imagePath: '/test.jpg', loadTime: Date.now() };

      // Mock localStorage.getItem to return empty cache initially
      global.localStorage.getItem.mockReturnValue('{}');
      
      cache.set(categoryId, imageData);
      
      expect(global.localStorage.setItem).toHaveBeenCalled();
      
      // Mock localStorage.getItem to return the cached data
      const cachedData = {
        [categoryId]: {
          ...imageData,
          timestamp: Date.now()
        }
      };
      global.localStorage.getItem.mockReturnValue(JSON.stringify(cachedData));
      
      const retrieved = cache.get(categoryId);
      expect(retrieved).toBeTruthy();
      expect(retrieved.imagePath).toBe(imageData.imagePath);
    });

    it('should return null for expired cache entries', () => {
      const categoryId = 'test-category-id';
      const expiredData = {
        [categoryId]: {
          imagePath: '/test.jpg',
          timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
        }
      };
      
      global.localStorage.getItem.mockReturnValue(JSON.stringify(expiredData));
      
      const retrieved = cache.get(categoryId);
      expect(retrieved).toBeNull();
    });

    it('should cleanup expired entries', () => {
      const now = Date.now();
      const cacheData = {
        'valid': { timestamp: now - (1000 * 60 * 60) }, // 1 hour ago
        'expired': { timestamp: now - (25 * 60 * 60 * 1000) } // 25 hours ago
      };
      
      global.localStorage.getItem.mockReturnValue(JSON.stringify(cacheData));
      
      cache.cleanup();
      
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'categoryImageCache',
        JSON.stringify({ 'valid': cacheData.valid })
      );
    });

    it('should handle localStorage errors gracefully', () => {
      global.localStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const result = cache.get('test-id');
      expect(result).toBeNull();
      
      // Should not throw
      expect(() => cache.set('test-id', {})).not.toThrow();
      expect(() => cache.cleanup()).not.toThrow();
    });
  });
});