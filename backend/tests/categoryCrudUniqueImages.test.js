import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CategoryService from '../services/categoryService.js';
import categoryModel from '../models/categoryModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock the category model
vi.mock('../models/categoryModel.js', () => {
  const mockConstructor = vi.fn();
  mockConstructor.findById = vi.fn();
  mockConstructor.findOne = vi.fn();
  mockConstructor.countDocuments = vi.fn();
  mockConstructor.findByIdAndDelete = vi.fn();
  mockConstructor.findByIdAndUpdate = vi.fn();
  mockConstructor.prototype = {
    save: vi.fn()
  };
  return { default: mockConstructor };
});

describe('Category CRUD Operations with Unique Images', () => {
  let categoryService;
  let testDir;
  let testFiles;
  let mockCategoryId;
  let mockCategory;

  beforeEach(() => {
    categoryService = new CategoryService();
    testDir = path.join(__dirname, 'temp-crud-test');
    testFiles = [];
    mockCategoryId = '507f1f77bcf86cd799439011';
    
    mockCategory = {
      _id: mockCategoryId,
      name: 'Test Category',
      originalName: 'Test Category',
      slug: 'test-category',
      image: null,
      isActive: true,
      order: 1,
      save: vi.fn(),
      toObject: vi.fn()
    };
    
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Mock category images path to use test directory
    categoryService.getCategoryImagePath = () => testDir;

    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockCategory.toObject.mockReturnValue({
      _id: mockCategoryId,
      name: 'Test Category',
      originalName: 'Test Category',
      slug: 'test-category',
      image: null,
      isActive: true,
      order: 1
    });
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

  describe('Create Category with Unique Images', () => {
    beforeEach(() => {
      // Mock successful category creation
      const mockSavedCategory = { 
        ...mockCategory, 
        _id: mockCategoryId,
        toString: () => mockCategoryId
      };
      mockSavedCategory.save = vi.fn().mockResolvedValue(mockSavedCategory);
      
      categoryModel.mockImplementation(() => mockSavedCategory);
      categoryModel.findOne.mockResolvedValue(null); // No existing slug
      
      // Mock processImageUpload
      categoryService.processImageUpload = vi.fn();
      categoryService.checkCategoryNameExists = vi.fn().mockResolvedValue(false);
    });

    it('should create category with unique image naming', async () => {
      const categoryData = {
        name: 'Test Category',
        slug: 'test-category'
      };
      
      const imageFile = createMockImageFile();
      const expectedFilename = `cat_${mockCategoryId}_1234567890_123.jpg`;
      
      // Mock successful image upload
      categoryService.processImageUpload.mockResolvedValue({
        success: true,
        filename: expectedFilename,
        path: `/uploads/categories/${expectedFilename}`
      });
      
      const result = await categoryService.createCategory(categoryData, imageFile);
      
      expect(result.success).toBe(true);
      expect(categoryService.processImageUpload).toHaveBeenCalledWith(
        imageFile,
        mockCategoryId
      );
    });

    it('should rollback category creation if image upload fails', async () => {
      const categoryData = {
        name: 'Test Category',
        slug: 'test-category'
      };
      
      const imageFile = createMockImageFile();
      
      // Mock failed image upload
      categoryService.processImageUpload.mockResolvedValue({
        success: false,
        message: 'Upload failed',
        code: 'UPLOAD_ERROR'
      });
      
      // Mock category deletion
      categoryModel.findByIdAndDelete = vi.fn().mockResolvedValue(true);
      
      const result = await categoryService.createCategory(categoryData, imageFile);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('UPLOAD_ERROR');
      expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith(mockCategoryId);
    });

    it('should validate unique naming after upload', async () => {
      const categoryData = {
        name: 'Test Category',
        slug: 'test-category'
      };
      
      const imageFile = createMockImageFile();
      const wrongFilename = 'wrong_filename.jpg';
      
      // Mock image upload with wrong filename
      categoryService.processImageUpload.mockResolvedValue({
        success: true,
        filename: wrongFilename,
        path: `/uploads/categories/${wrongFilename}`
      });
      
      // Mock category deletion and image cleanup
      categoryModel.findByIdAndDelete = vi.fn().mockResolvedValue(true);
      categoryService.deleteCategoryImage = vi.fn().mockResolvedValue({ success: true });
      
      const result = await categoryService.createCategory(categoryData, imageFile);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('UNIQUE_NAMING_VALIDATION_FAILED');
      expect(categoryService.deleteCategoryImage).toHaveBeenCalledWith(wrongFilename);
      expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith(mockCategoryId);
    });

    it('should require image for category creation', async () => {
      const categoryData = {
        name: 'Test Category',
        slug: 'test-category'
      };
      
      // Mock category deletion
      categoryModel.findByIdAndDelete = vi.fn().mockResolvedValue(true);
      
      const result = await categoryService.createCategory(categoryData, null);
      
      expect(result.success).toBe(false);
      expect(result.errors.image).toContain('obrigatória');
      expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith(mockCategoryId);
    });
  });

  describe('Update Category with Unique Images', () => {
    beforeEach(() => {
      // Mock existing category
      categoryModel.findById.mockResolvedValue(mockCategory);
      categoryModel.findOne.mockResolvedValue(null); // No slug conflicts
      categoryModel.findByIdAndUpdate.mockResolvedValue({
        ...mockCategory,
        toObject: () => mockCategory.toObject()
      });
      
      categoryService.checkCategoryNameExists = vi.fn().mockResolvedValue(false);
      categoryService.processImageUpload = vi.fn();
    });

    it('should update category with new unique image', async () => {
      const updateData = { name: 'Updated Category' };
      const imageFile = createMockImageFile();
      const expectedFilename = `cat_${mockCategoryId}_1234567890_456.jpg`;
      
      // Mock successful image upload
      categoryService.processImageUpload.mockResolvedValue({
        success: true,
        filename: expectedFilename,
        path: `/uploads/categories/${expectedFilename}`
      });
      
      const result = await categoryService.updateCategory(mockCategoryId, updateData, imageFile);
      
      expect(result.success).toBe(true);
      expect(categoryService.processImageUpload).toHaveBeenCalledWith(
        imageFile,
        mockCategoryId,
        mockCategory.image
      );
    });

    it('should validate unique naming after image update', async () => {
      const updateData = { name: 'Updated Category' };
      const imageFile = createMockImageFile();
      const wrongFilename = 'wrong_filename.jpg';
      
      // Mock image upload with wrong filename
      categoryService.processImageUpload.mockResolvedValue({
        success: true,
        filename: wrongFilename,
        path: `/uploads/categories/${wrongFilename}`
      });
      
      // Mock image cleanup
      categoryService.deleteCategoryImage = vi.fn().mockResolvedValue({ success: true });
      
      const result = await categoryService.updateCategory(mockCategoryId, updateData, imageFile);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('UNIQUE_NAMING_VALIDATION_FAILED');
      expect(categoryService.deleteCategoryImage).toHaveBeenCalledWith(wrongFilename);
    });

    it('should update category without changing image', async () => {
      const updateData = { name: 'Updated Category' };
      
      const result = await categoryService.updateCategory(mockCategoryId, updateData);
      
      expect(result.success).toBe(true);
      expect(categoryService.processImageUpload).not.toHaveBeenCalled();
    });

    it('should handle image upload failure during update', async () => {
      const updateData = { name: 'Updated Category' };
      const imageFile = createMockImageFile();
      
      // Mock failed image upload
      categoryService.processImageUpload.mockResolvedValue({
        success: false,
        message: 'Upload failed',
        code: 'UPLOAD_ERROR'
      });
      
      const result = await categoryService.updateCategory(mockCategoryId, updateData, imageFile);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('UPLOAD_ERROR');
    });
  });

  describe('Delete Category with Image Cleanup', () => {
    beforeEach(() => {
      categoryModel.findById.mockResolvedValue(mockCategory);
      categoryModel.findByIdAndDelete.mockResolvedValue(true);
      categoryService.checkCategoryHasProducts = vi.fn().mockResolvedValue(false);
      categoryService.cleanupCategoryImages = vi.fn();
    });

    it('should clean up all category images when deleting', async () => {
      // Mock successful cleanup
      categoryService.cleanupCategoryImages.mockResolvedValue({
        success: true,
        cleanedCount: 2,
        message: 'Cleanup successful'
      });
      
      const result = await categoryService.deleteCategory(mockCategoryId);
      
      expect(result.success).toBe(true);
      expect(categoryService.cleanupCategoryImages).toHaveBeenCalledWith(mockCategoryId);
      expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith(mockCategoryId);
    });

    it('should continue deletion even if image cleanup fails', async () => {
      // Mock failed cleanup
      categoryService.cleanupCategoryImages.mockResolvedValue({
        success: false,
        message: 'Cleanup failed'
      });
      
      const result = await categoryService.deleteCategory(mockCategoryId);
      
      expect(result.success).toBe(true);
      expect(categoryService.cleanupCategoryImages).toHaveBeenCalledWith(mockCategoryId);
      expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith(mockCategoryId);
    });

    it('should prevent deletion if category has products', async () => {
      categoryService.checkCategoryHasProducts.mockResolvedValue(true);
      
      const result = await categoryService.deleteCategory(mockCategoryId);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('CATEGORY_HAS_PRODUCTS');
      expect(categoryService.cleanupCategoryImages).not.toHaveBeenCalled();
      expect(categoryModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });

  describe('Category Unique Image Compliance Validation', () => {
    it('should validate compliant category', async () => {
      const compliantCategory = {
        ...mockCategory,
        image: `/uploads/categories/cat_${mockCategoryId}_1234567890_123.jpg`
      };
      
      categoryModel.findById.mockResolvedValue(compliantCategory);
      
      // Create the image file
      const filename = `cat_${mockCategoryId}_1234567890_123.jpg`;
      createTestImageFile(filename);
      
      const result = await categoryService.validateCategoryUniqueImageCompliance(mockCategoryId);
      
      expect(result.isCompliant).toBe(true);
      expect(result.issues).toBe(null);
    });

    it('should identify non-compliant category without image', async () => {
      categoryModel.findById.mockResolvedValue(mockCategory);
      
      const result = await categoryService.validateCategoryUniqueImageCompliance(mockCategoryId);
      
      expect(result.isCompliant).toBe(false);
      expect(result.issues).toContain('Categoria não possui imagem associada');
    });

    it('should identify non-compliant image path format', async () => {
      const nonCompliantCategory = {
        ...mockCategory,
        image: '/old/path/image.jpg'
      };
      
      categoryModel.findById.mockResolvedValue(nonCompliantCategory);
      
      const result = await categoryService.validateCategoryUniqueImageCompliance(mockCategoryId);
      
      expect(result.isCompliant).toBe(false);
      expect(result.issues).toContain('Caminho da imagem não segue padrão esperado');
    });

    it('should identify non-compliant image naming', async () => {
      const nonCompliantCategory = {
        ...mockCategory,
        image: '/uploads/categories/regular_image.jpg'
      };
      
      categoryModel.findById.mockResolvedValue(nonCompliantCategory);
      
      const result = await categoryService.validateCategoryUniqueImageCompliance(mockCategoryId);
      
      expect(result.isCompliant).toBe(false);
      expect(result.issues).toContain('Nome da imagem não segue padrão de nomenclatura única');
    });

    it('should identify missing image file', async () => {
      const categoryWithMissingFile = {
        ...mockCategory,
        image: `/uploads/categories/cat_${mockCategoryId}_1234567890_123.jpg`
      };
      
      categoryModel.findById.mockResolvedValue(categoryWithMissingFile);
      // Don't create the image file
      
      const result = await categoryService.validateCategoryUniqueImageCompliance(mockCategoryId);
      
      expect(result.isCompliant).toBe(false);
      expect(result.issues).toContain('Arquivo de imagem não existe no sistema de arquivos');
    });

    it('should warn about multiple associated images', async () => {
      const categoryWithImage = {
        ...mockCategory,
        image: `/uploads/categories/cat_${mockCategoryId}_1234567890_123.jpg`
      };
      
      categoryModel.findById.mockResolvedValue(categoryWithImage);
      
      // Create multiple images for the same category
      createTestImageFile(`cat_${mockCategoryId}_1234567890_123.jpg`);
      createTestImageFile(`cat_${mockCategoryId}_1234567890_456.jpg`);
      
      const result = await categoryService.validateCategoryUniqueImageCompliance(mockCategoryId);
      
      expect(result.warnings).toContain('Encontradas 2 imagens associadas à categoria (esperado: 1)');
    });
  });

  describe('Fix Category Unique Image Compliance', () => {
    it('should skip fixing compliant category', async () => {
      // Mock compliant validation
      categoryService.validateCategoryUniqueImageCompliance = vi.fn().mockResolvedValue({
        isCompliant: true
      });
      
      const result = await categoryService.fixCategoryUniqueImageCompliance(mockCategoryId);
      
      expect(result.success).toBe(true);
      expect(result.fixed).toBe(false);
      expect(result.message).toContain('já está em conformidade');
    });

    it('should fix image path format', async () => {
      const nonCompliantCategory = {
        ...mockCategory,
        image: 'old_path_image.jpg'
      };
      
      categoryModel.findById.mockResolvedValue(nonCompliantCategory);
      categoryModel.findByIdAndUpdate.mockResolvedValue(true);
      
      // Mock non-compliant validation
      categoryService.validateCategoryUniqueImageCompliance = vi.fn().mockResolvedValue({
        isCompliant: false,
        issues: ['Caminho da imagem não segue padrão esperado']
      });
      
      const result = await categoryService.fixCategoryUniqueImageCompliance(mockCategoryId);
      
      expect(result.success).toBe(true);
      expect(result.fixed).toBe(true);
      expect(result.fixes).toContain('Corrigido caminho da imagem: old_path_image.jpg → /uploads/categories/old_path_image.jpg');
    });

    it('should clean up orphaned images', async () => {
      const categoryWithImage = {
        ...mockCategory,
        image: `/uploads/categories/cat_${mockCategoryId}_1234567890_123.jpg`
      };
      
      categoryModel.findById.mockResolvedValue(categoryWithImage);
      
      // Create orphaned images
      createTestImageFile(`cat_${mockCategoryId}_1234567890_123.jpg`); // Current image
      createTestImageFile(`cat_${mockCategoryId}_1234567890_456.jpg`); // Orphaned
      
      categoryService.validateCategoryUniqueImageCompliance = vi.fn().mockResolvedValue({
        isCompliant: false,
        issues: ['Multiple images found']
      });
      
      categoryService.deleteCategoryImage = vi.fn().mockResolvedValue({ success: true });
      
      const result = await categoryService.fixCategoryUniqueImageCompliance(
        mockCategoryId, 
        { cleanupOrphaned: true }
      );
      
      expect(result.success).toBe(true);
      expect(categoryService.deleteCategoryImage).toHaveBeenCalledWith(`cat_${mockCategoryId}_1234567890_456.jpg`);
    });
  });
});