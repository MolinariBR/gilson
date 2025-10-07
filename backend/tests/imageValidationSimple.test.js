import { describe, it, expect } from 'vitest';
import { 
  validateFileType, 
  validateFileSize, 
  ALLOWED_TYPES, 
  ALLOWED_EXTENSIONS, 
  MAX_FILE_SIZE 
} from '../middleware/imageValidation.js';

describe('Image Validation Middleware Unit Tests', () => {
  describe('File Type Validation', () => {
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

    it('should accept valid GIF file', () => {
      const mockFile = {
        originalname: 'test.gif',
        mimetype: 'image/gif'
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

    it('should reject text file', () => {
      const mockFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain'
      };
      
      expect(validateFileType(mockFile)).toBe(false);
    });

    it('should reject PDF file', () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf'
      };
      
      expect(validateFileType(mockFile)).toBe(false);
    });

    it('should reject file with wrong extension but correct MIME type', () => {
      const mockFile = {
        originalname: 'test.txt',
        mimetype: 'image/jpeg'
      };
      
      expect(validateFileType(mockFile)).toBe(false);
    });

    it('should reject file with correct extension but wrong MIME type', () => {
      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'text/plain'
      };
      
      expect(validateFileType(mockFile)).toBe(false);
    });
  });

  describe('File Size Validation', () => {
    it('should accept file within size limit', () => {
      const mockFile = {
        size: 1024 * 1024 // 1MB
      };
      
      expect(validateFileSize(mockFile)).toBe(true);
    });

    it('should accept file at exact size limit', () => {
      const mockFile = {
        size: MAX_FILE_SIZE // 5MB
      };
      
      expect(validateFileSize(mockFile)).toBe(true);
    });

    it('should reject file over size limit', () => {
      const mockFile = {
        size: MAX_FILE_SIZE + 1 // 5MB + 1 byte
      };
      
      expect(validateFileSize(mockFile)).toBe(false);
    });

    it('should reject very large file', () => {
      const mockFile = {
        size: 10 * 1024 * 1024 // 10MB
      };
      
      expect(validateFileSize(mockFile)).toBe(false);
    });
  });

  describe('Configuration Constants', () => {
    it('should have correct allowed types', () => {
      expect(ALLOWED_TYPES).toContain('image/jpeg');
      expect(ALLOWED_TYPES).toContain('image/jpg');
      expect(ALLOWED_TYPES).toContain('image/png');
      expect(ALLOWED_TYPES).toContain('image/gif');
      expect(ALLOWED_TYPES).toContain('image/webp');
    });

    it('should have correct allowed extensions', () => {
      expect(ALLOWED_EXTENSIONS).toContain('.jpg');
      expect(ALLOWED_EXTENSIONS).toContain('.jpeg');
      expect(ALLOWED_EXTENSIONS).toContain('.png');
      expect(ALLOWED_EXTENSIONS).toContain('.gif');
      expect(ALLOWED_EXTENSIONS).toContain('.webp');
    });

    it('should have correct max file size (5MB)', () => {
      expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    });
  });
});