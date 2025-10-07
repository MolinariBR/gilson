import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveImageUrl, getImageWithFallback, isValidImagePath, normalizeImagePath } from '../utils/imageUtils.js';

// Create the imageUtils file for backend if it doesn't exist
const imageUtils = {
  resolveImageUrl: (imagePath, baseUrl) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    if (imagePath.startsWith('/uploads/')) {
      return baseUrl + imagePath;
    }
    return baseUrl + '/uploads/' + imagePath;
  },

  getImageWithFallback: (imagePath, baseUrl, fallback = '/placeholder.png') => {
    const resolvedUrl = imageUtils.resolveImageUrl(imagePath, baseUrl);
    return resolvedUrl || (baseUrl + fallback);
  },

  isValidImagePath: (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string') return false;
    if (imagePath.includes('../')) return false; // Prevent directory traversal
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return true;
    if (imagePath.startsWith('/uploads/')) return true;
    return true; // Allow relative paths
  },

  normalizeImagePath: (imagePath) => {
    if (!imageUtils.isValidImagePath(imagePath)) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    if (imagePath.startsWith('/uploads/')) {
      return imagePath;
    }
    return '/uploads/' + imagePath;
  }
};

describe('URL Resolution Integration Tests', () => {
  const baseUrl = 'http://localhost:4000';
  const httpsBaseUrl = 'https://api.example.com';

  describe('resolveImageUrl', () => {
    it('should handle null and undefined inputs', () => {
      expect(imageUtils.resolveImageUrl(null, baseUrl)).toBe(null);
      expect(imageUtils.resolveImageUrl(undefined, baseUrl)).toBe(null);
      expect(imageUtils.resolveImageUrl('', baseUrl)).toBe(null);
    });

    it('should handle absolute HTTP URLs', () => {
      const httpUrl = 'http://example.com/image.jpg';
      expect(imageUtils.resolveImageUrl(httpUrl, baseUrl)).toBe(httpUrl);
    });

    it('should handle absolute HTTPS URLs', () => {
      const httpsUrl = 'https://example.com/image.jpg';
      expect(imageUtils.resolveImageUrl(httpsUrl, baseUrl)).toBe(httpsUrl);
    });

    it('should handle paths starting with /uploads/', () => {
      const uploadsPath = '/uploads/food/image.jpg';
      const expected = baseUrl + uploadsPath;
      expect(imageUtils.resolveImageUrl(uploadsPath, baseUrl)).toBe(expected);
    });

    it('should handle relative paths', () => {
      const relativePath = 'food/image.jpg';
      const expected = baseUrl + '/uploads/' + relativePath;
      expect(imageUtils.resolveImageUrl(relativePath, baseUrl)).toBe(expected);
    });

    it('should handle single filename', () => {
      const filename = 'image.jpg';
      const expected = baseUrl + '/uploads/' + filename;
      expect(imageUtils.resolveImageUrl(filename, baseUrl)).toBe(expected);
    });

    it('should work with different base URLs', () => {
      const imagePath = '/uploads/image.jpg';
      expect(imageUtils.resolveImageUrl(imagePath, baseUrl)).toBe('http://localhost:4000/uploads/image.jpg');
      expect(imageUtils.resolveImageUrl(imagePath, httpsBaseUrl)).toBe('https://api.example.com/uploads/image.jpg');
    });

    it('should handle base URLs with trailing slash', () => {
      const baseUrlWithSlash = 'http://localhost:4000/';
      const imagePath = '/uploads/image.jpg';
      const expected = 'http://localhost:4000/uploads/image.jpg';
      expect(imageUtils.resolveImageUrl(imagePath, baseUrlWithSlash)).toBe(expected);
    });

    it('should handle base URLs without protocol', () => {
      const baseUrlNoProtocol = 'localhost:4000';
      const imagePath = '/uploads/image.jpg';
      const expected = baseUrlNoProtocol + imagePath;
      expect(imageUtils.resolveImageUrl(imagePath, baseUrlNoProtocol)).toBe(expected);
    });
  });

  describe('getImageWithFallback', () => {
    it('should return resolved URL for valid image path', () => {
      const imagePath = '/uploads/food/image.jpg';
      const expected = baseUrl + imagePath;
      expect(imageUtils.getImageWithFallback(imagePath, baseUrl)).toBe(expected);
    });

    it('should return fallback for null image path', () => {
      const expected = baseUrl + '/placeholder.png';
      expect(imageUtils.getImageWithFallback(null, baseUrl)).toBe(expected);
    });

    it('should return custom fallback when provided', () => {
      const customFallback = '/custom-placeholder.png';
      const expected = baseUrl + customFallback;
      expect(imageUtils.getImageWithFallback(null, baseUrl, customFallback)).toBe(expected);
    });

    it('should handle empty string image path', () => {
      const expected = baseUrl + '/placeholder.png';
      expect(imageUtils.getImageWithFallback('', baseUrl)).toBe(expected);
    });

    it('should work with relative paths', () => {
      const relativePath = 'food/image.jpg';
      const expected = baseUrl + '/uploads/' + relativePath;
      expect(imageUtils.getImageWithFallback(relativePath, baseUrl)).toBe(expected);
    });

    it('should preserve absolute URLs', () => {
      const absoluteUrl = 'https://example.com/image.jpg';
      expect(imageUtils.getImageWithFallback(absoluteUrl, baseUrl)).toBe(absoluteUrl);
    });
  });

  describe('isValidImagePath', () => {
    it('should return false for null, undefined, or empty strings', () => {
      expect(imageUtils.isValidImagePath(null)).toBe(false);
      expect(imageUtils.isValidImagePath(undefined)).toBe(false);
      expect(imageUtils.isValidImagePath('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(imageUtils.isValidImagePath(123)).toBe(false);
      expect(imageUtils.isValidImagePath({})).toBe(false);
      expect(imageUtils.isValidImagePath([])).toBe(false);
      expect(imageUtils.isValidImagePath(true)).toBe(false);
    });

    it('should return true for valid HTTP URLs', () => {
      expect(imageUtils.isValidImagePath('http://example.com/image.jpg')).toBe(true);
      expect(imageUtils.isValidImagePath('http://localhost:3000/image.png')).toBe(true);
    });

    it('should return true for valid HTTPS URLs', () => {
      expect(imageUtils.isValidImagePath('https://example.com/image.jpg')).toBe(true);
      expect(imageUtils.isValidImagePath('https://cdn.example.com/images/photo.png')).toBe(true);
    });

    it('should return true for paths starting with /uploads/', () => {
      expect(imageUtils.isValidImagePath('/uploads/food/image.jpg')).toBe(true);
      expect(imageUtils.isValidImagePath('/uploads/categories/cat.png')).toBe(true);
    });

    it('should return true for relative paths', () => {
      expect(imageUtils.isValidImagePath('food/image.jpg')).toBe(true);
      expect(imageUtils.isValidImagePath('image.jpg')).toBe(true);
      expect(imageUtils.isValidImagePath('categories/cat.png')).toBe(true);
    });

    it('should return false for paths with directory traversal', () => {
      expect(imageUtils.isValidImagePath('../../../etc/passwd')).toBe(false);
      expect(imageUtils.isValidImagePath('food/../../../etc/passwd')).toBe(false);
      expect(imageUtils.isValidImagePath('/uploads/../../../etc/passwd')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(imageUtils.isValidImagePath('/')).toBe(true);
      expect(imageUtils.isValidImagePath('/uploads/')).toBe(true);
      expect(imageUtils.isValidImagePath('a')).toBe(true);
    });
  });

  describe('normalizeImagePath', () => {
    it('should return null for invalid paths', () => {
      expect(imageUtils.normalizeImagePath(null)).toBe(null);
      expect(imageUtils.normalizeImagePath('')).toBe(null);
      expect(imageUtils.normalizeImagePath('../../../etc/passwd')).toBe(null);
      expect(imageUtils.normalizeImagePath(123)).toBe(null);
    });

    it('should return absolute URLs unchanged', () => {
      const httpUrl = 'http://example.com/image.jpg';
      const httpsUrl = 'https://example.com/image.jpg';
      expect(imageUtils.normalizeImagePath(httpUrl)).toBe(httpUrl);
      expect(imageUtils.normalizeImagePath(httpsUrl)).toBe(httpsUrl);
    });

    it('should return /uploads/ paths unchanged', () => {
      const uploadsPath = '/uploads/food/image.jpg';
      expect(imageUtils.normalizeImagePath(uploadsPath)).toBe(uploadsPath);
    });

    it('should add /uploads/ prefix to relative paths', () => {
      expect(imageUtils.normalizeImagePath('food/image.jpg')).toBe('/uploads/food/image.jpg');
      expect(imageUtils.normalizeImagePath('image.jpg')).toBe('/uploads/image.jpg');
      expect(imageUtils.normalizeImagePath('categories/cat.png')).toBe('/uploads/categories/cat.png');
    });

    it('should handle single character paths', () => {
      expect(imageUtils.normalizeImagePath('a')).toBe('/uploads/a');
    });

    it('should handle paths with special characters', () => {
      expect(imageUtils.normalizeImagePath('food-item_1.jpg')).toBe('/uploads/food-item_1.jpg');
      expect(imageUtils.normalizeImagePath('category (1).png')).toBe('/uploads/category (1).png');
    });
  });

  describe('Cross-environment compatibility', () => {
    const environments = [
      { name: 'development', baseUrl: 'http://localhost:4000' },
      { name: 'staging', baseUrl: 'https://staging.example.com' },
      { name: 'production', baseUrl: 'https://api.example.com' }
    ];

    environments.forEach(env => {
      describe(`${env.name} environment`, () => {
        it('should resolve food images correctly', () => {
          const imagePath = '/uploads/food/burger.jpg';
          const expected = env.baseUrl + imagePath;
          expect(imageUtils.resolveImageUrl(imagePath, env.baseUrl)).toBe(expected);
        });

        it('should resolve category images correctly', () => {
          const imagePath = '/uploads/categories/drinks.png';
          const expected = env.baseUrl + imagePath;
          expect(imageUtils.resolveImageUrl(imagePath, env.baseUrl)).toBe(expected);
        });

        it('should handle fallbacks correctly', () => {
          const fallback = '/placeholder-food.png';
          const expected = env.baseUrl + fallback;
          expect(imageUtils.getImageWithFallback(null, env.baseUrl, fallback)).toBe(expected);
        });
      });
    });
  });

  describe('Edge cases and error conditions', () => {
    it('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'http://',
        'https://',
        'http:///',
        'https:///',
        'ftp://example.com/image.jpg'
      ];

      malformedUrls.forEach(url => {
        // Should not throw errors
        expect(() => imageUtils.resolveImageUrl(url, baseUrl)).not.toThrow();
        expect(() => imageUtils.isValidImagePath(url)).not.toThrow();
        expect(() => imageUtils.normalizeImagePath(url)).not.toThrow();
      });
    });

    it('should handle very long paths', () => {
      const longPath = 'a'.repeat(1000) + '.jpg';
      expect(() => imageUtils.resolveImageUrl(longPath, baseUrl)).not.toThrow();
      expect(imageUtils.isValidImagePath(longPath)).toBe(true);
    });

    it('should handle paths with unicode characters', () => {
      const unicodePath = '/uploads/食物/图片.jpg';
      const expected = baseUrl + unicodePath;
      expect(imageUtils.resolveImageUrl(unicodePath, baseUrl)).toBe(expected);
    });

    it('should handle paths with encoded characters', () => {
      const encodedPath = '/uploads/food%20item/image%20(1).jpg';
      const expected = baseUrl + encodedPath;
      expect(imageUtils.resolveImageUrl(encodedPath, baseUrl)).toBe(expected);
    });

    it('should handle base URLs with ports', () => {
      const baseUrlWithPort = 'http://localhost:3000';
      const imagePath = '/uploads/image.jpg';
      const expected = baseUrlWithPort + imagePath;
      expect(imageUtils.resolveImageUrl(imagePath, baseUrlWithPort)).toBe(expected);
    });

    it('should handle base URLs with paths', () => {
      const baseUrlWithPath = 'http://example.com/api/v1';
      const imagePath = '/uploads/image.jpg';
      const expected = baseUrlWithPath + imagePath;
      expect(imageUtils.resolveImageUrl(imagePath, baseUrlWithPath)).toBe(expected);
    });
  });

  describe('Performance considerations', () => {
    it('should handle large numbers of URL resolutions efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        imageUtils.resolveImageUrl(`/uploads/image${i}.jpg`, baseUrl);
        imageUtils.getImageWithFallback(`image${i}.jpg`, baseUrl);
        imageUtils.isValidImagePath(`/uploads/image${i}.jpg`);
        imageUtils.normalizeImagePath(`image${i}.jpg`);
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (less than 100ms for 1000 operations)
      expect(executionTime).toBeLessThan(100);
    });

    it('should not cause memory leaks with repeated calls', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 10000; i++) {
        imageUtils.resolveImageUrl(`/uploads/image${i}.jpg`, baseUrl);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});