import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import categoryModel from '../models/categoryModel.js';

describe('Category Model Image Validation', () => {
  let testCategoryId;

  beforeEach(async () => {
    // Create a test category ID
    testCategoryId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    // Clean up any test categories
    try {
      await categoryModel.deleteMany({ name: { $regex: /^Test Category/ } });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Image path validation', () => {
    it('should accept valid unique naming format', async () => {
      const categoryData = {
        name: 'Test Category Unique',
        originalName: 'Test Category Unique',
        slug: 'test-category-unique',
        image: `/uploads/categories/cat_${testCategoryId}_1704067200000.jpg`,
        isActive: true,
        order: 1
      };

      const category = new categoryModel(categoryData);
      category._id = testCategoryId; // Set the ID to match the image name
      
      // This should not throw validation errors
      const validationError = category.validateSync();
      expect(validationError).toBeUndefined();
    });

    it('should accept legacy naming format for backward compatibility', async () => {
      const categoryData = {
        name: 'Test Category Legacy',
        originalName: 'Test Category Legacy',
        slug: 'test-category-legacy',
        image: '/uploads/categories/legacy-image_1704067200000.jpg',
        isActive: true,
        order: 1
      };

      const category = new categoryModel(categoryData);
      
      // This should not throw validation errors (legacy format allowed)
      const validationError = category.validateSync();
      expect(validationError).toBeUndefined();
    });

    it('should reject image paths that do not start with /uploads/', () => {
      const categoryData = {
        name: 'Test Category Invalid Path',
        originalName: 'Test Category Invalid Path',
        slug: 'test-category-invalid-path',
        image: 'invalid/path/image.jpg',
        isActive: true,
        order: 1
      };

      const category = new categoryModel(categoryData);
      
      const validationError = category.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.image).toBeDefined();
      expect(validationError.errors.image.message).toContain('must start with /uploads/');
    });

    it('should reject completely invalid image formats', () => {
      const categoryData = {
        name: 'Test Category Invalid Format',
        originalName: 'Test Category Invalid Format',
        slug: 'test-category-invalid-format',
        image: '/uploads/categories/invalid-format',
        isActive: true,
        order: 1
      };

      const category = new categoryModel(categoryData);
      
      const validationError = category.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.image).toBeDefined();
    });

    it('should validate that category ID matches image filename for new categories with unique format', () => {
      const differentCategoryId = new mongoose.Types.ObjectId();
      
      const categoryData = {
        name: 'Test Category ID Mismatch',
        originalName: 'Test Category ID Mismatch',
        slug: 'test-category-id-mismatch',
        image: `/uploads/categories/cat_${differentCategoryId}_1704067200000.jpg`,
        isActive: true,
        order: 1
      };

      const category = new categoryModel(categoryData);
      category._id = testCategoryId; // Different ID than in image name
      
      const validationError = category.validateSync();
      // This should fail validation because the category ID in filename doesn't match
      expect(validationError).toBeDefined();
      expect(validationError.errors.image).toBeDefined();
      expect(validationError.errors.image.message).toContain('unique naming format');
    });

    it('should allow legacy format for backward compatibility', () => {
      const categoryData = {
        name: 'Test Category Legacy Format',
        originalName: 'Test Category Legacy Format', 
        slug: 'test-category-legacy-format',
        image: '/uploads/categories/some-old-image_1704067200000.jpg',
        isActive: true,
        order: 1
      };

      const category = new categoryModel(categoryData);
      category._id = testCategoryId;
      
      // Legacy format should be allowed for backward compatibility
      const validationError = category.validateSync();
      expect(validationError).toBeUndefined();
    });
  });

  describe('Other field validations', () => {
    it('should require all mandatory fields', () => {
      const category = new categoryModel({});
      
      const validationError = category.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.name).toBeDefined();
      expect(validationError.errors.originalName).toBeDefined();
      expect(validationError.errors.slug).toBeDefined();
      expect(validationError.errors.image).toBeDefined();
    });

    it('should validate slug uniqueness constraint', async () => {
      // This test would require database connection to test unique constraint
      // For now, just verify the schema has the unique constraint
      const schema = categoryModel.schema;
      const slugPath = schema.paths.slug;
      
      expect(slugPath.options.unique).toBe(true);
    });

    it('should set default values correctly', () => {
      const categoryData = {
        name: 'Test Category Defaults',
        originalName: 'Test Category Defaults',
        slug: 'test-category-defaults',
        image: '/uploads/categories/test_1704067200000.jpg'
      };

      const category = new categoryModel(categoryData);
      
      expect(category.isActive).toBe(true);
      expect(category.order).toBe(0);
    });
  });
});