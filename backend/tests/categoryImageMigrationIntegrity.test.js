/**
 * Category Image Migration and Integrity Tests
 * 
 * Tests for the category unique images migration system and integrity checking.
 * 
 * Requirements: 4.3, 1.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import categoryModel from '../models/categoryModel.js';
import CategoryImageIntegrity from '../utils/categoryImageIntegrity.js';
import { 
  generateUniqueImageName, 
  isUniqueNamingFormat, 
  extractCategoryIdFromFilename 
} from '../scripts/migrateCategoryUniqueImages.js';

// Mock logger to avoid file system operations in tests
vi.mock('../utils/logger.js', () => ({
  logger: {
    image: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn()
    }
  }
}));

// Mock categoryModel
vi.mock('../models/categoryModel.js', () => ({
  default: {
    find: vi.fn(),
    countDocuments: vi.fn()
  }
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  testCategoriesDir: path.join(__dirname, 'test-categories'),
  testBackupDir: path.join(__dirname, 'test-backups')
};

describe('Category Image Migration and Integrity', () => {
  let testCategoryId;
  let imageIntegrity;

  beforeEach(async () => {
    // Create test directories
    if (!fs.existsSync(TEST_CONFIG.testCategoriesDir)) {
      fs.mkdirSync(TEST_CONFIG.testCategoriesDir, { recursive: true });
    }
    if (!fs.existsSync(TEST_CONFIG.testBackupDir)) {
      fs.mkdirSync(TEST_CONFIG.testBackupDir, { recursive: true });
    }

    // Create test category ID
    testCategoryId = new mongoose.Types.ObjectId().toString();

    // Initialize integrity checker with test directory
    imageIntegrity = new CategoryImageIntegrity();
    imageIntegrity.categoriesDir = TEST_CONFIG.testCategoriesDir;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test directories
    if (fs.existsSync(TEST_CONFIG.testCategoriesDir)) {
      fs.rmSync(TEST_CONFIG.testCategoriesDir, { recursive: true, force: true });
    }
    if (fs.existsSync(TEST_CONFIG.testBackupDir)) {
      fs.rmSync(TEST_CONFIG.testBackupDir, { recursive: true, force: true });
    }
  });

  describe('Unique Image Naming', () => {
    it('should generate unique image names with correct format', () => {
      const originalFilename = 'test-image.jpg';
      const uniqueName = generateUniqueImageName(testCategoryId, originalFilename);
      
      expect(uniqueName).toMatch(new RegExp(`^cat_${testCategoryId}_\\d+_\\d+\\.jpg$`));
      expect(uniqueName).toContain(testCategoryId);
      expect(uniqueName).toContain('.jpg');
    });

    it('should generate different names for multiple calls', () => {
      const originalFilename = 'test-image.jpg';
      const name1 = generateUniqueImageName(testCategoryId, originalFilename);
      
      // Wait a bit to ensure different timestamp
      const name2 = generateUniqueImageName(testCategoryId, originalFilename);
      
      expect(name1).not.toBe(name2);
      expect(isUniqueNamingFormat(name1)).toBe(true);
      expect(isUniqueNamingFormat(name2)).toBe(true);
    });

    it('should preserve file extensions correctly', () => {
      const testCases = [
        { input: 'image.jpg', expected: '.jpg' },
        { input: 'image.png', expected: '.png' },
        { input: 'image.webp', expected: '.webp' },
        { input: 'image.jpeg', expected: '.jpeg' }
      ];

      testCases.forEach(({ input, expected }) => {
        const uniqueName = generateUniqueImageName(testCategoryId, input);
        expect(uniqueName.endsWith(expected)).toBe(true);
      });
    });
  });

  describe('Unique Naming Format Validation', () => {
    it('should validate correct unique naming format', () => {
      const validNames = [
        `cat_${testCategoryId}_1704067200000_123456.jpg`,
        `cat_${testCategoryId}_1704067200000_789012.png`,
        `cat_${testCategoryId}_1704067200000_345678.webp`
      ];

      validNames.forEach(name => {
        expect(isUniqueNamingFormat(name)).toBe(true);
      });
    });

    it('should reject invalid naming formats', () => {
      const invalidNames = [
        'category_image.jpg',
        'cat_invalid_id_123.jpg',
        `cat_${testCategoryId}_123.jpg`, // Missing random suffix
        `category_${testCategoryId}_123_456.jpg`, // Wrong prefix
        'regular-image-name.jpg'
      ];

      invalidNames.forEach(name => {
        expect(isUniqueNamingFormat(name)).toBe(false);
      });
    });
  });

  describe('Category ID Extraction', () => {
    it('should extract category ID from valid unique filenames', () => {
      const filename = `cat_${testCategoryId}_1704067200000_123456.jpg`;
      const extractedId = extractCategoryIdFromFilename(filename);
      
      expect(extractedId).toBe(testCategoryId);
    });

    it('should return null for invalid filenames', () => {
      const invalidFilenames = [
        'category_image.jpg',
        'cat_invalid_id_123.jpg',
        'regular-image.jpg'
      ];

      invalidFilenames.forEach(filename => {
        expect(extractCategoryIdFromFilename(filename)).toBeNull();
      });
    });
  });

  describe('Orphaned Images Detection', () => {
    beforeEach(() => {
      // Create test image files
      const testFiles = [
        `cat_${testCategoryId}_1704067200000_123456.jpg`,
        'legacy_image.jpg',
        'orphaned_image.png'
      ];

      testFiles.forEach(filename => {
        const filePath = path.join(TEST_CONFIG.testCategoriesDir, filename);
        fs.writeFileSync(filePath, 'test image content');
      });
    });

    it('should identify orphaned images correctly', async () => {
      // Mock category model to return no categories
      categoryModel.find.mockResolvedValue([]);

      const result = await imageIntegrity.findOrphanedImages();
      
      expect(result.success).toBe(true);
      expect(result.orphanedFiles).toHaveLength(3);
      expect(result.orphanedFiles).toContain(`cat_${testCategoryId}_1704067200000_123456.jpg`);
      expect(result.orphanedFiles).toContain('legacy_image.jpg');
      expect(result.orphanedFiles).toContain('orphaned_image.png');
    });

    it('should exclude referenced images from orphaned list', async () => {
      // Mock category model to return category with referenced image
      const mockCategory = {
        _id: testCategoryId,
        name: 'Test Category',
        image: `/uploads/categories/cat_${testCategoryId}_1704067200000_123456.jpg`
      };
      
      categoryModel.find.mockResolvedValue([mockCategory]);

      const result = await imageIntegrity.findOrphanedImages();
      
      expect(result.success).toBe(true);
      expect(result.orphanedFiles).toHaveLength(2);
      expect(result.orphanedFiles).not.toContain(`cat_${testCategoryId}_1704067200000_123456.jpg`);
      expect(result.orphanedFiles).toContain('legacy_image.jpg');
      expect(result.orphanedFiles).toContain('orphaned_image.png');
    });
  });

  describe('Missing Files Detection', () => {
    it('should identify categories with missing image files', async () => {
      // Mock categories that reference non-existent files
      const mockCategories = [
        {
          _id: testCategoryId,
          name: 'Test Category 1',
          image: '/uploads/categories/missing_image1.jpg'
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          name: 'Test Category 2',
          image: '/uploads/categories/missing_image2.jpg'
        }
      ];
      
      categoryModel.find.mockResolvedValue(mockCategories);

      const result = await imageIntegrity.findMissingImageFiles();
      
      expect(result.success).toBe(true);
      expect(result.missingFiles).toHaveLength(2);
      expect(result.missingFiles[0]).toMatchObject({
        categoryId: testCategoryId,
        categoryName: 'Test Category 1',
        filename: 'missing_image1.jpg'
      });
    });

    it('should not report missing files for existing images', async () => {
      // Create test image file
      const filename = `cat_${testCategoryId}_1704067200000_123456.jpg`;
      const filePath = path.join(TEST_CONFIG.testCategoriesDir, filename);
      fs.writeFileSync(filePath, 'test image content');

      // Mock category that references existing file
      const mockCategory = {
        _id: testCategoryId,
        name: 'Test Category',
        image: `/uploads/categories/${filename}`
      };
      
      categoryModel.find.mockResolvedValue([mockCategory]);

      const result = await imageIntegrity.findMissingImageFiles();
      
      expect(result.success).toBe(true);
      expect(result.missingFiles).toHaveLength(0);
    });
  });

  describe('Invalid Naming Detection', () => {
    it('should identify categories with invalid image naming', async () => {
      const mockCategories = [
        {
          _id: testCategoryId,
          name: 'Legacy Category',
          image: '/uploads/categories/legacy_image.jpg'
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          name: 'Wrong ID Category',
          image: `/uploads/categories/cat_${new mongoose.Types.ObjectId().toString()}_1704067200000_123456.jpg`
        }
      ];
      
      categoryModel.find.mockResolvedValue(mockCategories);

      const result = await imageIntegrity.findInvalidImageNaming();
      
      expect(result.success).toBe(true);
      expect(result.invalidNaming).toHaveLength(2);
      
      // Check legacy format detection
      expect(result.invalidNaming[0]).toMatchObject({
        categoryId: testCategoryId,
        issue: 'non_unique_format'
      });
      
      // Check ID mismatch detection
      expect(result.invalidNaming[1]).toMatchObject({
        issue: 'id_mismatch'
      });
    });

    it('should not report issues for valid unique naming', async () => {
      const filename = `cat_${testCategoryId}_1704067200000_123456.jpg`;
      const mockCategory = {
        _id: testCategoryId,
        name: 'Valid Category',
        image: `/uploads/categories/${filename}`
      };
      
      categoryModel.find.mockResolvedValue([mockCategory]);

      const result = await imageIntegrity.findInvalidImageNaming();
      
      expect(result.success).toBe(true);
      expect(result.invalidNaming).toHaveLength(0);
    });
  });

  describe('Comprehensive Integrity Check', () => {
    beforeEach(() => {
      // Create mixed test scenario
      const testFiles = [
        `cat_${testCategoryId}_1704067200000_123456.jpg`, // Valid
        'legacy_image.jpg', // Legacy format
        'orphaned_image.png' // Orphaned
      ];

      testFiles.forEach(filename => {
        const filePath = path.join(TEST_CONFIG.testCategoriesDir, filename);
        fs.writeFileSync(filePath, 'test image content');
      });
    });

    it('should perform comprehensive integrity check', async () => {
      const anotherCategoryId = new mongoose.Types.ObjectId().toString();
      
      const mockCategories = [
        {
          _id: testCategoryId,
          name: 'Valid Category',
          image: `/uploads/categories/cat_${testCategoryId}_1704067200000_123456.jpg`
        },
        {
          _id: anotherCategoryId,
          name: 'Legacy Category',
          image: '/uploads/categories/legacy_image.jpg'
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          name: 'Missing File Category',
          image: '/uploads/categories/missing_file.jpg'
        }
      ];
      
      categoryModel.find.mockResolvedValue(mockCategories);

      const report = await imageIntegrity.performIntegrityCheck();
      
      expect(report.timestamp).toBeDefined();
      expect(report.summary.totalIssues).toBeGreaterThan(0);
      expect(report.summary.isHealthy).toBe(false);
      
      // Should detect orphaned image
      expect(report.orphanedImages.orphanedFiles).toContain('orphaned_image.png');
      
      // Should detect missing file
      expect(report.missingFiles.missingFiles).toHaveLength(1);
      expect(report.missingFiles.missingFiles[0].filename).toBe('missing_file.jpg');
      
      // Should detect invalid naming
      expect(report.invalidNaming.invalidNaming).toHaveLength(1);
      expect(report.invalidNaming.invalidNaming[0].issue).toBe('non_unique_format');
    });

    it('should report healthy system when no issues found', async () => {
      const filename = `cat_${testCategoryId}_1704067200000_123456.jpg`;
      const mockCategory = {
        _id: testCategoryId,
        name: 'Valid Category',
        image: `/uploads/categories/${filename}`
      };
      
      categoryModel.find.mockResolvedValue([mockCategory]);

      // Remove orphaned files
      fs.unlinkSync(path.join(TEST_CONFIG.testCategoriesDir, 'legacy_image.jpg'));
      fs.unlinkSync(path.join(TEST_CONFIG.testCategoriesDir, 'orphaned_image.png'));

      const report = await imageIntegrity.performIntegrityCheck();
      
      expect(report.summary.totalIssues).toBe(0);
      expect(report.summary.isHealthy).toBe(true);
    });
  });

  describe('Category Image Association Validation', () => {
    it('should validate correct category-image associations', () => {
      const validAssociations = [
        {
          categoryId: testCategoryId,
          imagePath: `/uploads/categories/cat_${testCategoryId}_1704067200000_123456.jpg`
        },
        {
          categoryId: testCategoryId,
          imagePath: `cat_${testCategoryId}_1704067200000_789012.png`
        }
      ];

      validAssociations.forEach(({ categoryId, imagePath }) => {
        expect(imageIntegrity.validateCategoryImageAssociation(categoryId, imagePath)).toBe(true);
      });
    });

    it('should reject invalid category-image associations', () => {
      const anotherCategoryId = new mongoose.Types.ObjectId().toString();
      
      const invalidAssociations = [
        {
          categoryId: testCategoryId,
          imagePath: `/uploads/categories/cat_${anotherCategoryId}_1704067200000_123456.jpg`
        },
        {
          categoryId: testCategoryId,
          imagePath: '/uploads/categories/legacy_image.jpg'
        },
        {
          categoryId: null,
          imagePath: `/uploads/categories/cat_${testCategoryId}_1704067200000_123456.jpg`
        },
        {
          categoryId: testCategoryId,
          imagePath: null
        }
      ];

      invalidAssociations.forEach(({ categoryId, imagePath }) => {
        expect(imageIntegrity.validateCategoryImageAssociation(categoryId, imagePath)).toBe(false);
      });
    });
  });

  describe('Storage Statistics', () => {
    beforeEach(() => {
      // Create test files with different sizes
      const testFiles = [
        { name: 'small_image.jpg', size: 1024 },
        { name: 'medium_image.png', size: 5120 },
        { name: 'large_image.webp', size: 10240 }
      ];

      testFiles.forEach(({ name, size }) => {
        const filePath = path.join(TEST_CONFIG.testCategoriesDir, name);
        const content = Buffer.alloc(size, 'x');
        fs.writeFileSync(filePath, content);
      });
    });

    it('should calculate storage statistics correctly', async () => {
      categoryModel.countDocuments
        .mockResolvedValueOnce(5) // Total categories
        .mockResolvedValueOnce(3); // Categories with images

      const result = await imageIntegrity.getStorageStatistics();
      
      expect(result.success).toBe(true);
      expect(result.statistics.totalFiles).toBe(3);
      expect(result.statistics.totalSize).toBe(16384); // 1024 + 5120 + 10240
      expect(result.statistics.averageSize).toBe(5461); // 16384 / 3
      expect(result.statistics.totalCategories).toBe(5);
      expect(result.statistics.categoriesWithImages).toBe(3);
      expect(result.statistics.storageEfficiency).toBe(60); // (3/5) * 100
      
      // Check largest and smallest files
      expect(result.statistics.largestFile.filename).toBe('large_image.webp');
      expect(result.statistics.largestFile.size).toBe(10240);
      expect(result.statistics.smallestFile.filename).toBe('small_image.jpg');
      expect(result.statistics.smallestFile.size).toBe(1024);
    });
  });
});