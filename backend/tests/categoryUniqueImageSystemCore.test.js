import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CategoryService from '../services/categoryService.js';
import EnhancedImageProcessor from '../utils/enhancedImageProcessor.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Category Unique Image System - Core Unit Tests', () => {
  let categoryService;
  let enhancedImageProcessor;
  let testCategoryId;

  beforeEach(() => {
    categoryService = new CategoryService();
    enhancedImageProcessor = new EnhancedImageProcessor();
    testCategoryId = '507f1f77bcf86cd799439011';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. generateUniqueImageName Function Tests', () => {
    describe('CategoryService.generateUniqueImageName', () => {
      it('should generate unique name with correct format', () => {
        const originalFilename = 'test-image.jpg';
        const result = categoryService.generateUniqueImageName(testCategoryId, originalFilename);
        
        // Should match pattern: cat_[categoryId]_[timestamp].[ext]
        const expectedPattern = new RegExp(`^cat_${testCategoryId}_\\d+\\.jpg$`);
        expect(result).toMatch(expectedPattern);
      });

      it('should preserve file extension correctly', () => {
        const testCases = [
          { input: 'test.png', expected: '.png' },
          { input: 'test.jpeg', expected: '.jpeg' },
          { input: 'test.webp', expected: '.webp' },
          { input: 'test.JPG', expected: '.JPG' },
          { input: 'image.gif', expected: '.gif' }
        ];

        testCases.forEach(({ input, expected }) => {
          const result = categoryService.generateUniqueImageName(testCategoryId, input);
          expect(result).toMatch(new RegExp(`\\${expected}$`));
        });
      });

      it('should generate different names for same inputs at different times', async () => {
        const filename = 'test.jpg';
        const name1 = categoryService.generateUniqueImageName(testCategoryId, filename);
        
        // Wait to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 2));
        
        const name2 = categoryService.generateUniqueImageName(testCategoryId, filename);
        
        expect(name1).not.toBe(name2);
        expect(name1).toContain(testCategoryId);
        expect(name2).toContain(testCategoryId);
      });

      it('should generate different names for different categories', () => {
        const categoryId1 = '507f1f77bcf86cd799439011';
        const categoryId2 = '507f1f77bcf86cd799439012';
        const filename = 'same-image.jpg';
        
        const name1 = categoryService.generateUniqueImageName(categoryId1, filename);
        const name2 = categoryService.generateUniqueImageName(categoryId2, filename);
        
        expect(name1).not.toBe(name2);
        expect(name1).toContain(categoryId1);
        expect(name2).toContain(categoryId2);
      });

      it('should handle edge cases gracefully', () => {
        // Test with empty extension
        const noExtResult = categoryService.generateUniqueImageName(testCategoryId, 'filename');
        expect(noExtResult).toMatch(new RegExp(`^cat_${testCategoryId}_\\d+$`));

        // Test with multiple dots
        const multiDotResult = categoryService.generateUniqueImageName(testCategoryId, 'file.name.jpg');
        expect(multiDotResult).toMatch(new RegExp(`^cat_${testCategoryId}_\\d+\\.jpg$`));

        // Test with special characters in filename
        const specialResult = categoryService.generateUniqueImageName(testCategoryId, 'file-name_123.png');
        expect(specialResult).toMatch(new RegExp(`^cat_${testCategoryId}_\\d+\\.png$`));
      });
    });

    describe('EnhancedImageProcessor.generateUniqueImageName', () => {
      it('should generate enhanced format with random component', () => {
        const originalFilename = 'test-image.jpg';
        const result = enhancedImageProcessor.generateUniqueImageName(testCategoryId, originalFilename);
        
        // Enhanced processor includes random number: cat_[categoryId]_[timestamp]_[random].[ext]
        const expectedPattern = new RegExp(`^cat_${testCategoryId}_\\d+_\\d+\\.jpg$`);
        expect(result).toMatch(expectedPattern);
      });

      it('should generate different names with random component', () => {
        const filename = 'test.jpg';
        const name1 = enhancedImageProcessor.generateUniqueImageName(testCategoryId, filename);
        const name2 = enhancedImageProcessor.generateUniqueImageName(testCategoryId, filename);
        
        expect(name1).not.toBe(name2);
        expect(name1).toMatch(new RegExp(`^cat_${testCategoryId}_\\d+_\\d+\\.jpg$`));
        expect(name2).toMatch(new RegExp(`^cat_${testCategoryId}_\\d+_\\d+\\.jpg$`));
      });
    });
  });

  describe('2. Category-Image Association Validation Tests', () => {
    describe('CategoryService.validateCategoryImageAssociation', () => {
      it('should validate correct enhanced format associations', () => {
        const validPaths = [
          `/uploads/categories/cat_${testCategoryId}_1704067200000_123.jpg`,
          `cat_${testCategoryId}_1704067200000_456.jpg`,
          `/some/path/cat_${testCategoryId}_1704067200000_789.png`,
          `cat_${testCategoryId}_1704067200000_012.webp`
        ];

        validPaths.forEach(path => {
          const result = categoryService.validateCategoryImageAssociation(testCategoryId, path);
          expect(result).toBe(true);
        });
      });

      it('should reject incorrect category-image association', () => {
        const differentCategoryId = '507f1f77bcf86cd799439012';
        const invalidPaths = [
          `/uploads/categories/cat_${differentCategoryId}_1704067200000_123.jpg`,
          'regular-image-name.jpg',
          'cat_wrong_id_1704067200000_123.jpg',
          '/uploads/categories/old-format-image.jpg',
          `category_${testCategoryId}_1704067200000_123.jpg`, // Wrong prefix
          `cat${testCategoryId}_1704067200000_123.jpg`, // Missing underscore
          `cat_${testCategoryId}_1704067200000.jpg` // Missing random component
        ];

        invalidPaths.forEach(path => {
          const result = categoryService.validateCategoryImageAssociation(testCategoryId, path);
          expect(result).toBe(false);
        });
      });

      it('should handle null and empty inputs', () => {
        const testCases = [
          { categoryId: null, imagePath: 'test.jpg', expected: false },
          { categoryId: testCategoryId, imagePath: null, expected: false },
          { categoryId: '', imagePath: 'test.jpg', expected: false },
          { categoryId: testCategoryId, imagePath: '', expected: false },
          { categoryId: undefined, imagePath: 'test.jpg', expected: false },
          { categoryId: testCategoryId, imagePath: undefined, expected: false }
        ];

        testCases.forEach(({ categoryId, imagePath, expected }) => {
          const result = categoryService.validateCategoryImageAssociation(categoryId, imagePath);
          expect(result).toBe(expected);
        });
      });

      it('should extract filename from full path correctly', () => {
        const fullPath = `/uploads/categories/cat_${testCategoryId}_1704067200000_123.jpg`;
        const result = categoryService.validateCategoryImageAssociation(testCategoryId, fullPath);
        expect(result).toBe(true);
      });

      it('should validate pattern with regex correctly', () => {
        // Test the internal regex pattern validation
        const validFilename = `cat_${testCategoryId}_1704067200000_123.jpg`;
        const invalidFilename = `cat_${testCategoryId}_invalid_abc.jpg`;
        
        expect(categoryService.validateCategoryImageAssociation(testCategoryId, validFilename)).toBe(true);
        expect(categoryService.validateCategoryImageAssociation(testCategoryId, invalidFilename)).toBe(false);
      });
    });

    describe('EnhancedImageProcessor.validateCategoryImageAssociation', () => {
      it('should validate enhanced processor association format', () => {
        const enhancedFormat = `cat_${testCategoryId}_1704067200000_123.jpg`;
        const result = enhancedImageProcessor.validateCategoryImageAssociation(testCategoryId, enhancedFormat);
        expect(result).toBe(true);
      });

      it('should accept simple format in enhanced processor (uses basic validation)', () => {
        const simpleFormat = `cat_${testCategoryId}_1704067200000.jpg`;
        const result = enhancedImageProcessor.validateCategoryImageAssociation(testCategoryId, simpleFormat);
        expect(result).toBe(true); // Enhanced processor uses simpler validation
      });
    });

    describe('Format Compatibility', () => {
      it('should show format differences between service and processor', () => {
        const filename = 'test-image.jpg';
        
        const serviceName = categoryService.generateUniqueImageName(testCategoryId, filename);
        const processorName = enhancedImageProcessor.generateUniqueImageName(testCategoryId, filename);
        
        // Service generates simpler format, processor generates enhanced format
        // Service validation is strict (requires enhanced format), processor validation is lenient
        expect(categoryService.validateCategoryImageAssociation(testCategoryId, serviceName)).toBe(false);
        expect(enhancedImageProcessor.validateCategoryImageAssociation(testCategoryId, serviceName)).toBe(true);
        
        // Both can validate the enhanced format
        expect(categoryService.validateCategoryImageAssociation(testCategoryId, processorName)).toBe(true);
        expect(enhancedImageProcessor.validateCategoryImageAssociation(testCategoryId, processorName)).toBe(true);
      });
    });
  });

  describe('3. Rollback Functionality Tests', () => {
    describe('EnhancedImageProcessor.executeRollback', () => {
      it('should execute rollback actions in reverse order', async () => {
        const rollbackOrder = [];
        
        const mockRollbackActions = [
          () => rollbackOrder.push('action1'),
          () => rollbackOrder.push('action2'),
          () => rollbackOrder.push('action3')
        ];

        await enhancedImageProcessor.executeRollback(mockRollbackActions);

        // Actions should be executed in reverse order
        expect(rollbackOrder).toEqual(['action3', 'action2', 'action1']);
      });

      it('should continue rollback even if individual actions fail', async () => {
        const rollbackOrder = [];
        
        const mockRollbackActions = [
          () => rollbackOrder.push('action1'),
          () => { 
            rollbackOrder.push('action2');
            throw new Error('Rollback action failed');
          },
          () => rollbackOrder.push('action3')
        ];

        // Should not throw error
        await expect(enhancedImageProcessor.executeRollback(mockRollbackActions)).resolves.toBeUndefined();
        
        // All actions should have been attempted
        expect(rollbackOrder).toEqual(['action3', 'action2', 'action1']);
      });

      it('should handle empty rollback actions array', async () => {
        await expect(enhancedImageProcessor.executeRollback([])).resolves.toBeUndefined();
      });

      it('should handle async rollback actions', async () => {
        const rollbackOrder = [];
        
        const mockRollbackActions = [
          async () => {
            await new Promise(resolve => setTimeout(resolve, 1));
            rollbackOrder.push('async1');
          },
          () => rollbackOrder.push('sync2'),
          async () => {
            await new Promise(resolve => setTimeout(resolve, 1));
            rollbackOrder.push('async3');
          }
        ];

        await enhancedImageProcessor.executeRollback(mockRollbackActions);
        expect(rollbackOrder).toEqual(['async3', 'sync2', 'async1']);
      });
    });

    describe('EnhancedImageProcessor.cleanupTempFiles', () => {
      let tempDir;
      let tempFiles;

      beforeEach(() => {
        tempDir = path.join(__dirname, 'temp-rollback-test');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        tempFiles = [
          path.join(tempDir, 'temp1.jpg'),
          path.join(tempDir, 'temp2.png')
        ];

        // Create temp files
        tempFiles.forEach(file => {
          fs.writeFileSync(file, 'temp content');
        });
      });

      afterEach(() => {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });

      it('should clean up tracked temporary files', () => {
        // Add files to temp tracking
        tempFiles.forEach(file => {
          enhancedImageProcessor.tempFiles.add(file);
        });

        // Verify files exist
        tempFiles.forEach(file => {
          expect(fs.existsSync(file)).toBe(true);
        });

        // Clean up
        enhancedImageProcessor.cleanupTempFiles();

        // Verify files are removed
        tempFiles.forEach(file => {
          expect(fs.existsSync(file)).toBe(false);
        });

        // Verify tracking is cleared
        expect(enhancedImageProcessor.tempFiles.size).toBe(0);
      });

      it('should handle non-existent files gracefully', () => {
        const nonExistentFile = path.join(tempDir, 'non-existent.jpg');
        enhancedImageProcessor.tempFiles.add(nonExistentFile);

        // Should not throw error
        expect(() => enhancedImageProcessor.cleanupTempFiles()).not.toThrow();
        expect(enhancedImageProcessor.tempFiles.size).toBe(0);
      });

      it('should handle permission errors gracefully', () => {
        const protectedFile = path.join(tempDir, 'protected.jpg');
        fs.writeFileSync(protectedFile, 'content');
        
        // Mock fs.unlinkSync to throw permission error
        const originalUnlinkSync = fs.unlinkSync;
        vi.spyOn(fs, 'unlinkSync').mockImplementation((filePath) => {
          if (filePath === protectedFile) {
            throw new Error('EACCES: permission denied');
          }
          return originalUnlinkSync(filePath);
        });

        enhancedImageProcessor.tempFiles.add(protectedFile);

        // Should not throw error, but should log warning
        expect(() => enhancedImageProcessor.cleanupTempFiles()).not.toThrow();
        expect(enhancedImageProcessor.tempFiles.size).toBe(0);
      });
    });

    describe('Rollback Integration', () => {
      it('should demonstrate rollback workflow concept', () => {
        // This test demonstrates the rollback concept without file system operations
        const operations = [];
        const rollbackActions = [];

        // Simulate operations with rollback actions
        const performOperation = (name, shouldFail = false) => {
          if (shouldFail) {
            throw new Error(`Operation ${name} failed`);
          }
          operations.push(name);
          rollbackActions.push(() => {
            const index = operations.indexOf(name);
            if (index > -1) {
              operations.splice(index, 1);
            }
          });
        };

        try {
          performOperation('step1');
          performOperation('step2');
          performOperation('step3', true); // This will fail
        } catch (error) {
          // Execute rollback
          rollbackActions.reverse().forEach(action => action());
        }

        // Operations should be rolled back
        expect(operations).toEqual([]);
      });
    });
  });

  describe('4. Integration and Consistency Tests', () => {
    it('should maintain naming consistency across components', () => {
      const filename = 'test-image.jpg';
      
      // Generate names using both methods
      const serviceName = categoryService.generateUniqueImageName(testCategoryId, filename);
      const processorName = enhancedImageProcessor.generateUniqueImageName(testCategoryId, filename);
      
      // Both should contain category ID
      expect(serviceName).toContain(testCategoryId);
      expect(processorName).toContain(testCategoryId);
      
      // Both should have proper extensions
      expect(serviceName).toMatch(/\.jpg$/);
      expect(processorName).toMatch(/\.jpg$/);
      
      // Processor format should be more complex (with random component)
      expect(processorName.split('_').length).toBeGreaterThan(serviceName.split('_').length);
    });

    it('should validate that enhanced format is backward compatible', () => {
      // Enhanced format should be validated by both validators
      const enhancedFormat = `cat_${testCategoryId}_1704067200000_123.jpg`;
      
      expect(categoryService.validateCategoryImageAssociation(testCategoryId, enhancedFormat)).toBe(true);
      expect(enhancedImageProcessor.validateCategoryImageAssociation(testCategoryId, enhancedFormat)).toBe(true);
    });

    it('should demonstrate unique naming prevents conflicts', () => {
      const filename = 'same-name.jpg';
      const category1 = '507f1f77bcf86cd799439011';
      const category2 = '507f1f77bcf86cd799439012';
      
      const name1 = enhancedImageProcessor.generateUniqueImageName(category1, filename);
      const name2 = enhancedImageProcessor.generateUniqueImageName(category2, filename);
      
      // Names should be different
      expect(name1).not.toBe(name2);
      
      // Each should only validate for its own category
      expect(enhancedImageProcessor.validateCategoryImageAssociation(category1, name1)).toBe(true);
      expect(enhancedImageProcessor.validateCategoryImageAssociation(category1, name2)).toBe(false);
      expect(enhancedImageProcessor.validateCategoryImageAssociation(category2, name1)).toBe(false);
      expect(enhancedImageProcessor.validateCategoryImageAssociation(category2, name2)).toBe(true);
    });
  });
});