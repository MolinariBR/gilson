import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CategoryService from '../services/categoryService.js';
import categoryModel from '../models/categoryModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock the category model
vi.mock('../models/categoryModel.js', () => ({
  default: {
    findById: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    save: vi.fn()
  }
}));

describe('CategoryService Unique Images', () => {
  let categoryService;
  let testDir;
  let testFiles;
  let mockCategoryId;

  beforeEach(() => {
    categoryService = new CategoryService();
    testDir = path.join(__dirname, 'temp-category-test');
    testFiles = [];
    mockCategoryId = '507f1f77bcf86cd799439011';
    
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Mock category images path to use test directory
    categoryService.getCategoryImagePath = () => testDir;

    // Reset mocks
    vi.clearAllMocks();
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
  const createTestImageFile = (filename, content = null) => {
    const filePath = path.join(testDir, filename);
    const fileContent = content || Buffer.from('test image content');
    fs.writeFileSync(filePath, fileContent);
    testFiles.push(filePath);
    return filePath;
  };

  // Helper function to create mock image file object
  const createMockImageFile = (originalname = 'test.jpg', size = 2000) => {
    const tempPath = createTestImageFile('temp_' + originalname);
    return {
      path: tempPath,
      originalname,
      mimetype: 'image/jpeg',
      size
    };
  };

  describe('Unique Image Naming', () => {
    it('should generate unique image names with category ID', () => {
      const originalFilename = 'test.jpg';
      const uniqueName = categoryService.generateUniqueImageName(mockCategoryId, originalFilename);
      
      expect(uniqueName).toMatch(new RegExp(`^cat_${mockCategoryId}_\\d+\\.jpg$`));
    });

    it('should generate different names for same inputs', () => {
      const originalFilename = 'test.jpg';
      const name1 = categoryService.generateUniqueImageName(mockCategoryId, originalFilename);
      const name2 = categoryService.generateUniqueImageName(mockCategoryId, originalFilename);
      
      expect(name1).not.toBe(name2);
    });

    it('should preserve file extension', () => {
      const jpegName = categoryService.generateUniqueImageName(mockCategoryId, 'test.jpg');
      const pngName = categoryService.generateUniqueImageName(mockCategoryId, 'test.png');
      const webpName = categoryService.generateUniqueImageName(mockCategoryId, 'test.webp');
      
      expect(jpegName).toMatch(/\.jpg$/);
      expect(pngName).toMatch(/\.png$/);
      expect(webpName).toMatch(/\.webp$/);
    });
  });

  describe('Image Association Validation', () => {
    it('should validate correct category-image association', () => {
      const imagePath = `/uploads/categories/cat_${mockCategoryId}_1234567890_123.jpg`;
      const result = categoryService.validateCategoryImageAssociation(mockCategoryId, imagePath);
      expect(result).toBe(true);
    });

    it('should reject incorrect category-image association', () => {
      const imagePath = `/uploads/categories/cat_different_id_1234567890_123.jpg`;
      const result = categoryService.validateCategoryImageAssociation(mockCategoryId, imagePath);
      expect(result).toBe(false);
    });

    it('should reject images with invalid naming pattern', () => {
      const invalidPaths = [
        'regular_image.jpg',
        'cat_123.jpg', // Missing timestamp and random
        `cat_${mockCategoryId}.jpg`, // Missing timestamp and random
        `cat_${mockCategoryId}_abc_def.jpg`, // Non-numeric timestamp/random
      ];

      invalidPaths.forEach(imagePath => {
        const result = categoryService.validateCategoryImageAssociation(mockCategoryId, imagePath);
        expect(result).toBe(false);
      });
    });

    it('should handle filename without path', () => {
      const filename = `cat_${mockCategoryId}_1234567890_123.jpg`;
      const result = categoryService.validateCategoryImageAssociation(mockCategoryId, filename);
      expect(result).toBe(true);
    });

    it('should return false for missing parameters', () => {
      expect(categoryService.validateCategoryImageAssociation(null, 'image.jpg')).toBe(false);
      expect(categoryService.validateCategoryImageAssociation(mockCategoryId, null)).toBe(false);
      expect(categoryService.validateCategoryImageAssociation(null, null)).toBe(false);
    });
  });

  describe('Category Associated Images', () => {
    it('should find all images associated with a category', async () => {
      // Create test images
      const associatedImages = [
        `cat_${mockCategoryId}_1234567890_123.jpg`,
        `cat_${mockCategoryId}_1234567891_456.png`,
        `cat_${mockCategoryId}_1234567892_789.webp`
      ];
      
      const unassociatedImages = [
        'cat_different_id_1234567890_123.jpg',
        'regular_image.jpg',
        'cat_invalid_pattern.jpg'
      ];

      // Create all test files
      [...associatedImages, ...unassociatedImages].forEach(filename => {
        createTestImageFile(filename);
      });

      const result = await categoryService.getCategoryAssociatedImages(mockCategoryId);
      
      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining(associatedImages));
      
      // Should not contain unassociated images
      unassociatedImages.forEach(filename => {
        expect(result).not.toContain(filename);
      });
    });

    it('should return empty array for non-existent category', async () => {
      const result = await categoryService.getCategoryAssociatedImages('nonexistent');
      expect(result).toEqual([]);
    });

    it('should return empty array when directory does not exist', async () => {
      // Mock getCategoryImagePath to return non-existent directory
      categoryService.getCategoryImagePath = () => '/non/existent/path';
      
      const result = await categoryService.getCategoryAssociatedImages(mockCategoryId);
      expect(result).toEqual([]);
    });
  });

  describe('Category Image Cleanup', () => {
    it('should clean up all images associated with a category', async () => {
      // Create test images
      const associatedImages = [
        `cat_${mockCategoryId}_1234567890_123.jpg`,
        `cat_${mockCategoryId}_1234567891_456.png`
      ];
      
      const unassociatedImage = 'cat_different_id_1234567890_123.jpg';

      // Create all test files
      [...associatedImages, unassociatedImage].forEach(filename => {
        createTestImageFile(filename);
      });

      const result = await categoryService.cleanupCategoryImages(mockCategoryId);
      
      expect(result.success).toBe(true);
      expect(result.cleanedCount).toBe(2);
      expect(result.totalFound).toBe(2);
      
      // Verify associated images were deleted
      associatedImages.forEach(filename => {
        const filePath = path.join(testDir, filename);
        expect(fs.existsSync(filePath)).toBe(false);
      });
      
      // Verify unassociated image was not deleted
      const unassociatedPath = path.join(testDir, unassociatedImage);
      expect(fs.existsSync(unassociatedPath)).toBe(true);
    });

    it('should handle cleanup when no images are found', async () => {
      const result = await categoryService.cleanupCategoryImages(mockCategoryId);
      
      expect(result.success).toBe(true);
      expect(result.cleanedCount).toBe(0);
      expect(result.totalFound).toBe(0);
    });

    it('should return error for missing category ID', async () => {
      const result = await categoryService.cleanupCategoryImages(null);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('obrigatório');
    });
  });

  describe('Image Information', () => {
    it('should get comprehensive image information', () => {
      const filename = `cat_${mockCategoryId}_1234567890_123.jpg`;
      createTestImageFile(filename, Buffer.from('test content'));
      
      const info = categoryService.getCategoryImageInfo(filename, mockCategoryId);
      
      expect(info.exists).toBe(true);
      expect(info.isAssociated).toBe(true);
      expect(info.categoryId).toBe(mockCategoryId);
      expect(info.isUniqueNaming).toBe(true);
      expect(info.size).toBeGreaterThan(0);
      expect(info.url).toContain(filename);
    });

    it('should handle non-existent images', () => {
      const info = categoryService.getCategoryImageInfo('nonexistent.jpg');
      
      expect(info.exists).toBe(false);
      expect(info.path).toBe(null);
      expect(info.url).toBe(null);
      expect(info.size).toBe(null);
      expect(info.isAssociated).toBe(false);
    });

    it('should identify non-unique naming patterns', () => {
      const filename = 'regular_image.jpg';
      createTestImageFile(filename);
      
      const info = categoryService.getCategoryImageInfo(filename);
      
      expect(info.exists).toBe(true);
      expect(info.isUniqueNaming).toBe(false);
      expect(info.categoryId).toBe(null);
    });
  });

  describe('Image Uniqueness Validation', () => {
    it('should validate unique images with existing category', async () => {
      const filename = `cat_${mockCategoryId}_1234567890_123.jpg`;
      createTestImageFile(filename);
      
      // Mock category exists
      categoryModel.findById.mockResolvedValue({
        _id: mockCategoryId,
        name: 'Test Category',
        image: `/uploads/categories/${filename}`
      });
      
      const result = await categoryService.validateImageUniqueness(filename);
      
      expect(result.isValid).toBe(true);
      expect(result.isUnique).toBe(true);
      expect(result.categoryId).toBe(mockCategoryId);
      expect(result.isCurrentCategoryImage).toBe(true);
    });

    it('should reject images referencing non-existent categories', async () => {
      const filename = `cat_${mockCategoryId}_1234567890_123.jpg`;
      createTestImageFile(filename);
      
      // Mock category does not exist
      categoryModel.findById.mockResolvedValue(null);
      
      const result = await categoryService.validateImageUniqueness(filename);
      
      expect(result.isValid).toBe(false);
      expect(result.isUnique).toBe(false);
      expect(result.message).toContain('categoria inexistente');
      expect(result.referencedCategoryId).toBe(mockCategoryId);
    });

    it('should handle non-unique naming patterns', async () => {
      const filename = 'regular_image.jpg';
      createTestImageFile(filename);
      
      const result = await categoryService.validateImageUniqueness(filename);
      
      expect(result.isValid).toBe(false);
      expect(result.isUnique).toBe(false);
      expect(result.message).toContain('nomenclatura única');
    });

    it('should handle non-existent images', async () => {
      const result = await categoryService.validateImageUniqueness('nonexistent.jpg');
      
      expect(result.isValid).toBe(true);
      expect(result.isUnique).toBe(true);
      expect(result.message).toContain('não existe');
    });
  });

  describe('Upload Category Image', () => {
    it('should require category ID for unique naming', async () => {
      const mockImageFile = createMockImageFile();
      
      const result = await categoryService.uploadCategoryImage(mockImageFile);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('obrigatório');
      expect(result.errors.categoryId).toBeTruthy();
    });

    it('should validate association after upload', async () => {
      const mockImageFile = createMockImageFile();
      
      // Mock enhanced image processor to return success but with wrong filename
      categoryService.enhancedImageProcessor = {
        processImageUpload: vi.fn().mockResolvedValue({
          success: true,
          filename: 'wrong_filename.jpg',
          path: '/uploads/categories/wrong_filename.jpg',
          size: 2000
        })
      };
      
      const result = await categoryService.uploadCategoryImage(mockImageFile, mockCategoryId);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_IMAGE_ASSOCIATION');
    });
  });

  describe('Process Image Upload', () => {
    it('should require category ID', async () => {
      const mockImageFile = createMockImageFile();
      
      const result = await categoryService.processImageUpload(mockImageFile, null);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('MISSING_CATEGORY_ID');
    });

    it('should validate category exists', async () => {
      const mockImageFile = createMockImageFile();
      
      // Mock category does not exist
      categoryModel.findById.mockResolvedValue(null);
      
      const result = await categoryService.processImageUpload(mockImageFile, mockCategoryId);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('should validate old image association', async () => {
      const mockImageFile = createMockImageFile();
      const oldImagePath = 'cat_different_id_1234567890_123.jpg';
      
      // Mock category exists
      categoryModel.findById.mockResolvedValue({
        _id: mockCategoryId,
        name: 'Test Category'
      });
      
      // Mock enhanced image processor
      categoryService.enhancedImageProcessor = {
        processImageUpload: vi.fn().mockResolvedValue({
          success: true,
          filename: `cat_${mockCategoryId}_1234567890_123.jpg`,
          path: `/uploads/categories/cat_${mockCategoryId}_1234567890_123.jpg`,
          size: 2000
        })
      };
      
      const result = await categoryService.processImageUpload(
        mockImageFile, 
        mockCategoryId, 
        oldImagePath
      );
      
      // Should succeed but not pass old image path to processor (due to invalid association)
      expect(result.success).toBe(true);
      expect(categoryService.enhancedImageProcessor.processImageUpload).toHaveBeenCalledWith(
        mockImageFile,
        mockCategoryId,
        null // oldImagePath should be null due to invalid association
      );
    });
  });
});