import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCategory, updateCategory, getAllCategories } from '../controllers/categoryController.js';
import CategoryService from '../services/categoryService.js';

// Mock the CategoryService
vi.mock('../services/categoryService.js');

describe('CategoryController Image URL Consistency', () => {
  let mockReq, mockRes, mockCategoryService;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock CategoryService instance
    mockCategoryService = {
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      getAllCategories: vi.fn(),
    };
    
    // Mock the CategoryService constructor to return our mock instance
    CategoryService.mockImplementation(() => mockCategoryService);

    // Create mock request and response objects
    mockReq = {
      body: {},
      file: null,
      params: {},
      query: {},
      user: { id: 'admin123' }
    };

    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  describe('createCategory', () => {
    it('should create category with consistent image path', async () => {
      const categoryData = {
        name: 'Test Category',
        originalName: 'Test Category',
        slug: 'test-category'
      };

      const mockFile = {
        originalname: 'test.jpg',
        path: '/tmp/test.jpg'
      };

      const expectedResult = {
        success: true,
        message: 'Categoria criada com sucesso',
        data: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Test Category',
          originalName: 'Test Category',
          slug: 'test-category',
          image: '/uploads/categories/test_123456.jpg',
          isActive: true,
          order: 1
        }
      };

      mockReq.body = categoryData;
      mockReq.file = mockFile;
      mockCategoryService.createCategory.mockResolvedValue(expectedResult);

      await createCategory(mockReq, mockRes);

      expect(mockCategoryService.createCategory).toHaveBeenCalledWith(
        expect.objectContaining(categoryData),
        mockFile
      );
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
      expect(expectedResult.data.image.startsWith('/uploads/')).toBe(true);
    });
  });

  describe('updateCategory', () => {
    it('should update category with consistent image path', async () => {
      const updateData = {
        name: 'Updated Category'
      };

      const mockFile = {
        originalname: 'updated.jpg',
        path: '/tmp/updated.jpg'
      };

      const expectedResult = {
        success: true,
        message: 'Categoria atualizada com sucesso',
        data: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Updated Category',
          originalName: 'Updated Category',
          slug: 'updated-category',
          image: '/uploads/categories/updated_123456.jpg',
          isActive: true,
          order: 1
        }
      };

      mockReq.params.id = '507f1f77bcf86cd799439011';
      mockReq.body = updateData;
      mockReq.file = mockFile;
      mockCategoryService.updateCategory.mockResolvedValue(expectedResult);

      await updateCategory(mockReq, mockRes);

      expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateData,
        mockFile
      );
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
      expect(expectedResult.data.image.startsWith('/uploads/')).toBe(true);
    });
  });

  describe('getAllCategories', () => {
    it('should return categories with consistent image URLs', async () => {
      const expectedResult = {
        success: true,
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            name: 'Category 1',
            slug: 'category-1',
            image: '/uploads/categories/category1_123456.jpg',
            isActive: true
          },
          {
            _id: '507f1f77bcf86cd799439012',
            name: 'Category 2',
            slug: 'category-2',
            image: '/uploads/categories/category2_789012.jpg',
            isActive: true
          }
        ]
      };

      mockCategoryService.getAllCategories.mockResolvedValue(expectedResult);

      await getAllCategories(mockReq, mockRes);

      expect(mockCategoryService.getAllCategories).toHaveBeenCalledWith(false);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
      
      // Verify all image URLs start with /uploads/
      expectedResult.data.forEach(category => {
        expect(category.image.startsWith('/uploads/')).toBe(true);
      });
    });
  });
});