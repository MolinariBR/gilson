import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CategoryService from '../services/categoryService.js';
import categoryModel from '../models/categoryModel.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Category Unique Image Naming System', () => {
  let categoryService;
  let testCategoryId;
  let testImageFile;

  beforeEach(() => {
    categoryService = new CategoryService();
    testCategoryId = '507f1f77bcf86cd799439011'; // Mock ObjectId
    
    // Create a mock image file
    testImageFile = {
      originalname: 'test-image.jpg',
      path: path.join(__dirname, 'test-image.png'), // Use existing test image
      mimetype: 'image/jpeg',
      size: 1024
    };
  });

  afterEach(() => {
    // Clean up any test files created
    const uploadDir = categoryService.getCategoryImagePath();
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      files.forEach(file => {
        if (file.startsWith('cat_' + testCategoryId)) {
          fs.unlinkSync(path.join(uploadDir, file));
        }
      });
    }
  });

  describe('generateUniqueImageName', () => {
    it('should generate unique name with category ID and timestamp', () => {
      const originalFilename = 'test-image.jpg';
      const result = categoryService.generateUniqueImageName(testCategoryId, originalFilename);
      
      expect(result).toMatch(new RegExp(`^cat_${testCategoryId}_\\d+\\.jpg$`));
    });

    it('should preserve file extension', () => {
      const pngFile = 'test.png';
      const jpegFile = 'test.jpeg';
      const webpFile = 'test.webp';
      
      const pngResult = categoryService.generateUniqueImageName(testCategoryId, pngFile);
      const jpegResult = categoryService.generateUniqueImageName(testCategoryId, jpegFile);
      const webpResult = categoryService.generateUniqueImageName(testCategoryId, webpFile);
      
      expect(pngResult).toMatch(/\.png$/);
      expect(jpegResult).toMatch(/\.jpeg$/);
      expect(webpResult).toMatch(/\.webp$/);
    });

    it('should generate different names for same category at different times', async () => {
      const filename = 'test.jpg';
      const name1 = categoryService.generateUniqueImageName(testCategoryId, filename);
      
      // Wait a small amount to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const name2 = categoryService.generateUniqueImageName(testCategoryId, filename);
      
      expect(name1).not.toBe(name2);
    });
  });

  describe('validateCategoryImageAssociation', () => {
    it('should validate correct category-image association', () => {
      const validImagePath = `/uploads/categories/cat_${testCategoryId}_1704067200000.jpg`;
      const result = categoryService.validateCategoryImageAssociation(testCategoryId, validImagePath);
      
      expect(result).toBe(true);
    });

    it('should reject incorrect category-image association', () => {
      const differentCategoryId = '507f1f77bcf86cd799439012';
      const invalidImagePath = `/uploads/categories/cat_${differentCategoryId}_1704067200000.jpg`;
      const result = categoryService.validateCategoryImageAssociation(testCategoryId, invalidImagePath);
      
      expect(result).toBe(false);
    });

    it('should handle filename without path', () => {
      const validFilename = `cat_${testCategoryId}_1704067200000.jpg`;
      const result = categoryService.validateCategoryImageAssociation(testCategoryId, validFilename);
      
      expect(result).toBe(true);
    });

    it('should reject old naming format', () => {
      const oldFormatName = 'test-image_1704067200000.jpg';
      const result = categoryService.validateCategoryImageAssociation(testCategoryId, oldFormatName);
      
      expect(result).toBe(false);
    });

    it('should handle null or empty inputs', () => {
      expect(categoryService.validateCategoryImageAssociation(null, 'test.jpg')).toBe(false);
      expect(categoryService.validateCategoryImageAssociation(testCategoryId, null)).toBe(false);
      expect(categoryService.validateCategoryImageAssociation('', 'test.jpg')).toBe(false);
      expect(categoryService.validateCategoryImageAssociation(testCategoryId, '')).toBe(false);
    });
  });

  describe('uploadCategoryImage with unique naming', () => {
    it('should use unique naming when categoryId is provided', async () => {
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImageFile.path)) {
        console.log('Skipping test - test image file not found');
        return;
      }

      const result = await categoryService.uploadCategoryImage(testImageFile, testCategoryId);
      
      expect(result.success).toBe(true);
      expect(result.filename).toMatch(new RegExp(`^cat_${testCategoryId}_\\d+\\.jpg$`));
      expect(result.path).toBe(`/uploads/categories/${result.filename}`);
    });

    it('should fall back to legacy naming when categoryId is not provided', async () => {
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImageFile.path)) {
        console.log('Skipping test - test image file not found');
        return;
      }

      const result = await categoryService.uploadCategoryImage(testImageFile);
      
      expect(result.success).toBe(true);
      expect(result.filename).not.toMatch(new RegExp(`^cat_${testCategoryId}_`));
      expect(result.filename).toMatch(/test-image_\d+\.jpg$/);
    });

    it('should validate association after upload', async () => {
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImageFile.path)) {
        console.log('Skipping test - test image file not found');
        return;
      }

      const result = await categoryService.uploadCategoryImage(testImageFile, testCategoryId);
      
      expect(result.success).toBe(true);
      
      const isValidAssociation = categoryService.validateCategoryImageAssociation(
        testCategoryId, 
        result.filename
      );
      expect(isValidAssociation).toBe(true);
    });
  });

  describe('Integration with category operations', () => {
    it('should generate unique image names during category creation', () => {
      // This is a unit test for the naming logic
      const mockCategoryId = '507f1f77bcf86cd799439013';
      const mockFilename = 'category-image.png';
      
      const uniqueName = categoryService.generateUniqueImageName(mockCategoryId, mockFilename);
      
      expect(uniqueName).toMatch(new RegExp(`^cat_${mockCategoryId}_\\d+\\.png$`));
      
      const isValid = categoryService.validateCategoryImageAssociation(mockCategoryId, uniqueName);
      expect(isValid).toBe(true);
    });

    it('should validate that different categories get different image names', () => {
      const categoryId1 = '507f1f77bcf86cd799439014';
      const categoryId2 = '507f1f77bcf86cd799439015';
      const filename = 'same-image.jpg';
      
      const name1 = categoryService.generateUniqueImageName(categoryId1, filename);
      const name2 = categoryService.generateUniqueImageName(categoryId2, filename);
      
      expect(name1).not.toBe(name2);
      expect(name1).toContain(categoryId1);
      expect(name2).toContain(categoryId2);
    });
  });
});