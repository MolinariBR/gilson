import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CategoryService from '../services/categoryService.js';
import categoryModel from '../models/categoryModel.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Category Unique Image Integration Tests', () => {
  let categoryService;
  let createdCategories = [];

  beforeEach(() => {
    categoryService = new CategoryService();
  });

  afterEach(async () => {
    // Clean up created categories
    for (const categoryId of createdCategories) {
      try {
        await categoryModel.findByIdAndDelete(categoryId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    createdCategories = [];

    // Clean up any test image files
    const uploadDir = categoryService.getCategoryImagePath();
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      files.forEach(file => {
        if (file.startsWith('cat_') && file.includes('test')) {
          try {
            fs.unlinkSync(path.join(uploadDir, file));
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      });
    }
  });

  describe('Complete workflow integration', () => {
    it('should demonstrate unique naming system workflow', async () => {
      // Step 1: Test generateUniqueImageName function
      const mockCategoryId = new mongoose.Types.ObjectId().toString();
      const originalFilename = 'test-category.jpg';
      
      const uniqueName = categoryService.generateUniqueImageName(mockCategoryId, originalFilename);
      expect(uniqueName).toMatch(new RegExp(`^cat_${mockCategoryId}_\\d+\\.jpg$`));

      // Step 2: Test validation function
      const isValidAssociation = categoryService.validateCategoryImageAssociation(mockCategoryId, uniqueName);
      expect(isValidAssociation).toBe(true);

      // Step 3: Test with wrong category ID
      const wrongCategoryId = new mongoose.Types.ObjectId().toString();
      const isInvalidAssociation = categoryService.validateCategoryImageAssociation(wrongCategoryId, uniqueName);
      expect(isInvalidAssociation).toBe(false);

      // Step 4: Test legacy format validation
      const legacyFilename = 'old-image_1704067200000.jpg';
      const legacyValidation = categoryService.validateCategoryImageAssociation(mockCategoryId, legacyFilename);
      expect(legacyValidation).toBe(false); // Legacy format should not validate with unique naming
    });

    it('should validate different categories get different unique names', () => {
      const categoryId1 = new mongoose.Types.ObjectId().toString();
      const categoryId2 = new mongoose.Types.ObjectId().toString();
      const filename = 'same-image.png';

      const name1 = categoryService.generateUniqueImageName(categoryId1, filename);
      const name2 = categoryService.generateUniqueImageName(categoryId2, filename);

      // Names should be different
      expect(name1).not.toBe(name2);

      // Each should contain its respective category ID
      expect(name1).toContain(categoryId1);
      expect(name2).toContain(categoryId2);

      // Each should validate only with its own category ID
      expect(categoryService.validateCategoryImageAssociation(categoryId1, name1)).toBe(true);
      expect(categoryService.validateCategoryImageAssociation(categoryId2, name2)).toBe(true);
      expect(categoryService.validateCategoryImageAssociation(categoryId1, name2)).toBe(false);
      expect(categoryService.validateCategoryImageAssociation(categoryId2, name1)).toBe(false);
    });

    it('should handle edge cases in naming and validation', () => {
      const categoryId = new mongoose.Types.ObjectId().toString();

      // Test different file extensions
      const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      extensions.forEach(ext => {
        const filename = `test${ext}`;
        const uniqueName = categoryService.generateUniqueImageName(categoryId, filename);
        const escapedExt = ext.replace('.', '\\.');
        expect(uniqueName).toMatch(new RegExp(`^cat_${categoryId}_\\d+${escapedExt}$`));
        expect(categoryService.validateCategoryImageAssociation(categoryId, uniqueName)).toBe(true);
      });

      // Test with complex original filenames
      const complexFilenames = [
        'image with spaces.jpg',
        'image-with-dashes.png',
        'image_with_underscores.webp',
        'image.with.dots.jpeg'
      ];

      complexFilenames.forEach(filename => {
        const uniqueName = categoryService.generateUniqueImageName(categoryId, filename);
        expect(uniqueName).toMatch(new RegExp(`^cat_${categoryId}_\\d+\\.[a-zA-Z0-9]+$`));
        expect(categoryService.validateCategoryImageAssociation(categoryId, uniqueName)).toBe(true);
      });
    });

    it('should validate model integration with unique naming', () => {
      const categoryId = new mongoose.Types.ObjectId();
      const uniqueImageName = categoryService.generateUniqueImageName(categoryId.toString(), 'test.jpg');

      // Test valid unique naming format
      const validCategoryData = {
        name: 'Test Category Valid',
        originalName: 'Test Category Valid',
        slug: 'test-category-valid',
        image: `/uploads/categories/${uniqueImageName}`,
        isActive: true,
        order: 1
      };

      const validCategory = new categoryModel(validCategoryData);
      validCategory._id = categoryId;

      const validationError = validCategory.validateSync();
      expect(validationError).toBeUndefined();

      // Test invalid unique naming format (wrong category ID)
      const wrongCategoryId = new mongoose.Types.ObjectId();
      const wrongUniqueImageName = categoryService.generateUniqueImageName(wrongCategoryId.toString(), 'test.jpg');

      const invalidCategoryData = {
        name: 'Test Category Invalid',
        originalName: 'Test Category Invalid',
        slug: 'test-category-invalid',
        image: `/uploads/categories/${wrongUniqueImageName}`,
        isActive: true,
        order: 1
      };

      const invalidCategory = new categoryModel(invalidCategoryData);
      invalidCategory._id = categoryId; // Different ID than in image name

      const invalidValidationError = invalidCategory.validateSync();
      expect(invalidValidationError).toBeDefined();
      expect(invalidValidationError.errors.image).toBeDefined();
    });

    it('should demonstrate requirements compliance', async () => {
      // Requirement 1.1: Each category should have unique image name with category ID
      const categoryId = new mongoose.Types.ObjectId().toString();
      const filename = 'category-image.jpg';
      const uniqueName = categoryService.generateUniqueImageName(categoryId, filename);
      
      expect(uniqueName).toContain(categoryId);
      expect(uniqueName).toMatch(/\d+/); // Contains timestamp
      expect(uniqueName).toMatch(/\.jpg$/); // Preserves extension

      // Requirement 1.3: System should use unique identifier (ID + timestamp)
      const name1 = categoryService.generateUniqueImageName(categoryId, filename);
      
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      const name2 = categoryService.generateUniqueImageName(categoryId, filename);
      
      expect(name1).not.toBe(name2); // Different timestamps create different names

      // Requirement 4.1: Names should include category ID for uniqueness
      expect(name1).toContain(categoryId);
      expect(name2).toContain(categoryId);

      // Requirement 4.2: System should resolve conflicts automatically
      // This is demonstrated by the timestamp-based naming ensuring uniqueness
      expect(categoryService.validateCategoryImageAssociation(categoryId, name1)).toBe(true);
      expect(categoryService.validateCategoryImageAssociation(categoryId, name2)).toBe(true);
    });
  });
});