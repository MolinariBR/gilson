import { describe, it, expect } from 'vitest';
import { 
  resolveImageUrl, 
  getImageWithFallback, 
  isValidImagePath, 
  normalizeImagePath 
} from '../imageUtils';

describe('imageUtils', () => {
  const baseUrl = 'http://localhost:4000';

  describe('resolveImageUrl', () => {
    it('should return null for empty or null image path', () => {
      expect(resolveImageUrl(null, baseUrl)).toBe(null);
      expect(resolveImageUrl('', baseUrl)).toBe(null);
      expect(resolveImageUrl(undefined, baseUrl)).toBe(null);
    });

    it('should return full URL as is for http URLs', () => {
      const fullUrl = 'http://example.com/image.jpg';
      expect(resolveImageUrl(fullUrl, baseUrl)).toBe(fullUrl);
    });

    it('should return full URL as is for https URLs', () => {
      const fullUrl = 'https://example.com/image.jpg';
      expect(resolveImageUrl(fullUrl, baseUrl)).toBe(fullUrl);
    });

    it('should prepend base URL for paths starting with /uploads/', () => {
      const imagePath = '/uploads/food/image.jpg';
      const expected = baseUrl + imagePath;
      expect(resolveImageUrl(imagePath, baseUrl)).toBe(expected);
    });

    it('should add /uploads/ prefix and prepend base URL for relative paths', () => {
      const imagePath = 'food/image.jpg';
      const expected = baseUrl + '/uploads/' + imagePath;
      expect(resolveImageUrl(imagePath, baseUrl)).toBe(expected);
    });
  });

  describe('getImageWithFallback', () => {
    it('should return resolved URL when image path is valid', () => {
      const imagePath = '/uploads/food/image.jpg';
      const expected = baseUrl + imagePath;
      expect(getImageWithFallback(imagePath, baseUrl)).toBe(expected);
    });

    it('should return fallback URL when image path is null', () => {
      const expected = baseUrl + '/placeholder.png';
      expect(getImageWithFallback(null, baseUrl)).toBe(expected);
    });

    it('should return custom fallback URL when provided', () => {
      const customFallback = '/custom-placeholder.png';
      const expected = baseUrl + customFallback;
      expect(getImageWithFallback(null, baseUrl, customFallback)).toBe(expected);
    });

    it('should return resolved URL for valid relative path', () => {
      const imagePath = 'food/image.jpg';
      const expected = baseUrl + '/uploads/' + imagePath;
      expect(getImageWithFallback(imagePath, baseUrl)).toBe(expected);
    });
  });

  describe('isValidImagePath', () => {
    it('should return false for null, undefined, or empty strings', () => {
      expect(isValidImagePath(null)).toBe(false);
      expect(isValidImagePath(undefined)).toBe(false);
      expect(isValidImagePath('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidImagePath(123)).toBe(false);
      expect(isValidImagePath({})).toBe(false);
      expect(isValidImagePath([])).toBe(false);
    });

    it('should return true for full HTTP URLs', () => {
      expect(isValidImagePath('http://example.com/image.jpg')).toBe(true);
    });

    it('should return true for full HTTPS URLs', () => {
      expect(isValidImagePath('https://example.com/image.jpg')).toBe(true);
    });

    it('should return true for paths starting with /uploads/', () => {
      expect(isValidImagePath('/uploads/food/image.jpg')).toBe(true);
    });

    it('should return true for relative paths', () => {
      expect(isValidImagePath('food/image.jpg')).toBe(true);
      expect(isValidImagePath('image.jpg')).toBe(true);
    });

    it('should return false for paths with directory traversal', () => {
      expect(isValidImagePath('../../../etc/passwd')).toBe(false);
      expect(isValidImagePath('food/../../../etc/passwd')).toBe(false);
    });
  });

  describe('normalizeImagePath', () => {
    it('should return null for invalid paths', () => {
      expect(normalizeImagePath(null)).toBe(null);
      expect(normalizeImagePath('')).toBe(null);
      expect(normalizeImagePath('../../../etc/passwd')).toBe(null);
    });

    it('should return full URLs as is', () => {
      const httpUrl = 'http://example.com/image.jpg';
      const httpsUrl = 'https://example.com/image.jpg';
      expect(normalizeImagePath(httpUrl)).toBe(httpUrl);
      expect(normalizeImagePath(httpsUrl)).toBe(httpsUrl);
    });

    it('should return /uploads/ paths as is', () => {
      const uploadsPath = '/uploads/food/image.jpg';
      expect(normalizeImagePath(uploadsPath)).toBe(uploadsPath);
    });

    it('should add /uploads/ prefix to relative paths', () => {
      expect(normalizeImagePath('food/image.jpg')).toBe('/uploads/food/image.jpg');
      expect(normalizeImagePath('image.jpg')).toBe('/uploads/image.jpg');
    });
  });
});