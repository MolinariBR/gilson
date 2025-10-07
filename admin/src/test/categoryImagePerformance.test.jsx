/**
 * Tests for admin category image performance optimizations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  isCategoryImage, 
  getCategoryLazyLoadConfig, 
  getCacheOptimizedImageUrl 
} from '../utils/imageUtils';

describe('Admin Category Image Performance Optimizations', () => {
  beforeEach(() => {
    // Clear DOM
    document.head.innerHTML = '';
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
    it('should return admin-optimized config for category images', () => {
      const categoryConfig = getCategoryLazyLoadConfig(true);
      const normalConfig = getCategoryLazyLoadConfig(false);

      // Admin interface should be less aggressive with lazy loading
      expect(categoryConfig.rootMargin).toBe('100px');
      expect(categoryConfig.threshold).toBe(0.1);
      expect(categoryConfig.priority).toBe('high');

      expect(normalConfig.rootMargin).toBe('50px');
      expect(normalConfig.threshold).toBe(0.2);
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

    it('should handle missing categoryId gracefully', () => {
      const imagePath = '/uploads/categories/cat_123_456.jpg';
      const baseUrl = 'http://localhost:4000';

      const result = getCacheOptimizedImageUrl(imagePath, baseUrl);
      
      expect(result).toBe(`${baseUrl}${imagePath}`);
      expect(result).not.toContain('v=');
    });

    it('should handle invalid image paths', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const baseUrl = 'http://localhost:4000';

      expect(getCacheOptimizedImageUrl(null, baseUrl, categoryId)).toBeNull();
      expect(getCacheOptimizedImageUrl('', baseUrl, categoryId)).toBeNull();
      expect(getCacheOptimizedImageUrl(undefined, baseUrl, categoryId)).toBeNull();
    });
  });
});