import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { 
  validateFileType, 
  validateFileSize, 
  validateImageDimensions,
  ALLOWED_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE 
} from '../middleware/imageValidation.js';

describe('Image Validation Middleware', () => {
  const testUploadDir = 'test-uploads';
  
  beforeEach(() => {
    // Create test upload directory
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testUploadDir)) {
      const files = fs.readdirSync(testUploadDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testUploadDir, file));
      });
      fs.rmdirSync(testUploadDir);
    }
  });

  describe('validateFileType', () => {
    it('should accept valid JPEG file', () => {
      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg'
      };
      
      expect(validateFileType(mockFile)).toBe(true);
    });

    it('should accept valid PNG file', () => {
      const mockFile = {
        originalname: 'test.png',
        mimetype: 'image/png'
      };
      
      expect(validateFileType(mockFile)).toBe(true);
    });

    it('should accept valid WebP file', () => {
      const mockFile = {
        originalname: 'test.webp',
        mimetype: 'image/webp'
      };
      
      expect(validateFileType(mockFile)).toBe(true);
    });

    it('should accept valid GIF file', () => {
      const mockFile = {
        originalname: 'test.gif',
        mimetype: 'image/gif'
      };
      
      expect(validateFileType(mockFile)).toBe(true);
    });

    it('should reject invalid file type', () => {
      const mockFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain'
      };
      
      expect(validateFileType(mockFile)).toBe(false);
    });

    it('should reject file with valid extension but invalid MIME type', () => {
      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'text/plain'
      };
      
      expect(validateFileType(mockFile)).toBe(false);
    });

    it('should reject file with invalid extension but valid MIME type', () => {
      const mockFile = {
        originalname: 'test.txt',
        mimetype: 'image/jpeg'
      };
      
      expect(validateFileType(mockFile)).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should accept file within size limit', () => {
      const mockFile = {
        size: 1024 * 1024 // 1MB
      };
      
      expect(validateFileSize(mockFile)).toBe(true);
    });

    it('should accept file at exact size limit', () => {
      const mockFile = {
        size: MAX_FILE_SIZE
      };
      
      expect(validateFileSize(mockFile)).toBe(true);
    });

    it('should reject file exceeding size limit', () => {
      const mockFile = {
        size: MAX_FILE_SIZE + 1
      };
      
      expect(validateFileSize(mockFile)).toBe(false);
    });
  });

  describe('validateImageDimensions', () => {
    it('should return true when sharp is not available', async () => {
      // Create a dummy file for testing
      const testFilePath = path.join(testUploadDir, 'test.txt');
      fs.writeFileSync(testFilePath, 'dummy content');
      
      const result = await validateImageDimensions(testFilePath);
      expect(result).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should have correct allowed types', () => {
      expect(ALLOWED_TYPES).toEqual([
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp'
      ]);
    });

    it('should have correct allowed extensions', () => {
      expect(ALLOWED_EXTENSIONS).toEqual([
        '.jpg',
        '.jpeg', 
        '.png',
        '.gif',
        '.webp'
      ]);
    });

    it('should have correct max file size (5MB)', () => {
      expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    });
  });
});