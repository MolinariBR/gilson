import { describe, it, expect, beforeEach } from 'vitest';
import CategoryService from '../services/categoryService.js';
import categoryModel from '../models/categoryModel.js';

describe('CategoryService Image URL Consistency', () => {
  let categoryService;

  beforeEach(() => {
    categoryService = new CategoryService();
  });

  describe('processCategoryImageUrls', () => {
    it('should ensure image URLs start with /uploads/', () => {
      const categoryData = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Category',
        slug: 'test-category',
        image: 'category_123456.jpg',
        isActive: true
      };

      const processed = categoryService.processCategoryImageUrls(categoryData);
      
      expect(processed.image).toBe('/uploads/categories/category_123456.jpg');
    });

    it('should not modify image URLs that already start with /uploads/', () => {
      const categoryData = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Category',
        slug: 'test-category',
        image: '/uploads/categories/category_123456.jpg',
        isActive: true
      };

      const processed = categoryService.processCategoryImageUrls(categoryData);
      
      expect(processed.image).toBe('/uploads/categories/category_123456.jpg');
    });

    it('should handle array of categories', () => {
      const categoriesData = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Test Category 1',
          slug: 'test-category-1',
          image: 'category_123456.jpg',
          isActive: true
        },
        {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test Category 2',
          slug: 'test-category-2',
          image: '/uploads/categories/category_789012.jpg',
          isActive: true
        }
      ];

      const processed = categoryService.processCategoryImageUrls(categoriesData);
      
      expect(processed[0].image).toBe('/uploads/categories/category_123456.jpg');
      expect(processed[1].image).toBe('/uploads/categories/category_789012.jpg');
    });

    it('should handle null or undefined image', () => {
      const categoryData = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Category',
        slug: 'test-category',
        image: null,
        isActive: true
      };

      const processed = categoryService.processCategoryImageUrls(categoryData);
      
      expect(processed.image).toBe(null);
    });
  });

  describe('generateCategoryImageUrl', () => {
    it('should generate correct URL for filename', () => {
      const url = categoryService.generateCategoryImageUrl('category_123456.jpg');
      expect(url).toBe('/uploads/categories/category_123456.jpg');
    });

    it('should return existing URL if already starts with /uploads/', () => {
      const url = categoryService.generateCategoryImageUrl('/uploads/categories/category_123456.jpg');
      expect(url).toBe('/uploads/categories/category_123456.jpg');
    });

    it('should return null for empty or null input', () => {
      expect(categoryService.generateCategoryImageUrl(null)).toBe(null);
      expect(categoryService.generateCategoryImageUrl('')).toBe(null);
      expect(categoryService.generateCategoryImageUrl(undefined)).toBe(null);
    });
  });

  describe('Database integration', () => {
    it('should save category with consistent image path', async () => {
      const categoryData = {
        name: 'Test Category',
        originalName: 'Test Category',
        slug: 'test-category',
        image: '/uploads/categories/test_image.jpg',
        isActive: true,
        order: 1
      };

      const category = new categoryModel(categoryData);
      const savedCategory = await category.save();

      expect(savedCategory.image).toBe('/uploads/categories/test_image.jpg');
      expect(savedCategory.image.startsWith('/uploads/')).toBe(true);
    });

    it('should reject category with invalid image path', async () => {
      const categoryData = {
        name: 'Test Category',
        originalName: 'Test Category',
        slug: 'test-category',
        image: 'invalid_path.jpg', // This should fail validation
        isActive: true,
        order: 1
      };

      const category = new categoryModel(categoryData);
      
      await expect(category.save()).rejects.toThrow('Image path must start with /uploads/');
    });
  });
});