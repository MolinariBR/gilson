/**
 * Image Inconsistency Detector Tests
 * 
 * Comprehensive tests for image inconsistency detection and correction functionality.
 * 
 * Requirements: 4.3, 6.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ImageInconsistencyDetector from '../utils/imageInconsistencyDetector.js';
import categoryModel from '../models/categoryModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock paths for testing
const testUploadsDir = path.join(__dirname, 'temp-test-uploads', 'categories');
const testBackupDir = path.join(testUploadsDir, '.backups');

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    backend: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    },
    image: {
      file: {
        deleted: vi.fn(),
        corrupted: vi.fn()
      },
      serving: {
        error: vi.fn()
      }
    }
  },
  imageLogger: {
    performanceCollector: {
      record: vi.fn()
    }
  }
}));

describe('ImageInconsistencyDetector', () => {
  let detector;
  let testCategoryId1;
  let testCategoryId2;

  beforeEach(async () => {
    // Create test directories
    if (!fs.existsSync(testUploadsDir)) {
      fs.mkdirSync(testUploadsDir, { recursive: true });
    }
    if (!fs.existsSync(testBackupDir)) {
      fs.mkdirSync(testBackupDir, { recursive: true });
    }

    // Create detector instance with test directory
    detector = new ImageInconsistencyDetector();
    detector.categoriesDir = testUploadsDir;
    detector.backupDir = testBackupDir;
    
    // Mock the integrityChecker methods to use test directory
    detector.integrityChecker.categoriesDir = testUploadsDir;
    detector.integrityChecker.getAllImageFiles = () => {
      try {
        if (!fs.existsSync(testUploadsDir)) {
          return [];
        }
        return fs.readdirSync(testUploadsDir).filter(file => {
          const filePath = path.join(testUploadsDir, file);
          return !file.startsWith('.') && fs.statSync(filePath).isFile();
        });
      } catch (error) {
        return [];
      }
    };

    // Generate test category IDs
    testCategoryId1 = '507f1f77bcf86cd799439011';
    testCategoryId2 = '507f1f77bcf86cd799439012';
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
    }
  });

  describe('calculateFileHash', () => {
    it('should calculate MD5 hash for a file', async () => {
      const testFile = path.join(testUploadsDir, 'test.jpg');
      const testContent = 'test image content';
      fs.writeFileSync(testFile, testContent);

      const hash = await detector.calculateFileHash(testFile);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(32); // MD5 hash length
    });

    it('should produce same hash for identical files', async () => {
      const testFile1 = path.join(testUploadsDir, 'test1.jpg');
      const testFile2 = path.join(testUploadsDir, 'test2.jpg');
      const testContent = 'identical content';
      
      fs.writeFileSync(testFile1, testContent);
      fs.writeFileSync(testFile2, testContent);

      const hash1 = await detector.calculateFileHash(testFile1);
      const hash2 = await detector.calculateFileHash(testFile2);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different files', async () => {
      const testFile1 = path.join(testUploadsDir, 'test1.jpg');
      const testFile2 = path.join(testUploadsDir, 'test2.jpg');
      
      fs.writeFileSync(testFile1, 'content 1');
      fs.writeFileSync(testFile2, 'content 2');

      const hash1 = await detector.calculateFileHash(testFile1);
      const hash2 = await detector.calculateFileHash(testFile2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('detectDuplicateImages', () => {
    it('should detect no duplicates when all files are unique', async () => {
      // Create unique test files
      fs.writeFileSync(path.join(testUploadsDir, 'file1.jpg'), 'content 1');
      fs.writeFileSync(path.join(testUploadsDir, 'file2.jpg'), 'content 2');
      fs.writeFileSync(path.join(testUploadsDir, 'file3.jpg'), 'content 3');

      const result = await detector.detectDuplicateImages();
      
      expect(result.success).toBe(true);
      expect(result.duplicates).toHaveLength(0);
      expect(result.statistics.totalFiles).toBe(3);
      expect(result.statistics.totalDuplicateFiles).toBe(0);
      expect(result.statistics.wastedSpace).toBe(0);
    });

    it('should detect duplicate files correctly', async () => {
      // Create duplicate files
      const duplicateContent = 'duplicate content';
      fs.writeFileSync(path.join(testUploadsDir, 'original.jpg'), duplicateContent);
      fs.writeFileSync(path.join(testUploadsDir, 'duplicate1.jpg'), duplicateContent);
      fs.writeFileSync(path.join(testUploadsDir, 'duplicate2.jpg'), duplicateContent);
      fs.writeFileSync(path.join(testUploadsDir, 'unique.jpg'), 'unique content');

      const result = await detector.detectDuplicateImages();
      
      expect(result.success).toBe(true);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].files).toHaveLength(3);
      expect(result.statistics.totalDuplicateFiles).toBe(2); // 3 files - 1 original = 2 duplicates
      expect(result.statistics.wastedSpace).toBeGreaterThan(0);
    });

    it('should handle multiple duplicate groups', async () => {
      // Create two groups of duplicates
      fs.writeFileSync(path.join(testUploadsDir, 'group1_file1.jpg'), 'group 1 content');
      fs.writeFileSync(path.join(testUploadsDir, 'group1_file2.jpg'), 'group 1 content');
      fs.writeFileSync(path.join(testUploadsDir, 'group2_file1.jpg'), 'group 2 content');
      fs.writeFileSync(path.join(testUploadsDir, 'group2_file2.jpg'), 'group 2 content');

      const result = await detector.detectDuplicateImages();
      
      expect(result.success).toBe(true);
      expect(result.duplicates).toHaveLength(2);
      expect(result.statistics.totalDuplicateFiles).toBe(2); // 1 duplicate per group
    });
  });

  describe('detectOrphanedImages', () => {
    beforeEach(() => {
      // Mock categoryModel.find
      vi.spyOn(categoryModel, 'find').mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue([
          {
            _id: testCategoryId1,
            name: 'Category 1',
            image: '/uploads/categories/cat_507f1f77bcf86cd799439011_1234567890_123.jpg'
          },
          {
            _id: testCategoryId2,
            name: 'Category 2',
            image: '/uploads/categories/cat_507f1f77bcf86cd799439012_1234567890_456.jpg'
          }
        ])
      }));
    });

    it('should detect orphaned files correctly', async () => {
      // Create files - some referenced, some orphaned
      fs.writeFileSync(path.join(testUploadsDir, 'cat_507f1f77bcf86cd799439011_1234567890_123.jpg'), 'referenced');
      fs.writeFileSync(path.join(testUploadsDir, 'cat_507f1f77bcf86cd799439012_1234567890_456.jpg'), 'referenced');
      fs.writeFileSync(path.join(testUploadsDir, 'orphaned_file1.jpg'), 'orphaned');
      fs.writeFileSync(path.join(testUploadsDir, 'orphaned_file2.jpg'), 'orphaned');

      const result = await detector.detectOrphanedImages();
      
      expect(result.success).toBe(true);
      expect(result.orphanedFiles).toHaveLength(2);
      expect(result.orphanedFiles).toContain('orphaned_file1.jpg');
      expect(result.orphanedFiles).toContain('orphaned_file2.jpg');
      expect(result.totalFiles).toBe(4);
      expect(result.referencedFiles).toBe(2);
    });

    it('should detect no orphaned files when all are referenced', async () => {
      // Create only referenced files
      fs.writeFileSync(path.join(testUploadsDir, 'cat_507f1f77bcf86cd799439011_1234567890_123.jpg'), 'referenced');
      fs.writeFileSync(path.join(testUploadsDir, 'cat_507f1f77bcf86cd799439012_1234567890_456.jpg'), 'referenced');

      const result = await detector.detectOrphanedImages();
      
      expect(result.success).toBe(true);
      expect(result.orphanedFiles).toHaveLength(0);
      expect(result.totalFiles).toBe(2);
      expect(result.referencedFiles).toBe(2);
    });
  });

  describe('detectIncorrectReferences', () => {
    beforeEach(() => {
      // Mock categoryModel.find
      vi.spyOn(categoryModel, 'find').mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue([
          {
            _id: testCategoryId1,
            name: 'Category 1',
            image: '/uploads/categories/cat_507f1f77bcf86cd799439011_1234567890_123.jpg'
          },
          {
            _id: testCategoryId2,
            name: 'Category 2',
            image: '/uploads/categories/missing_file.jpg' // File doesn't exist
          },
          {
            _id: '507f1f77bcf86cd799439013',
            name: 'Category 3',
            image: '/uploads/categories/legacy_format.jpg' // Non-unique format
          },
          {
            _id: '507f1f77bcf86cd799439014',
            name: 'Category 4',
            image: '/uploads/categories/cat_507f1f77bcf86cd799439999_1234567890_789.jpg' // Wrong ID
          }
        ])
      }));
    });

    it('should detect various types of incorrect references', async () => {
      // Create files for testing
      fs.writeFileSync(path.join(testUploadsDir, 'cat_507f1f77bcf86cd799439011_1234567890_123.jpg'), 'valid');
      fs.writeFileSync(path.join(testUploadsDir, 'legacy_format.jpg'), 'legacy');
      fs.writeFileSync(path.join(testUploadsDir, 'cat_507f1f77bcf86cd799439999_1234567890_789.jpg'), 'wrong id');

      const result = await detector.detectIncorrectReferences();
      
      expect(result.success).toBe(true);
      expect(result.incorrectReferences).toHaveLength(3);
      
      // Check for different issue types
      const issues = result.incorrectReferences.map(ref => ref.issue);
      expect(issues).toContain('file_not_found');
      expect(issues).toContain('non_unique_format');
      expect(issues).toContain('id_mismatch');
    });

    it('should detect no issues when all references are correct', async () => {
      // Mock only valid categories
      categoryModel.find.mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue([
          {
            _id: testCategoryId1,
            name: 'Category 1',
            image: '/uploads/categories/cat_507f1f77bcf86cd799439011_1234567890_123.jpg'
          }
        ])
      }));

      // Create valid file
      fs.writeFileSync(path.join(testUploadsDir, 'cat_507f1f77bcf86cd799439011_1234567890_123.jpg'), 'valid');

      const result = await detector.detectIncorrectReferences();
      
      expect(result.success).toBe(true);
      expect(result.incorrectReferences).toHaveLength(0);
    });
  });

  describe('correctDuplicateImages', () => {
    it('should remove duplicate files keeping the newest', async () => {
      // Create duplicate files with different timestamps
      const duplicateContent = 'duplicate content';
      const oldFile = path.join(testUploadsDir, 'old_duplicate.jpg');
      const newFile = path.join(testUploadsDir, 'new_duplicate.jpg');
      
      fs.writeFileSync(oldFile, duplicateContent);
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      fs.writeFileSync(newFile, duplicateContent);

      // Create duplicate groups structure
      const duplicateGroups = [{
        hash: 'test_hash',
        files: ['old_duplicate.jpg', 'new_duplicate.jpg'],
        size: duplicateContent.length
      }];

      const result = await detector.correctDuplicateImages(duplicateGroups, false);
      
      expect(result.success).toBe(true);
      expect(result.corrected).toBe(1);
      expect(result.freedSpace).toBe(duplicateContent.length);
      
      // Check that newer file is kept and older is removed
      expect(fs.existsSync(newFile)).toBe(true);
      expect(fs.existsSync(oldFile)).toBe(false);
    });

    it('should create backups when requested', async () => {
      const duplicateContent = 'duplicate content';
      const file1 = path.join(testUploadsDir, 'duplicate1.jpg');
      const file2 = path.join(testUploadsDir, 'duplicate2.jpg');
      
      fs.writeFileSync(file1, duplicateContent);
      fs.writeFileSync(file2, duplicateContent);

      const duplicateGroups = [{
        hash: 'test_hash',
        files: ['duplicate1.jpg', 'duplicate2.jpg'],
        size: duplicateContent.length
      }];

      const result = await detector.correctDuplicateImages(duplicateGroups, true);
      
      expect(result.success).toBe(true);
      expect(result.corrected).toBe(1);
      
      // Check that backup was created
      const backupFiles = fs.readdirSync(testBackupDir);
      expect(backupFiles.length).toBe(1);
      expect(backupFiles[0]).toMatch(/^duplicate_\d+_duplicate[12]\.jpg$/);
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate filename with correct format', () => {
      const categoryId = testCategoryId1;
      const originalFilename = 'test.jpg';
      
      const uniqueFilename = detector.generateUniqueFilename(categoryId, originalFilename);
      
      expect(uniqueFilename).toMatch(new RegExp(`^cat_${categoryId}_\\d+_\\d+\\.jpg$`));
    });

    it('should preserve file extension', () => {
      const categoryId = testCategoryId1;
      
      expect(detector.generateUniqueFilename(categoryId, 'test.png')).toMatch(/\.png$/);
      expect(detector.generateUniqueFilename(categoryId, 'test.webp')).toMatch(/\.webp$/);
      expect(detector.generateUniqueFilename(categoryId, 'test.gif')).toMatch(/\.gif$/);
    });

    it('should generate different filenames for same inputs called at different times', async () => {
      const categoryId = testCategoryId1;
      const originalFilename = 'test.jpg';
      
      const filename1 = detector.generateUniqueFilename(categoryId, originalFilename);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const filename2 = detector.generateUniqueFilename(categoryId, originalFilename);
      
      expect(filename1).not.toBe(filename2);
    });
  });

  describe('generateHealthReport', () => {
    beforeEach(() => {
      // Mock categoryModel.find for health report
      vi.spyOn(categoryModel, 'find').mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue([
          {
            _id: testCategoryId1,
            name: 'Category 1',
            image: '/uploads/categories/cat_507f1f77bcf86cd799439011_1234567890_123.jpg'
          }
        ])
      }));
    });

    it('should generate comprehensive health report', async () => {
      // Create test files
      fs.writeFileSync(path.join(testUploadsDir, 'cat_507f1f77bcf86cd799439011_1234567890_123.jpg'), 'valid');
      fs.writeFileSync(path.join(testUploadsDir, 'orphaned.jpg'), 'orphaned');

      const report = await detector.generateHealthReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.system).toBe('category-image-inconsistency-detector');
      expect(report.healthScore).toBeGreaterThanOrEqual(0);
      expect(report.healthScore).toBeLessThanOrEqual(100);
      expect(report.status).toMatch(/^(excellent|good|fair|poor)$/);
      expect(report.summary).toBeDefined();
      expect(report.details).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should calculate health score correctly', async () => {
      // Create only valid files for perfect health
      fs.writeFileSync(path.join(testUploadsDir, 'cat_507f1f77bcf86cd799439011_1234567890_123.jpg'), 'valid');

      const report = await detector.generateHealthReport();
      
      expect(report.healthScore).toBe(100);
      expect(report.status).toBe('excellent');
      expect(report.summary.totalIssues).toBe(0);
    });

    it('should provide recommendations when issues are found', async () => {
      // Create files with issues
      fs.writeFileSync(path.join(testUploadsDir, 'cat_507f1f77bcf86cd799439011_1234567890_123.jpg'), 'valid');
      fs.writeFileSync(path.join(testUploadsDir, 'orphaned.jpg'), 'orphaned');
      fs.writeFileSync(path.join(testUploadsDir, 'duplicate1.jpg'), 'duplicate');
      fs.writeFileSync(path.join(testUploadsDir, 'duplicate2.jpg'), 'duplicate');

      const report = await detector.generateHealthReport();
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0]).toHaveProperty('type');
      expect(report.recommendations[0]).toHaveProperty('priority');
      expect(report.recommendations[0]).toHaveProperty('title');
      expect(report.recommendations[0]).toHaveProperty('description');
      expect(report.recommendations[0]).toHaveProperty('action');
    });
  });

  describe('runComprehensiveCorrection', () => {
    beforeEach(() => {
      // Mock categoryModel for comprehensive correction
      vi.spyOn(categoryModel, 'find').mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue([
          {
            _id: testCategoryId1,
            name: 'Category 1',
            image: '/uploads/categories/cat_507f1f77bcf86cd799439011_1234567890_123.jpg'
          }
        ])
      }));
    });

    it('should run all corrections when enabled', async () => {
      // Create test files with various issues
      fs.writeFileSync(path.join(testUploadsDir, 'cat_507f1f77bcf86cd799439011_1234567890_123.jpg'), 'valid');
      fs.writeFileSync(path.join(testUploadsDir, 'orphaned.jpg'), 'orphaned');
      fs.writeFileSync(path.join(testUploadsDir, 'duplicate1.jpg'), 'duplicate');
      fs.writeFileSync(path.join(testUploadsDir, 'duplicate2.jpg'), 'duplicate');

      const options = {
        correctDuplicates: true,
        correctOrphaned: true,
        correctReferences: true,
        createBackups: false
      };

      const result = await detector.runComprehensiveCorrection(options);
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalCorrected).toBeGreaterThanOrEqual(0);
      expect(result.corrections).toBeDefined();
    });

    it('should skip corrections when disabled', async () => {
      const options = {
        correctDuplicates: false,
        correctOrphaned: false,
        correctReferences: false,
        createBackups: false
      };

      const result = await detector.runComprehensiveCorrection(options);
      
      expect(result.success).toBe(true);
      expect(result.corrections.duplicates).toBeNull();
      expect(result.corrections.orphaned).toBeNull();
      expect(result.corrections.references).toBeNull();
    });
  });
});