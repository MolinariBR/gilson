import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import categoryModel from '../models/categoryModel.js';

describe('Category Model - Unique Image Validation Integration', () => {
  beforeEach(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    }
    
    // Clean up any existing test data
    await categoryModel.deleteMany({ name: /^Integration Test/ });
  });

  afterEach(async () => {
    // Clean up test data
    await categoryModel.deleteMany({ name: /^Integration Test/ });
  });

  it('should save category with valid unique image format', async () => {
    const category = new categoryModel({
      name: 'Integration Test Category 1',
      originalName: 'Integration Test Category 1',
      slug: 'integration-test-category-1',
      image: '/uploads/categories/temp.jpg' // Will be updated after save
    });

    // Save to get an ID
    const savedCategory = await category.save();
    expect(savedCategory._id).toBeDefined();

    // Update with proper unique image format
    const uniqueImagePath = `/uploads/categories/cat_${savedCategory._id}_1704067200000.jpg`;
    savedCategory.image = uniqueImagePath;
    
    // Should save successfully
    const updatedCategory = await savedCategory.save();
    expect(updatedCategory.image).toBe(uniqueImagePath);
  });

  it('should reject category with wrong category ID in image filename', async () => {
    const category = new categoryModel({
      name: 'Integration Test Category 2',
      originalName: 'Integration Test Category 2',
      slug: 'integration-test-category-2',
      image: '/uploads/categories/temp.jpg'
    });

    // Save to get an ID
    const savedCategory = await category.save();
    
    // Try to update with wrong category ID in filename
    const wrongCategoryId = new mongoose.Types.ObjectId();
    savedCategory.image = `/uploads/categories/cat_${wrongCategoryId}_1704067200000.jpg`;
    
    // Should fail validation
    await expect(savedCategory.save()).rejects.toThrow();
  });

  it('should prevent duplicate image paths across categories', async () => {
    // Create first category
    const category1 = new categoryModel({
      name: 'Integration Test Category 3',
      originalName: 'Integration Test Category 3',
      slug: 'integration-test-category-3',
      image: '/uploads/categories/temp1.jpg'
    });

    const savedCategory1 = await category1.save();
    const uniqueImagePath = `/uploads/categories/cat_${savedCategory1._id}_1704067200000.jpg`;
    savedCategory1.image = uniqueImagePath;
    await savedCategory1.save();

    // Try to create second category with same image path
    const category2 = new categoryModel({
      name: 'Integration Test Category 4',
      originalName: 'Integration Test Category 4',
      slug: 'integration-test-category-4',
      image: uniqueImagePath // Same image path
    });

    // Should fail due to async validator
    await expect(category2.save()).rejects.toThrow();
  });

  it('should allow legacy image format for backward compatibility', async () => {
    const category = new categoryModel({
      name: 'Integration Test Category Legacy',
      originalName: 'Integration Test Category Legacy',
      slug: 'integration-test-category-legacy',
      image: '/uploads/categories/legacy_image_1704067200000.jpg'
    });

    // Should save successfully with legacy format
    const savedCategory = await category.save();
    expect(savedCategory.image).toBe('/uploads/categories/legacy_image_1704067200000.jpg');
  });

  it('should validate image path format in pre-save middleware', async () => {
    const category = new categoryModel({
      name: 'Integration Test Category Invalid Path',
      originalName: 'Integration Test Category Invalid Path',
      slug: 'integration-test-category-invalid-path',
      image: '/invalid/path/image.jpg'
    });

    // Should fail in pre-save middleware
    await expect(category.save()).rejects.toThrow();
  });

  it('should generate unique image names correctly', async () => {
    const category = new categoryModel({
      name: 'Integration Test Category Generate',
      originalName: 'Integration Test Category Generate',
      slug: 'integration-test-category-generate',
      image: '/uploads/categories/temp.jpg'
    });

    const savedCategory = await category.save();
    
    // Generate expected image name
    const expectedName = savedCategory.generateExpectedImageName('test-image.png');
    
    // Should follow the correct pattern
    expect(expectedName).toMatch(new RegExp(`^cat_${savedCategory._id}_\\d+\\.png$`));
    
    // Should be unique each time (different timestamps)
    // Add small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 1));
    const expectedName2 = savedCategory.generateExpectedImageName('test-image.png');
    expect(expectedName).not.toBe(expectedName2);
  });
});