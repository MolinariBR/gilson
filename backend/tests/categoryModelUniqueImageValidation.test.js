import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import categoryModel from '../models/categoryModel.js';

describe('Category Model - Unique Image Validation', () => {
  let testCategoryId;

  beforeEach(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    }
    
    // Clean up any existing test data
    await categoryModel.deleteMany({ name: /^Test Category/ });
    
    // Create a test category ID
    testCategoryId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    // Clean up test data
    await categoryModel.deleteMany({ name: /^Test Category/ });
  });

  describe('Static validation methods', () => {
    it('should validate correct image paths', () => {
      const validPaths = [
        '/uploads/categories/cat_507f1f77bcf86cd799439011_1704067200000.jpg',
        '/uploads/categories/image_1704067200000.png',
        '/uploads/image_1704067200000.webp'
      ];

      validPaths.forEach(path => {
        const result = categoryModel.validateImagePath(path);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid image paths', () => {
      const invalidPaths = [
        '',
        null,
        undefined,
        '/invalid/path/image.jpg',
        '/uploads/categories/image.txt',
        '/uploads/categories/../../../etc/passwd',
        '/uploads/categories/image<script>.jpg'
      ];

      invalidPaths.forEach(path => {
        const result = categoryModel.validateImagePath(path);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should validate unique image naming format', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      
      // Valid unique format
      const validUnique = `/uploads/categories/cat_${categoryId}_1704067200000.jpg`;
      const result1 = categoryModel.validateUniqueImageNaming(validUnique, categoryId);
      expect(result1.valid).toBe(true);
      expect(result1.isUniqueFormat).toBe(true);

      // Valid legacy format
      const validLegacy = '/uploads/categories/image_1704067200000.jpg';
      const result2 = categoryModel.validateUniqueImageNaming(validLegacy, categoryId);
      expect(result2.valid).toBe(true);
      expect(result2.isUniqueFormat).toBe(false);

      // Invalid format
      const invalid = '/uploads/categories/wrongformat.jpg';
      const result3 = categoryModel.validateUniqueImageNaming(invalid, categoryId);
      expect(result3.valid).toBe(false);
      expect(result3.error).toBeDefined();
    });

    it('should reject unique format with wrong category ID', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const wrongCategoryId = '507f1f77bcf86cd799439012';
      
      const imagePath = `/uploads/categories/cat_${wrongCategoryId}_1704067200000.jpg`;
      const result = categoryModel.validateUniqueImageNaming(imagePath, categoryId);
      expect(result.valid).toBe(false);
    });
  });

  describe('Instance methods', () => {
    it('should generate expected unique image name', () => {
      const category = new categoryModel({
        _id: testCategoryId,
        name: 'Test Category',
        originalName: 'Test Category',
        slug: 'test-category',
        image: '/uploads/categories/temp.jpg'
      });

      const expectedName = category.generateExpectedImageName('original.jpg');
      expect(expectedName).toMatch(new RegExp(`^cat_${testCategoryId}_\\d+\\.jpg$`));
    });

    it('should throw error when generating name without ID', () => {
      const category = new categoryModel({
        name: 'Test Category',
        originalName: 'Test Category',
        slug: 'test-category',
        image: '/uploads/categories/temp.jpg'
      });

      // Explicitly set _id to null to test the error case
      category._id = null;

      expect(() => {
        category.generateExpectedImageName('original.jpg');
      }).toThrow('Category must have an ID to generate unique image name');
    });
  });

  describe('Schema validation', () => {
    it('should accept valid unique image format', async () => {
      const category = new categoryModel({
        _id: testCategoryId,
        name: 'Test Category Valid',
        originalName: 'Test Category Valid',
        slug: 'test-category-valid',
        image: `/uploads/categories/cat_${testCategoryId}_1704067200000.jpg`
      });

      const validationError = category.validateSync();
      expect(validationError).toBeUndefined();
    });

    it('should accept legacy image format for backward compatibility', async () => {
      const category = new categoryModel({
        _id: testCategoryId,
        name: 'Test Category Legacy',
        originalName: 'Test Category Legacy',
        slug: 'test-category-legacy',
        image: '/uploads/categories/legacy_image_1704067200000.jpg'
      });

      const validationError = category.validateSync();
      expect(validationError).toBeUndefined();
    });

    it('should reject invalid image extensions', () => {
      const category = new categoryModel({
        _id: testCategoryId,
        name: 'Test Category Invalid Ext',
        originalName: 'Test Category Invalid Ext',
        slug: 'test-category-invalid-ext',
        image: '/uploads/categories/image.txt'
      });

      const validationError = category.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.image).toBeDefined();
    });

    it('should reject path traversal attempts', () => {
      const category = new categoryModel({
        _id: testCategoryId,
        name: 'Test Category Path Traversal',
        originalName: 'Test Category Path Traversal',
        slug: 'test-category-path-traversal',
        image: '/uploads/categories/../../../etc/passwd'
      });

      const validationError = category.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.image).toBeDefined();
    });

    it('should reject unique format with wrong category ID', () => {
      const wrongCategoryId = new mongoose.Types.ObjectId();
      const category = new categoryModel({
        _id: testCategoryId,
        name: 'Test Category Wrong ID',
        originalName: 'Test Category Wrong ID',
        slug: 'test-category-wrong-id',
        image: `/uploads/categories/cat_${wrongCategoryId}_1704067200000.jpg`
      });

      const validationError = category.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.image).toBeDefined();
    });
  });

  describe('Pre-save middleware validation', () => {
    it('should validate image path in pre-save middleware', async () => {
      const category = new categoryModel({
        _id: testCategoryId,
        name: 'Test Category Pre-save',
        originalName: 'Test Category Pre-save',
        slug: 'test-category-pre-save',
        image: '/invalid/path/image.jpg'
      });

      await expect(category.save()).rejects.toThrow();
    });

    it('should validate unique naming in pre-save middleware', async () => {
      const wrongCategoryId = new mongoose.Types.ObjectId();
      const category = new categoryModel({
        _id: testCategoryId,
        name: 'Test Category Pre-save Unique',
        originalName: 'Test Category Pre-save Unique',
        slug: 'test-category-pre-save-unique',
        image: `/uploads/categories/cat_${wrongCategoryId}_1704067200000.jpg`
      });

      await expect(category.save()).rejects.toThrow();
    });
  });

  describe('Database indexes', () => {
    it('should have image index for performance', async () => {
      const indexes = await categoryModel.collection.getIndexes();
      
      // Check if image index exists
      const imageIndexExists = Object.keys(indexes).some(indexName => 
        indexes[indexName].some(field => field[0] === 'image')
      );
      
      expect(imageIndexExists).toBe(true);
    });

    it('should have compound image and _id index', async () => {
      const indexes = await categoryModel.collection.getIndexes();
      
      // Check if compound index exists
      const compoundIndexExists = Object.keys(indexes).some(indexName => {
        const index = indexes[indexName];
        return index.length >= 2 && 
               index.some(field => field[0] === 'image') &&
               index.some(field => field[0] === '_id');
      });
      
      expect(compoundIndexExists).toBe(true);
    });
  });
});