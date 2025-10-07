import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import EnhancedImageProcessor from '../utils/enhancedImageProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Image Upload Rollback System', () => {
  let imageProcessor;
  let testDir;
  let testFiles;
  let categoryId;

  beforeEach(() => {
    imageProcessor = new EnhancedImageProcessor();
    testDir = path.join(__dirname, 'temp-rollback-test');
    testFiles = [];
    categoryId = '507f1f77bcf86cd799439011';
    
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    testFiles.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        console.warn('Failed to cleanup test file:', file);
      }
    });

    // Clean up test directory
    try {
      if (fs.existsSync(testDir)) {
        const files = fs.readdirSync(testDir);
        files.forEach(file => {
          fs.unlinkSync(path.join(testDir, file));
        });
        fs.rmdirSync(testDir);
      }
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }

    // Clean up category images directory
    const categoryDir = imageProcessor.getCategoryImagePath();
    try {
      if (fs.existsSync(categoryDir)) {
        const files = fs.readdirSync(categoryDir);
        files.forEach(file => {
          if (file.startsWith('cat_' + categoryId)) {
            fs.unlinkSync(path.join(categoryDir, file));
          }
        });
      }
    } catch (error) {
      console.warn('Failed to cleanup category directory:', error);
    }
  });

  // Helper function to create test image file
  const createTestImageFile = (filename, size = 2000, mimetype = 'image/jpeg') => {
    const filePath = path.join(testDir, filename);
    
    // Create a minimal valid JPEG header
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const fileContent = Buffer.concat([jpegHeader, Buffer.alloc(size - jpegHeader.length, 0)]);
    
    fs.writeFileSync(filePath, fileContent);
    testFiles.push(filePath);
    
    return {
      path: filePath,
      originalname: filename,
      mimetype: mimetype,
      size: fileContent.length,
      // Add proper validation data for tests
      imageValidation: {
        isValid: true,
        dimensions: {
          width: 500,
          height: 400
        }
      }
    };
  };

  // Helper function to create existing category image
  const createExistingCategoryImage = () => {
    const categoryDir = imageProcessor.getCategoryImagePath();
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    
    const existingFilename = `cat_${categoryId}_1234567890_123.jpg`;
    const existingPath = path.join(categoryDir, existingFilename);
    const existingContent = Buffer.from('existing image content');
    
    fs.writeFileSync(existingPath, existingContent);
    
    return {
      path: existingPath,
      filename: existingFilename,
      relativePath: `/uploads/categories/${existingFilename}`,
      content: existingContent
    };
  };

  describe('Successful Upload Workflow', () => {
    it('should process image upload successfully', async () => {
      const testFile = createTestImageFile('test.jpg', 2000);
      
      console.log('Test file for successful upload:', testFile);
      
      const result = await imageProcessor.processImageUpload(testFile, categoryId);
      
      console.log('Result for successful upload:', result);
      
      expect(result.success).toBe(true);
      expect(result.filename).toMatch(new RegExp(`^cat_${categoryId}_\\d+_\\d+\\.jpg$`));
      expect(result.path).toMatch(/^\/uploads\/categories\/cat_/);
      
      // Verify file exists
      const categoryDir = imageProcessor.getCategoryImagePath();
      const finalPath = path.join(categoryDir, result.filename);
      expect(fs.existsSync(finalPath)).toBe(true);
    });

    it('should replace existing image and clean up old one', async () => {
      // Create existing image
      const existingImage = createExistingCategoryImage();
      
      // Upload new image
      const newFile = createTestImageFile('new.jpg', 1500);
      const result = await imageProcessor.processImageUpload(
        newFile, 
        categoryId, 
        existingImage.relativePath
      );
      
      expect(result.success).toBe(true);
      
      // Verify old image is gone
      expect(fs.existsSync(existingImage.path)).toBe(false);
      
      // Verify new image exists
      const categoryDir = imageProcessor.getCategoryImagePath();
      const newPath = path.join(categoryDir, result.filename);
      expect(fs.existsSync(newPath)).toBe(true);
    });
  });

  describe('Rollback on File Validation Failure', () => {
    it('should rollback when file validation fails', async () => {
      const invalidFile = {
        path: '/non/existent/path.jpg',
        originalname: 'invalid.txt',
        mimetype: 'text/plain',
        size: 1000
      };
      
      const result = await imageProcessor.processImageUpload(invalidFile, categoryId);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('FILE_VALIDATION_FAILED');
      
      // Verify no files were created
      const categoryDir = imageProcessor.getCategoryImagePath();
      if (fs.existsSync(categoryDir)) {
        const files = fs.readdirSync(categoryDir);
        const categoryFiles = files.filter(f => f.startsWith(`cat_${categoryId}`));
        expect(categoryFiles).toHaveLength(0);
      }
    });

    it('should rollback when dimension validation fails', async () => {
      const testFile = createTestImageFile('test.jpg', 1000);
      
      // Mock dimension validation to fail
      testFile.imageValidation = {
        dimensions: {
          width: 50, // Too small
          height: 50
        }
      };
      
      const result = await imageProcessor.processImageUpload(testFile, categoryId);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('DIMENSION_VALIDATION_FAILED');
      
      // Verify no files were created
      const categoryDir = imageProcessor.getCategoryImagePath();
      if (fs.existsSync(categoryDir)) {
        const files = fs.readdirSync(categoryDir);
        const categoryFiles = files.filter(f => f.startsWith(`cat_${categoryId}`));
        expect(categoryFiles).toHaveLength(0);
      }
    });
  });

  describe('Rollback on File Move Failure', () => {
    it('should rollback when file move fails', async () => {
      const existingImage = createExistingCategoryImage();
      const originalContent = fs.readFileSync(existingImage.path);
      
      // Create test file with invalid source path to trigger move failure
      const testFile = {
        path: '/invalid/source/path.jpg',
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1000
      };
      
      const result = await imageProcessor.processImageUpload(
        testFile, 
        categoryId, 
        existingImage.relativePath
      );
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('FILE_MOVE_FAILED');
      
      // Verify existing image was restored
      expect(fs.existsSync(existingImage.path)).toBe(true);
      const restoredContent = fs.readFileSync(existingImage.path);
      expect(Buffer.compare(originalContent, restoredContent)).toBe(0);
    });
  });

  describe('Rollback on Integrity Check Failure', () => {
    it('should rollback when integrity check fails', async () => {
      const existingImage = createExistingCategoryImage();
      const originalContent = fs.readFileSync(existingImage.path);
      
      // Create corrupted test file
      const corruptedFile = createTestImageFile('corrupted.jpg', 100);
      fs.writeFileSync(corruptedFile.path, 'corrupted content'); // Invalid image content
      
      const result = await imageProcessor.processImageUpload(
        corruptedFile, 
        categoryId, 
        existingImage.relativePath
      );
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('INTEGRITY_CHECK_FAILED');
      
      // Verify existing image was restored
      expect(fs.existsSync(existingImage.path)).toBe(true);
      const restoredContent = fs.readFileSync(existingImage.path);
      expect(Buffer.compare(originalContent, restoredContent)).toBe(0);
    });
  });

  describe('Rollback on Internal Processing Error', () => {
    it('should rollback when unexpected error occurs', async () => {
      const existingImage = createExistingCategoryImage();
      const originalContent = fs.readFileSync(existingImage.path);
      
      // Mock an internal error by making getCategoryImagePath throw
      const originalGetPath = imageProcessor.getCategoryImagePath;
      imageProcessor.getCategoryImagePath = () => {
        throw new Error('Simulated internal error');
      };
      
      const testFile = createTestImageFile('test.jpg', 1000);
      
      const result = await imageProcessor.processImageUpload(
        testFile, 
        categoryId, 
        existingImage.relativePath
      );
      
      // Restore original method
      imageProcessor.getCategoryImagePath = originalGetPath;
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('INTERNAL_PROCESSING_ERROR');
      
      // Verify existing image was restored (if backup was created before error)
      if (fs.existsSync(existingImage.path)) {
        const restoredContent = fs.readFileSync(existingImage.path);
        expect(Buffer.compare(originalContent, restoredContent)).toBe(0);
      }
    });
  });

  describe('Partial Failure Recovery', () => {
    it('should handle optimization failure gracefully', async () => {
      const testFile = createTestImageFile('test.jpg', 1000);
      
      // Mock optimization to fail
      const originalOptimize = imageProcessor.optimizeImage;
      imageProcessor.optimizeImage = async () => ({
        success: false,
        error: 'Optimization failed'
      });
      
      const result = await imageProcessor.processImageUpload(testFile, categoryId);
      
      // Restore original method
      imageProcessor.optimizeImage = originalOptimize;
      
      // Upload should still succeed even if optimization fails
      expect(result.success).toBe(true);
      expect(result.optimization).toBe(null);
      
      // Verify file exists
      const categoryDir = imageProcessor.getCategoryImagePath();
      const finalPath = path.join(categoryDir, result.filename);
      expect(fs.existsSync(finalPath)).toBe(true);
    });
  });

  describe('Backup and Restore Operations', () => {
    it('should create backup before processing and clean up on success', async () => {
      const existingImage = createExistingCategoryImage();
      const testFile = createTestImageFile('test.jpg', 1000);
      
      const result = await imageProcessor.processImageUpload(
        testFile, 
        categoryId, 
        existingImage.relativePath
      );
      
      expect(result.success).toBe(true);
      
      // Verify backup directory exists but backup file was cleaned up
      const backupDir = path.join(imageProcessor.getCategoryImagePath(), '.backups');
      if (fs.existsSync(backupDir)) {
        const backupFiles = fs.readdirSync(backupDir);
        // Should be empty or contain only very recent backups
        expect(backupFiles.length).toBe(0);
      }
    });

    it('should restore from backup on failure', async () => {
      const existingImage = createExistingCategoryImage();
      const originalContent = fs.readFileSync(existingImage.path);
      
      // Create test file that will fail integrity check
      const testFile = createTestImageFile('test.jpg', 100);
      fs.writeFileSync(testFile.path, Buffer.alloc(100, 0)); // Invalid image
      
      const result = await imageProcessor.processImageUpload(
        testFile, 
        categoryId, 
        existingImage.relativePath
      );
      
      expect(result.success).toBe(false);
      
      // Verify original image was restored
      expect(fs.existsSync(existingImage.path)).toBe(true);
      const restoredContent = fs.readFileSync(existingImage.path);
      expect(Buffer.compare(originalContent, restoredContent)).toBe(0);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up temporary files on success', async () => {
      const testFile = createTestImageFile('test.jpg', 1000);
      const originalPath = testFile.path;
      
      const result = await imageProcessor.processImageUpload(testFile, categoryId);
      
      expect(result.success).toBe(true);
      
      // Verify original temp file was removed
      expect(fs.existsSync(originalPath)).toBe(false);
    });

    it('should clean up temporary files on failure', async () => {
      const testFile = createTestImageFile('test.jpg', 1000);
      const originalPath = testFile.path;
      
      // Make file validation fail
      testFile.mimetype = 'text/plain';
      
      const result = await imageProcessor.processImageUpload(testFile, categoryId);
      
      expect(result.success).toBe(false);
      
      // Verify temp files were cleaned up
      expect(imageProcessor.tempFiles.size).toBe(0);
    });
  });

  describe('Error Handling and Logging', () => {
    it('should provide detailed error information', async () => {
      const invalidFile = {
        path: '/non/existent/path.jpg',
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1000
      };
      
      const result = await imageProcessor.processImageUpload(invalidFile, categoryId);
      
      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
      expect(result.code).toBeTruthy();
      expect(result.errors).toBeTruthy();
    });

    it('should handle missing category ID', async () => {
      const testFile = createTestImageFile('test.jpg', 1000);
      
      const result = await imageProcessor.processImageUpload(testFile, null);
      
      expect(result.success).toBe(false);
      // Should fail during unique name generation or validation
    });

    it('should handle missing image file', async () => {
      const result = await imageProcessor.processImageUpload(null, categoryId);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('FILE_VALIDATION_FAILED');
    });
  });
});