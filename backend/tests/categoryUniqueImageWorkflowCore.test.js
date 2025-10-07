import { describe, it, expect, beforeEach, vi } from 'vitest';
import CategoryService from '../services/categoryService.js';
import EnhancedImageProcessor from '../utils/enhancedImageProcessor.js';
import mongoose from 'mongoose';

describe('Category Unique Image Workflow - Core Integration Tests', () => {
  let categoryService;
  let enhancedImageProcessor;

  beforeEach(() => {
    categoryService = new CategoryService();
    enhancedImageProcessor = new EnhancedImageProcessor();
  });

  describe('1. Category Creation with Unique Image - Workflow Concepts', () => {
    it('should demonstrate unique image naming workflow for category creation', () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      const originalFilename = 'test-category-image.jpg';
      
      // Step 1: Generate unique name for category
      const uniqueName = categoryService.generateUniqueImageName(categoryId, originalFilename);
      
      // Verify unique naming format
      expect(uniqueName).toMatch(new RegExp(`^cat_${categoryId}_\\d+\\.jpg$`));
      expect(uniqueName).toContain(categoryId);
      expect(uniqueName).toMatch(/\d+/); // Contains timestamp
      expect(uniqueName.endsWith('.jpg')).toBe(true);
      
      // Step 2: Enhanced processor generates more complex format
      const enhancedName = enhancedImageProcessor.generateUniqueImageName(categoryId, originalFilename);
      expect(enhancedName).toMatch(new RegExp(`^cat_${categoryId}_\\d+_\\d+\\.jpg$`));
      expect(enhancedName).toContain(categoryId);
      
      // Step 3: Validation works with enhanced format
      expect(categoryService.validateCategoryImageAssociation(categoryId, enhancedName)).toBe(true);
      expect(enhancedImageProcessor.validateCategoryImageAssociation(categoryId, enhancedName)).toBe(true);
      
      // Step 4: Cross-category validation fails
      const differentCategoryId = new mongoose.Types.ObjectId().toString();
      expect(categoryService.validateCategoryImageAssociation(differentCategoryId, enhancedName)).toBe(false);
    });

    it('should ensure uniqueness across different categories', () => {
      const categoryId1 = new mongoose.Types.ObjectId().toString();
      const categoryId2 = new mongoose.Types.ObjectId().toString();
      const filename = 'same-image-name.jpg';
      
      // Generate names for both categories
      const name1 = enhancedImageProcessor.generateUniqueImageName(categoryId1, filename);
      const name2 = enhancedImageProcessor.generateUniqueImageName(categoryId2, filename);
      
      // Names should be different
      expect(name1).not.toBe(name2);
      
      // Each should contain its respective category ID
      expect(name1).toContain(categoryId1);
      expect(name2).toContain(categoryId2);
      
      // Each should validate only for its own category
      expect(categoryService.validateCategoryImageAssociation(categoryId1, name1)).toBe(true);
      expect(categoryService.validateCategoryImageAssociation(categoryId2, name2)).toBe(true);
      expect(categoryService.validateCategoryImageAssociation(categoryId1, name2)).toBe(false);
      expect(categoryService.validateCategoryImageAssociation(categoryId2, name1)).toBe(false);
    });

    it('should handle rollback workflow concepts', async () => {
      // Test rollback action execution
      const rollbackOrder = [];
      const rollbackActions = [
        () => rollbackOrder.push('cleanup-temp-files'),
        () => rollbackOrder.push('restore-backup'),
        () => rollbackOrder.push('delete-partial-upload')
      ];

      await enhancedImageProcessor.executeRollback(rollbackActions);
      
      // Actions should execute in reverse order
      expect(rollbackOrder).toEqual(['delete-partial-upload', 'restore-backup', 'cleanup-temp-files']);
    });

    it('should demonstrate validation failure scenarios', () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      
      // Test invalid formats
      const invalidFormats = [
        'regular-image.jpg',
        `category_${categoryId}_123.jpg`, // Wrong prefix
        `cat${categoryId}_123.jpg`, // Missing underscore
        `cat_${categoryId}.jpg`, // Missing timestamp
        `cat_${categoryId}_abc.jpg`, // Non-numeric timestamp
        `cat_wrong_id_123.jpg` // Wrong category ID
      ];
      
      invalidFormats.forEach(filename => {
        expect(categoryService.validateCategoryImageAssociation(categoryId, filename)).toBe(false);
      });
      
      // Test valid enhanced format
      const validEnhancedFormat = `cat_${categoryId}_1704067200000_123.jpg`;
      expect(categoryService.validateCategoryImageAssociation(categoryId, validEnhancedFormat)).toBe(true);
    });
  });

  describe('2. Category Editing Preserving Uniqueness - Workflow Concepts', () => {
    it('should demonstrate image replacement workflow maintaining uniqueness', () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      
      // Step 1: Original image
      const originalImage = enhancedImageProcessor.generateUniqueImageName(categoryId, 'original.jpg');
      expect(categoryService.validateCategoryImageAssociation(categoryId, originalImage)).toBe(true);
      
      // Step 2: Updated image (different timestamp)
      const updatedImage = enhancedImageProcessor.generateUniqueImageName(categoryId, 'updated.jpg');
      expect(categoryService.validateCategoryImageAssociation(categoryId, updatedImage)).toBe(true);
      
      // Step 3: Images should be different but both valid for same category
      expect(originalImage).not.toBe(updatedImage);
      expect(originalImage).toContain(categoryId);
      expect(updatedImage).toContain(categoryId);
      
      // Step 4: Both should validate for the category
      expect(categoryService.validateCategoryImageAssociation(categoryId, originalImage)).toBe(true);
      expect(categoryService.validateCategoryImageAssociation(categoryId, updatedImage)).toBe(true);
    });

    it('should maintain uniqueness during multiple updates', async () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      const imageNames = [];
      
      // Simulate multiple updates over time
      for (let i = 0; i < 5; i++) {
        // Small delay to ensure different timestamps
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
        
        const imageName = enhancedImageProcessor.generateUniqueImageName(categoryId, `update-${i}.jpg`);
        imageNames.push(imageName);
        
        // Each should be unique and valid
        expect(imageName).toContain(categoryId);
        expect(categoryService.validateCategoryImageAssociation(categoryId, imageName)).toBe(true);
      }
      
      // All names should be unique
      const uniqueNames = [...new Set(imageNames)];
      expect(uniqueNames).toHaveLength(imageNames.length);
    });

    it('should demonstrate validation rollback on association failure', () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      
      // Mock a scenario where validation would fail
      const mockInvalidImage = `cat_${new mongoose.Types.ObjectId()}_123456_789.jpg`;
      
      // This should fail validation for our category
      expect(categoryService.validateCategoryImageAssociation(categoryId, mockInvalidImage)).toBe(false);
      
      // But should pass for the correct category
      const correctCategoryId = mockInvalidImage.split('_')[1];
      expect(categoryService.validateCategoryImageAssociation(correctCategoryId, mockInvalidImage)).toBe(true);
    });
  });

  describe('3. Category Deletion with Image Cleanup - Workflow Concepts', () => {
    it('should identify images associated with specific category', () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      const otherCategoryId = new mongoose.Types.ObjectId().toString();
      
      // Create mock filenames
      const categoryImages = [
        `cat_${categoryId}_1704067200000_123.jpg`,
        `cat_${categoryId}_1704067300000_456.jpg`,
        `cat_${categoryId}_1704067400000_789.jpg`
      ];
      
      const otherImages = [
        `cat_${otherCategoryId}_1704067200000_123.jpg`,
        'regular-image.jpg',
        'another-file.png'
      ];
      
      const allImages = [...categoryImages, ...otherImages];
      
      // Test identification logic
      const associatedImages = allImages.filter(filename => 
        categoryService.validateCategoryImageAssociation(categoryId, filename)
      );
      
      expect(associatedImages.sort()).toEqual(categoryImages.sort());
      expect(associatedImages).toHaveLength(3);
    });

    it('should demonstrate cleanup workflow for category deletion', () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      
      // Mock images that would be found for this category
      const mockImages = [
        `cat_${categoryId}_1704067200000_123.jpg`,
        `cat_${categoryId}_1704067300000_456.jpg`
      ];
      
      // Verify all are associated with the category
      mockImages.forEach(filename => {
        expect(categoryService.validateCategoryImageAssociation(categoryId, filename)).toBe(true);
      });
      
      // Simulate cleanup process
      const imagesToCleanup = mockImages.filter(filename => 
        categoryService.validateCategoryImageAssociation(categoryId, filename)
      );
      
      expect(imagesToCleanup).toHaveLength(2);
      expect(imagesToCleanup).toEqual(mockImages);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Test error handling in rollback
      const rollbackActions = [
        () => { throw new Error('Cleanup failed'); },
        () => 'success',
        () => { throw new Error('Another error'); }
      ];
      
      // Should not throw despite errors
      await expect(enhancedImageProcessor.executeRollback(rollbackActions)).resolves.toBeUndefined();
    });
  });

  describe('4. Complete Workflow Integration - End-to-End Concepts', () => {
    it('should demonstrate complete category lifecycle with unique images', async () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      
      // Step 1: Category creation - generate initial unique image name
      const initialImageName = enhancedImageProcessor.generateUniqueImageName(categoryId, 'initial.jpg');
      expect(categoryService.validateCategoryImageAssociation(categoryId, initialImageName)).toBe(true);
      
      // Step 2: Category update - generate new unique image name
      await new Promise(resolve => setTimeout(resolve, 1)); // Ensure different timestamp
      const updatedImageName = enhancedImageProcessor.generateUniqueImageName(categoryId, 'updated.jpg');
      expect(categoryService.validateCategoryImageAssociation(categoryId, updatedImageName)).toBe(true);
      expect(updatedImageName).not.toBe(initialImageName);
      
      // Step 3: Another update - generate another unique name
      await new Promise(resolve => setTimeout(resolve, 1));
      const finalImageName = enhancedImageProcessor.generateUniqueImageName(categoryId, 'final.jpg');
      expect(categoryService.validateCategoryImageAssociation(categoryId, finalImageName)).toBe(true);
      expect(finalImageName).not.toBe(updatedImageName);
      expect(finalImageName).not.toBe(initialImageName);
      
      // Step 4: Category deletion - identify all associated images
      const allGeneratedImages = [initialImageName, updatedImageName, finalImageName];
      const associatedImages = allGeneratedImages.filter(filename => 
        categoryService.validateCategoryImageAssociation(categoryId, filename)
      );
      
      expect(associatedImages).toHaveLength(3);
      expect(associatedImages.sort()).toEqual(allGeneratedImages.sort());
    });

    it('should maintain isolation between multiple categories', () => {
      const categories = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString()
      ];
      
      const categoryImages = {};
      
      // Generate images for each category
      categories.forEach(categoryId => {
        categoryImages[categoryId] = [
          enhancedImageProcessor.generateUniqueImageName(categoryId, 'image1.jpg'),
          enhancedImageProcessor.generateUniqueImageName(categoryId, 'image2.jpg')
        ];
      });
      
      // Verify isolation - each category's images only validate for that category
      categories.forEach(categoryId => {
        const ownImages = categoryImages[categoryId];
        
        // Own images should validate
        ownImages.forEach(imageName => {
          expect(categoryService.validateCategoryImageAssociation(categoryId, imageName)).toBe(true);
        });
        
        // Other categories' images should not validate
        categories.forEach(otherCategoryId => {
          if (otherCategoryId !== categoryId) {
            const otherImages = categoryImages[otherCategoryId];
            otherImages.forEach(imageName => {
              expect(categoryService.validateCategoryImageAssociation(categoryId, imageName)).toBe(false);
            });
          }
        });
      });
    });

    it('should handle concurrent category operations', () => {
      const categoryIds = Array.from({ length: 5 }, () => new mongoose.Types.ObjectId().toString());
      
      // Simulate concurrent image name generation
      const allImageNames = categoryIds.map(categoryId => 
        enhancedImageProcessor.generateUniqueImageName(categoryId, 'concurrent.jpg')
      );
      
      // All names should be unique
      const uniqueNames = [...new Set(allImageNames)];
      expect(uniqueNames).toHaveLength(allImageNames.length);
      
      // Each should validate only for its own category
      allImageNames.forEach((imageName, index) => {
        const categoryId = categoryIds[index];
        expect(categoryService.validateCategoryImageAssociation(categoryId, imageName)).toBe(true);
        
        // Should not validate for other categories
        categoryIds.forEach((otherCategoryId, otherIndex) => {
          if (otherIndex !== index) {
            expect(categoryService.validateCategoryImageAssociation(otherCategoryId, imageName)).toBe(false);
          }
        });
      });
    });
  });

  describe('5. Requirements Compliance Verification', () => {
    it('should verify requirement 1.1: Each category has unique image name with category ID', () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      const filename = 'test-image.jpg';
      
      const uniqueName = enhancedImageProcessor.generateUniqueImageName(categoryId, filename);
      
      // Should contain category ID
      expect(uniqueName).toContain(categoryId);
      
      // Should be unique (timestamp + random)
      expect(uniqueName).toMatch(/\d+_\d+/);
      
      // Should preserve extension
      expect(uniqueName.endsWith('.jpg')).toBe(true);
      
      // Should follow enhanced pattern
      expect(uniqueName).toMatch(new RegExp(`^cat_${categoryId}_\\d+_\\d+\\.jpg$`));
    });

    it('should verify requirement 1.2: Replace only specific category image', () => {
      const categoryId1 = new mongoose.Types.ObjectId().toString();
      const categoryId2 = new mongoose.Types.ObjectId().toString();
      
      // Generate images for both categories
      const image1 = enhancedImageProcessor.generateUniqueImageName(categoryId1, 'image.jpg');
      const image2 = enhancedImageProcessor.generateUniqueImageName(categoryId2, 'image.jpg');
      
      // Each should only be associated with its own category
      expect(categoryService.validateCategoryImageAssociation(categoryId1, image1)).toBe(true);
      expect(categoryService.validateCategoryImageAssociation(categoryId2, image2)).toBe(true);
      expect(categoryService.validateCategoryImageAssociation(categoryId1, image2)).toBe(false);
      expect(categoryService.validateCategoryImageAssociation(categoryId2, image1)).toBe(false);
      
      // Updating category1 should not affect category2's validation
      const updatedImage1 = enhancedImageProcessor.generateUniqueImageName(categoryId1, 'updated.jpg');
      expect(categoryService.validateCategoryImageAssociation(categoryId1, updatedImage1)).toBe(true);
      expect(categoryService.validateCategoryImageAssociation(categoryId2, image2)).toBe(true); // Still valid
    });

    it('should verify requirement 1.4: Cleanup images on category deletion', () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      
      // Generate multiple images for category (simulating updates over time)
      const categoryImages = [
        `cat_${categoryId}_1704067200000_123.jpg`,
        `cat_${categoryId}_1704067300000_456.jpg`,
        `cat_${categoryId}_1704067400000_789.jpg`
      ];
      
      // Create some unrelated images
      const unrelatedImages = [
        `cat_${new mongoose.Types.ObjectId()}_1704067200000_123.jpg`,
        'regular-image.jpg'
      ];
      
      const allImages = [...categoryImages, ...unrelatedImages];
      
      // Identify images to cleanup (only category-specific ones)
      const imagesToCleanup = allImages.filter(filename => 
        categoryService.validateCategoryImageAssociation(categoryId, filename)
      );
      
      expect(imagesToCleanup.sort()).toEqual(categoryImages.sort());
      expect(imagesToCleanup).toHaveLength(3);
      
      // Unrelated images should not be affected
      const unaffectedImages = allImages.filter(filename => 
        !categoryService.validateCategoryImageAssociation(categoryId, filename)
      );
      
      expect(unaffectedImages.sort()).toEqual(unrelatedImages.sort());
    });

    it('should verify requirement 3.2: CRUD operations maintain uniqueness', async () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      
      // CREATE - Generate unique name
      const createName = enhancedImageProcessor.generateUniqueImageName(categoryId, 'create.jpg');
      expect(createName).toMatch(new RegExp(`^cat_${categoryId}_\\d+_\\d+\\.jpg$`));
      expect(categoryService.validateCategoryImageAssociation(categoryId, createName)).toBe(true);
      
      // READ - Validation should work
      expect(categoryService.validateCategoryImageAssociation(categoryId, createName)).toBe(true);
      
      // UPDATE - Generate new unique name
      await new Promise(resolve => setTimeout(resolve, 1)); // Ensure different timestamp
      const updateName = enhancedImageProcessor.generateUniqueImageName(categoryId, 'update.jpg');
      expect(updateName).toMatch(new RegExp(`^cat_${categoryId}_\\d+_\\d+\\.jpg$`));
      expect(updateName).not.toBe(createName);
      expect(categoryService.validateCategoryImageAssociation(categoryId, updateName)).toBe(true);
      
      // DELETE - Both images should be identifiable for cleanup
      const imagesToDelete = [createName, updateName];
      imagesToDelete.forEach(imageName => {
        expect(categoryService.validateCategoryImageAssociation(categoryId, imageName)).toBe(true);
      });
      
      // Verify they would be found in cleanup
      const foundImages = imagesToDelete.filter(filename => 
        categoryService.validateCategoryImageAssociation(categoryId, filename)
      );
      expect(foundImages).toHaveLength(2);
    });

    it('should verify system prevents naming conflicts', () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      
      // Generate many names rapidly
      const imageNames = [];
      for (let i = 0; i < 10; i++) {
        const name = enhancedImageProcessor.generateUniqueImageName(categoryId, 'test.jpg');
        imageNames.push(name);
      }
      
      // All should be unique
      const uniqueNames = [...new Set(imageNames)];
      expect(uniqueNames).toHaveLength(imageNames.length);
      
      // All should contain category ID
      imageNames.forEach(name => {
        expect(name).toContain(categoryId);
        expect(categoryService.validateCategoryImageAssociation(categoryId, name)).toBe(true);
      });
    });
  });
});