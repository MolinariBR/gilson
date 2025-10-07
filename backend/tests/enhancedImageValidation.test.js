import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import EnhancedImageProcessor from '../utils/enhancedImageProcessor.js';
import { validateCategoryImage, validateImageDimensions } from '../utils/categoryValidation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Enhanced Image Validation and Processing', () => {
  let imageProcessor;
  let testDir;
  let testFiles;

  beforeEach(() => {
    imageProcessor = new EnhancedImageProcessor();
    testDir = path.join(__dirname, 'temp-test-images');
    testFiles = [];
    
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
  });

  // Helper function to create test image file
  const createTestImageFile = (filename, content = null, mimetype = 'image/jpeg') => {
    const filePath = path.join(testDir, filename);
    
    // Create a minimal valid JPEG header if no content provided
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const webpHeader = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    
    let fileContent = content;
    if (!fileContent) {
      if (mimetype === 'image/png') {
        fileContent = Buffer.concat([pngHeader, Buffer.alloc(1000, 0)]);
      } else if (mimetype === 'image/webp') {
        fileContent = Buffer.concat([webpHeader, Buffer.alloc(1000, 0)]);
      } else {
        fileContent = Buffer.concat([jpegHeader, Buffer.alloc(1000, 0)]);
      }
    }
    
    fs.writeFileSync(filePath, fileContent);
    testFiles.push(filePath);
    
    return {
      path: filePath,
      originalname: filename,
      mimetype: mimetype,
      size: fileContent.length
    };
  };

  describe('File Validation', () => {
    it('should validate valid image files', () => {
      const validFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 500 // 500KB
      };

      const result = validateCategoryImage(validFile);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject files with invalid MIME types', () => {
      const invalidFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024
      };

      const result = validateCategoryImage(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.image).toContain('Formato de imagem inválido');
    });

    it('should reject files that are too large', () => {
      const largeFile = {
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 3 * 1024 * 1024 // 3MB
      };

      const result = validateCategoryImage(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.image).toContain('máximo 2MB');
    });

    it('should reject files that are too small', () => {
      const tinyFile = {
        originalname: 'tiny.jpg',
        mimetype: 'image/jpeg',
        size: 500 // 500 bytes
      };

      const result = validateCategoryImage(tinyFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.image).toContain('muito pequeno');
    });

    it('should reject files with mismatched extension and MIME type', () => {
      const mismatchedFile = {
        originalname: 'test.png',
        mimetype: 'image/jpeg',
        size: 1024
      };

      const result = validateCategoryImage(mismatchedFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.image).toContain('não corresponde ao tipo');
    });

    it('should reject files with dangerous characters in filename', () => {
      const dangerousFile = {
        originalname: 'test<script>.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };

      const result = validateCategoryImage(dangerousFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.image).toContain('caracteres inválidos');
    });

    it('should reject files with path traversal attempts', () => {
      const pathTraversalFile = {
        originalname: '../../../etc/passwd.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };

      const result = validateCategoryImage(pathTraversalFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.image).toContain('Nome do arquivo inválido');
    });
  });

  describe('Dimension Validation', () => {
    it('should validate images with correct dimensions', () => {
      const imageValidation = {
        dimensions: {
          width: 500,
          height: 400
        }
      };

      const result = validateImageDimensions(imageValidation);
      expect(result.isValid).toBe(true);
    });

    it('should reject images that are too small', () => {
      const imageValidation = {
        dimensions: {
          width: 50,
          height: 50
        }
      };

      const result = validateImageDimensions(imageValidation);
      expect(result.isValid).toBe(false);
      expect(result.errors.image).toContain('muito pequenas');
    });

    it('should reject images that are too large', () => {
      const imageValidation = {
        dimensions: {
          width: 3000,
          height: 2500
        }
      };

      const result = validateImageDimensions(imageValidation);
      expect(result.isValid).toBe(false);
      expect(result.errors.image).toContain('muito grandes');
    });

    it('should reject images with invalid aspect ratio', () => {
      const imageValidation = {
        dimensions: {
          width: 1000,
          height: 100 // Aspect ratio 10:1
        }
      };

      const result = validateImageDimensions(imageValidation);
      expect(result.isValid).toBe(false);
      expect(result.errors.image).toContain('Proporção da imagem inválida');
    });
  });

  describe('Image Header Validation', () => {
    it('should validate JPEG header', () => {
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const result = imageProcessor.validateImageHeader(jpegHeader);
      expect(result).toBe(true);
    });

    it('should validate PNG header', () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
      const result = imageProcessor.validateImageHeader(pngHeader);
      expect(result).toBe(true);
    });

    it('should validate WebP header', () => {
      const webpHeader = Buffer.from([0x52, 0x49, 0x46, 0x46]);
      const result = imageProcessor.validateImageHeader(webpHeader);
      expect(result).toBe(true);
    });

    it('should reject invalid headers', () => {
      const invalidHeader = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const result = imageProcessor.validateImageHeader(invalidHeader);
      expect(result).toBe(false);
    });
  });

  describe('Unique Image Naming', () => {
    it('should generate unique names with category ID', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const originalFilename = 'test.jpg';
      
      const uniqueName = imageProcessor.generateUniqueImageName(categoryId, originalFilename);
      
      expect(uniqueName).toMatch(new RegExp(`^cat_${categoryId}_\\d+_\\d+\\.jpg$`));
    });

    it('should generate different names for same inputs', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const originalFilename = 'test.jpg';
      
      const name1 = imageProcessor.generateUniqueImageName(categoryId, originalFilename);
      const name2 = imageProcessor.generateUniqueImageName(categoryId, originalFilename);
      
      expect(name1).not.toBe(name2);
    });

    it('should preserve file extension', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      
      const jpegName = imageProcessor.generateUniqueImageName(categoryId, 'test.jpg');
      const pngName = imageProcessor.generateUniqueImageName(categoryId, 'test.png');
      const webpName = imageProcessor.generateUniqueImageName(categoryId, 'test.webp');
      
      expect(jpegName).toMatch(/\.jpg$/);
      expect(pngName).toMatch(/\.png$/);
      expect(webpName).toMatch(/\.webp$/);
    });
  });

  describe('Category Image Association Validation', () => {
    it('should validate correct association', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const imagePath = '/uploads/categories/cat_507f1f77bcf86cd799439011_1234567890_123.jpg';
      
      const result = imageProcessor.validateCategoryImageAssociation(categoryId, imagePath);
      expect(result).toBe(true);
    });

    it('should reject incorrect association', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const imagePath = '/uploads/categories/cat_different_id_1234567890_123.jpg';
      
      const result = imageProcessor.validateCategoryImageAssociation(categoryId, imagePath);
      expect(result).toBe(false);
    });

    it('should handle filename without path', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const filename = 'cat_507f1f77bcf86cd799439011_1234567890_123.jpg';
      
      const result = imageProcessor.validateCategoryImageAssociation(categoryId, filename);
      expect(result).toBe(true);
    });
  });

  describe('Image Integrity Verification', () => {
    it('should verify valid JPEG file', async () => {
      const testFile = createTestImageFile('test.jpg', null, 'image/jpeg');
      
      const result = await imageProcessor.verifyImageIntegrity(testFile.path);
      expect(result.success).toBe(true);
    });

    it('should reject empty files', async () => {
      const emptyFile = path.join(testDir, 'empty.jpg');
      fs.writeFileSync(emptyFile, '');
      testFiles.push(emptyFile);
      
      const result = await imageProcessor.verifyImageIntegrity(emptyFile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject files with invalid headers', async () => {
      const invalidFile = path.join(testDir, 'invalid.jpg');
      fs.writeFileSync(invalidFile, 'This is not an image file');
      testFiles.push(invalidFile);
      
      const result = await imageProcessor.verifyImageIntegrity(invalidFile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image file header');
    });

    it('should handle non-existent files', async () => {
      const nonExistentFile = path.join(testDir, 'does-not-exist.jpg');
      
      const result = await imageProcessor.verifyImageIntegrity(nonExistentFile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('Rollback System', () => {
    it('should create and restore backups', async () => {
      const originalFile = createTestImageFile('original.jpg');
      const originalContent = fs.readFileSync(originalFile.path);
      
      // Create backup
      const backupResult = await imageProcessor.createImageBackup(originalFile.path);
      expect(backupResult.success).toBe(true);
      expect(fs.existsSync(backupResult.backupPath)).toBe(true);
      
      // Modify original file
      fs.writeFileSync(originalFile.path, 'modified content');
      
      // Restore from backup
      const restoreResult = await imageProcessor.restoreImageBackup(
        backupResult.backupPath, 
        originalFile.path
      );
      expect(restoreResult.success).toBe(true);
      
      // Verify restoration
      const restoredContent = fs.readFileSync(originalFile.path);
      expect(Buffer.compare(originalContent, restoredContent)).toBe(0);
    });

    it('should handle backup of non-existent files', async () => {
      const nonExistentFile = path.join(testDir, 'does-not-exist.jpg');
      
      const result = await imageProcessor.createImageBackup(nonExistentFile);
      expect(result.success).toBe(true);
      expect(result.message).toContain('No image to backup');
    });
  });

  describe('File Operations', () => {
    it('should move files correctly', async () => {
      const sourceFile = createTestImageFile('source.jpg');
      const targetPath = path.join(testDir, 'target.jpg');
      testFiles.push(targetPath);
      
      const result = await imageProcessor.moveImageFile(sourceFile.path, targetPath);
      
      expect(result.success).toBe(true);
      expect(fs.existsSync(targetPath)).toBe(true);
      expect(fs.existsSync(sourceFile.path)).toBe(false);
    });

    it('should handle moving non-existent files', async () => {
      const nonExistentSource = path.join(testDir, 'does-not-exist.jpg');
      const targetPath = path.join(testDir, 'target.jpg');
      
      const result = await imageProcessor.moveImageFile(nonExistentSource, targetPath);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up old backup files', async () => {
      const backupDir = path.join(imageProcessor.getCategoryImagePath(), '.backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Create old backup file
      const oldBackupFile = path.join(backupDir, 'backup_old_file.jpg');
      fs.writeFileSync(oldBackupFile, 'old backup content');
      
      // Set file modification time to past
      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      fs.utimesSync(oldBackupFile, pastTime, pastTime);
      
      const result = await imageProcessor.cleanupOldBackups(24 * 60 * 60 * 1000); // 24 hours
      
      expect(result.success).toBe(true);
      expect(result.cleaned).toBeGreaterThan(0);
      expect(fs.existsSync(oldBackupFile)).toBe(false);
    });
  });
});