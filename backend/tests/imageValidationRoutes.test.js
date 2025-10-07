import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import foodRouter from '../routes/foodRoute.js';
import categoryRouter from '../routes/categoryRoute.js';
import userModel from '../models/userModel.js';
import foodModel from '../models/foodModel.js';
import categoryModel from '../models/categoryModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/food', foodRouter);
  app.use('/api/category', categoryRouter);
  return app;
};

describe('Image Validation Routes Tests', () => {
  let app;
  let adminUser;
  let authToken;

  beforeAll(async () => {
    app = createTestApp();
    
    // Create test admin user
    adminUser = new userModel({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: 'admin'
    });
    await adminUser.save();
    
    // Mock auth token (in real app this would be JWT)
    authToken = adminUser._id.toString();
  });

  afterAll(async () => {
    // Cleanup test data
    await userModel.deleteMany({ email: 'admin@test.com' });
    await foodModel.deleteMany({ name: /^Test Food/ });
    await categoryModel.deleteMany({ name: /^Test Category/ });
    
    // Cleanup test files
    const testUploadsDir = path.join(__dirname, '../uploads');
    if (fs.existsSync(testUploadsDir)) {
      const files = fs.readdirSync(testUploadsDir);
      files.forEach(file => {
        if (file.startsWith('image-') || file.startsWith('test-')) {
          fs.unlinkSync(path.join(testUploadsDir, file));
        }
      });
    }
  });

  beforeEach(async () => {
    // Clean up any test files before each test
    const testUploadsDir = path.join(__dirname, '../uploads');
    if (fs.existsSync(testUploadsDir)) {
      const files = fs.readdirSync(testUploadsDir);
      files.forEach(file => {
        if (file.startsWith('image-') || file.startsWith('test-')) {
          try {
            fs.unlinkSync(path.join(testUploadsDir, file));
          } catch (error) {
            // Ignore errors for files that don't exist
          }
        }
      });
    }
  });

  describe('Food Route Image Validation', () => {
    it('should accept valid image file (JPEG)', async () => {
      // Create a small test JPEG file
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      const testImageBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0xFF, 0xD9
      ]);
      fs.writeFileSync(testImagePath, testImageBuffer);

      const response = await request(app)
        .post('/api/food/add')
        .field('name', 'Test Food Valid Image')
        .field('description', 'Test description')
        .field('price', '10.99')
        .field('category', 'test-category')
        .field('userId', authToken)
        .attach('image', testImagePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Food Added');

      // Cleanup
      fs.unlinkSync(testImagePath);
    });

    it('should reject invalid file type (TXT)', async () => {
      // Create a test text file
      const testFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testFilePath, 'This is not an image');

      const response = await request(app)
        .post('/api/food/add')
        .field('name', 'Test Food Invalid File')
        .field('description', 'Test description')
        .field('price', '10.99')
        .field('category', 'test-category')
        .field('userId', authToken)
        .attach('image', testFilePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid file type');

      // Cleanup
      fs.unlinkSync(testFilePath);
    });

    it('should reject file that is too large', async () => {
      // Create a large test file (6MB - exceeds 5MB limit)
      const testImagePath = path.join(__dirname, 'test-large-image.jpg');
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      // Add JPEG header
      largeBuffer[0] = 0xFF;
      largeBuffer[1] = 0xD8;
      largeBuffer[largeBuffer.length - 2] = 0xFF;
      largeBuffer[largeBuffer.length - 1] = 0xD9;
      fs.writeFileSync(testImagePath, largeBuffer);

      const response = await request(app)
        .post('/api/food/add')
        .field('name', 'Test Food Large Image')
        .field('description', 'Test description')
        .field('price', '10.99')
        .field('category', 'test-category')
        .field('userId', authToken)
        .attach('image', testImagePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('File size too large');

      // Cleanup
      fs.unlinkSync(testImagePath);
    });

    it('should accept valid PNG file', async () => {
      // Create a small test PNG file
      const testImagePath = path.join(__dirname, 'test-image.png');
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02,
        0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
      ]);
      fs.writeFileSync(testImagePath, testImageBuffer);

      const response = await request(app)
        .post('/api/food/add')
        .field('name', 'Test Food Valid PNG')
        .field('description', 'Test description')
        .field('price', '10.99')
        .field('category', 'test-category')
        .field('userId', authToken)
        .attach('image', testImagePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Food Added');

      // Cleanup
      fs.unlinkSync(testImagePath);
    });
  });

  describe('Category Route Image Validation', () => {
    it('should accept valid image file for category creation', async () => {
      // Create a small test JPEG file
      const testImagePath = path.join(__dirname, 'test-category-image.jpg');
      const testImageBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0xFF, 0xD9
      ]);
      fs.writeFileSync(testImagePath, testImageBuffer);

      const response = await request(app)
        .post('/api/category/admin/categories')
        .field('name', 'Test Category Valid Image')
        .field('originalName', 'Test Category Valid Image')
        .field('slug', 'test-category-valid-image')
        .attach('image', testImagePath)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Cleanup
      fs.unlinkSync(testImagePath);
    });

    it('should reject invalid file type for category', async () => {
      // Create a test text file
      const testFilePath = path.join(__dirname, 'test-category-file.txt');
      fs.writeFileSync(testFilePath, 'This is not an image');

      const response = await request(app)
        .post('/api/category/admin/categories')
        .field('name', 'Test Category Invalid File')
        .field('originalName', 'Test Category Invalid File')
        .field('slug', 'test-category-invalid-file')
        .attach('image', testFilePath)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid file type');

      // Cleanup
      fs.unlinkSync(testFilePath);
    });

    it('should accept category creation without image', async () => {
      const response = await request(app)
        .post('/api/category/admin/categories')
        .field('name', 'Test Category No Image')
        .field('originalName', 'Test Category No Image')
        .field('slug', 'test-category-no-image')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate image on category update', async () => {
      // First create a category
      const createResponse = await request(app)
        .post('/api/category/admin/categories')
        .field('name', 'Test Category Update')
        .field('originalName', 'Test Category Update')
        .field('slug', 'test-category-update')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const categoryId = createResponse.body.data._id;

      // Create invalid file for update
      const testFilePath = path.join(__dirname, 'test-update-file.txt');
      fs.writeFileSync(testFilePath, 'This is not an image');

      const updateResponse = await request(app)
        .put(`/api/category/admin/categories/${categoryId}`)
        .field('name', 'Updated Category Name')
        .attach('image', testFilePath)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(updateResponse.body.success).toBe(false);
      expect(updateResponse.body.message).toContain('Invalid file type');

      // Cleanup
      fs.unlinkSync(testFilePath);
    });
  });

  describe('Error Message Validation', () => {
    it('should provide clear error message for unsupported file extension', async () => {
      const testFilePath = path.join(__dirname, 'test-file.bmp');
      // Create a BMP file (not in allowed extensions)
      const bmpBuffer = Buffer.from([0x42, 0x4D, 0x1E, 0x00, 0x00, 0x00]); // BMP header
      fs.writeFileSync(testFilePath, bmpBuffer);

      const response = await request(app)
        .post('/api/food/add')
        .field('name', 'Test Food BMP')
        .field('description', 'Test description')
        .field('price', '10.99')
        .field('category', 'test-category')
        .field('userId', authToken)
        .attach('image', testFilePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid file type');
      expect(response.body.message).toContain('.jpg, .jpeg, .png, .gif, .webp');

      // Cleanup
      fs.unlinkSync(testFilePath);
    });

    it('should provide clear error message for file size limit', async () => {
      // Create a file that's exactly at the limit (5MB + 1 byte)
      const testImagePath = path.join(__dirname, 'test-limit-image.jpg');
      const limitBuffer = Buffer.alloc(5 * 1024 * 1024 + 1); // 5MB + 1 byte
      // Add JPEG header
      limitBuffer[0] = 0xFF;
      limitBuffer[1] = 0xD8;
      limitBuffer[limitBuffer.length - 2] = 0xFF;
      limitBuffer[limitBuffer.length - 1] = 0xD9;
      fs.writeFileSync(testImagePath, limitBuffer);

      const response = await request(app)
        .post('/api/food/add')
        .field('name', 'Test Food Size Limit')
        .field('description', 'Test description')
        .field('price', '10.99')
        .field('category', 'test-category')
        .field('userId', authToken)
        .attach('image', testImagePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('File size too large');
      expect(response.body.message).toContain('5MB');

      // Cleanup
      fs.unlinkSync(testImagePath);
    });
  });
});