import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import foodModel from '../models/foodModel.js';
import categoryModel from '../models/categoryModel.js';
import userModel from '../models/userModel.js';

// Import server components
import foodRouter from '../routes/foodRoute.js';
import categoryRouter from '../routes/categoryRoute.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('End-to-End Image Workflow Tests', () => {
  let app;
  let adminToken;
  let testUserId;
  const testUploadDir = path.join(__dirname, '../test-uploads');
  const testImagePath = path.join(__dirname, 'test-e2e-image.jpg');

  beforeAll(async () => {
    // Create test Express app
    app = express();
    app.use(express.json());
    app.use('/api/food', foodRouter);
    app.use('/api/category', categoryRouter);
    
    // Serve static files
    app.use('/uploads', express.static(testUploadDir));

    // Create test directories
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }
    if (!fs.existsSync(path.join(testUploadDir, 'categories'))) {
      fs.mkdirSync(path.join(testUploadDir, 'categories'), { recursive: true });
    }

    // Create test image
    createTestImage(testImagePath);

    // Create admin user
    const adminUser = new userModel({
      name: 'E2E Test Admin',
      email: 'e2e-admin@test.com',
      password: 'hashedpassword',
      isAdmin: true
    });
    const savedUser = await adminUser.save();
    testUserId = savedUser._id;
    
    adminToken = jwt.sign(
      { id: testUserId, isAdmin: true },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  afterAll(async () => {
    // Clean up
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  beforeEach(async () => {
    // Clean database
    await foodModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  function createTestImage(filePath) {
    // Create minimal valid JPEG
    const jpegHeader = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A, 0x00,
      0xFF, 0xD9
    ]);
    fs.writeFileSync(filePath, jpegHeader);
  }

  describe('Complete Food Image Workflow', () => {
    it('should handle complete food lifecycle with images', async () => {
      // Step 1: Create food with image
      const createResponse = await request(app)
        .post('/api/food/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'E2E Test Food')
        .field('description', 'End-to-end test food item')
        .field('price', '25.99')
        .field('category', 'Test Category')
        .attach('image', testImagePath);

      expect(createResponse.status).toBe(200);
      expect(createResponse.body.success).toBe(true);

      // Step 2: Verify food was saved with correct image path
      const savedFood = await foodModel.findOne({ name: 'E2E Test Food' });
      expect(savedFood).toBeTruthy();
      expect(savedFood.image).toMatch(/^\/uploads\//);
      
      const imagePath = path.join(testUploadDir, savedFood.image.replace('/uploads/', ''));
      expect(fs.existsSync(imagePath)).toBe(true);

      // Step 3: List foods and verify image URL
      const listResponse = await request(app)
        .get('/api/food/list')
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data).toHaveLength(1);
      expect(listResponse.body.data[0].image).toBe(savedFood.image);

      // Step 4: Serve the image
      const imageResponse = await request(app)
        .get(savedFood.image)
        .expect(200);

      expect(imageResponse.headers['content-type']).toMatch(/image/);

      // Step 5: Update food with new image
      const updateResponse = await request(app)
        .put('/api/food/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('id', savedFood._id.toString())
        .field('name', 'Updated E2E Test Food')
        .field('description', 'Updated description')
        .field('price', '30.99')
        .field('category', 'Updated Category')
        .attach('image', testImagePath);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);

      // Step 6: Verify update
      const updatedFood = await foodModel.findById(savedFood._id);
      expect(updatedFood.name).toBe('Updated E2E Test Food');
      expect(updatedFood.image).toMatch(/^\/uploads\//);
      expect(updatedFood.image).not.toBe(savedFood.image); // Should be different

      // Step 7: Verify new image exists
      const newImagePath = path.join(testUploadDir, updatedFood.image.replace('/uploads/', ''));
      expect(fs.existsSync(newImagePath)).toBe(true);

      // Step 8: Remove food
      const removeResponse = await request(app)
        .post('/api/food/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: savedFood._id.toString() });

      expect(removeResponse.status).toBe(200);
      expect(removeResponse.body.success).toBe(true);

      // Step 9: Verify food is removed
      const removedFood = await foodModel.findById(savedFood._id);
      expect(removedFood).toBeFalsy();
    });
  });

  describe('Complete Category Image Workflow', () => {
    it('should handle complete category lifecycle with images', async () => {
      // Step 1: Create category with image
      const createResponse = await request(app)
        .post('/api/category/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'E2E Test Category')
        .field('description', 'End-to-end test category')
        .attach('image', testImagePath);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      // Step 2: Verify category was saved
      const savedCategory = await categoryModel.findOne({ name: 'E2E Test Category' });
      expect(savedCategory).toBeTruthy();
      expect(savedCategory.image).toMatch(/^\/uploads\/categories\//);
      
      const imagePath = path.join(testUploadDir, savedCategory.image.replace('/uploads/', ''));
      expect(fs.existsSync(imagePath)).toBe(true);

      // Step 3: Get category by ID
      const getResponse = await request(app)
        .get(`/api/category/admin/categories/${savedCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.image).toBe(savedCategory.image);

      // Step 4: List all categories
      const listResponse = await request(app)
        .get('/api/category/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data).toHaveLength(1);
      expect(listResponse.body.data[0].image).toBe(savedCategory.image);

      // Step 5: Serve the image
      const imageResponse = await request(app)
        .get(savedCategory.image)
        .expect(200);

      expect(imageResponse.headers['content-type']).toMatch(/image/);

      // Step 6: Update category with new image
      const updateResponse = await request(app)
        .put(`/api/category/admin/categories/${savedCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Updated E2E Test Category')
        .field('description', 'Updated description')
        .attach('image', testImagePath);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);

      // Step 7: Verify update
      const updatedCategory = await categoryModel.findById(savedCategory._id);
      expect(updatedCategory.name).toBe('Updated E2E Test Category');
      expect(updatedCategory.image).toMatch(/^\/uploads\/categories\//);
      expect(updatedCategory.image).not.toBe(savedCategory.image);

      // Step 8: Get public categories
      const publicResponse = await request(app)
        .get('/api/category/categories')
        .expect(200);

      expect(publicResponse.body.success).toBe(true);
      expect(publicResponse.body.data).toHaveLength(1);
      expect(publicResponse.body.data[0].image).toBe(updatedCategory.image);

      // Step 9: Delete category
      const deleteResponse = await request(app)
        .delete(`/api/category/admin/categories/${savedCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Step 10: Verify category is deleted
      const deletedCategory = await categoryModel.findById(savedCategory._id);
      expect(deletedCategory).toBeFalsy();
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle invalid file upload gracefully', async () => {
      const textFilePath = path.join(__dirname, 'test-invalid.txt');
      fs.writeFileSync(textFilePath, 'This is not an image');

      const response = await request(app)
        .post('/api/food/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Invalid Food')
        .field('description', 'Food with invalid image')
        .field('price', '10.99')
        .field('category', 'Test Category')
        .attach('image', textFilePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Verify no food was created
      const foods = await foodModel.find({ name: 'Invalid Food' });
      expect(foods).toHaveLength(0);

      // Clean up
      fs.unlinkSync(textFilePath);
    });

    it('should handle missing image file requests', async () => {
      const response = await request(app)
        .get('/uploads/nonexistent-image.jpg')
        .expect(404);
    });

    it('should handle unauthorized requests', async () => {
      const response = await request(app)
        .post('/api/food/add')
        .field('name', 'Unauthorized Food')
        .field('description', 'Food without auth')
        .field('price', '10.99')
        .field('category', 'Test Category')
        .attach('image', testImagePath);

      expect(response.status).toBe(401);
    });
  });

  describe('Cross-Component Integration', () => {
    it('should maintain consistency between food and category images', async () => {
      // Create category first
      const categoryResponse = await request(app)
        .post('/api/category/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Integration Category')
        .field('description', 'Category for integration test')
        .attach('image', testImagePath);

      expect(categoryResponse.status).toBe(201);
      const category = await categoryModel.findOne({ name: 'Integration Category' });

      // Create food in that category
      const foodResponse = await request(app)
        .post('/api/food/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Integration Food')
        .field('description', 'Food for integration test')
        .field('price', '15.99')
        .field('category', 'Integration Category')
        .attach('image', testImagePath);

      expect(foodResponse.status).toBe(200);
      const food = await foodModel.findOne({ name: 'Integration Food' });

      // Verify both images exist and are accessible
      const categoryImageResponse = await request(app)
        .get(category.image)
        .expect(200);

      const foodImageResponse = await request(app)
        .get(food.image)
        .expect(200);

      expect(categoryImageResponse.headers['content-type']).toMatch(/image/);
      expect(foodImageResponse.headers['content-type']).toMatch(/image/);

      // Verify images are in correct directories
      expect(category.image).toMatch(/\/uploads\/categories\//);
      expect(food.image).toMatch(/^\/uploads\//);
      expect(food.image).not.toMatch(/\/uploads\/categories\//);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent image uploads', async () => {
      const uploadPromises = [];
      
      for (let i = 0; i < 5; i++) {
        const promise = request(app)
          .post('/api/food/add')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('name', `Concurrent Food ${i}`)
          .field('description', `Concurrent test food ${i}`)
          .field('price', `${10 + i}.99`)
          .field('category', 'Concurrent Category')
          .attach('image', testImagePath);
        
        uploadPromises.push(promise);
      }

      const responses = await Promise.all(uploadPromises);
      
      // All uploads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify all foods were created
      const foods = await foodModel.find({ name: /^Concurrent Food/ });
      expect(foods).toHaveLength(5);

      // Verify all images exist
      for (const food of foods) {
        const imagePath = path.join(testUploadDir, food.image.replace('/uploads/', ''));
        expect(fs.existsSync(imagePath)).toBe(true);
      }
    });

    it('should handle rapid sequential operations', async () => {
      // Create food
      const createResponse = await request(app)
        .post('/api/food/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Rapid Test Food')
        .field('description', 'Food for rapid test')
        .field('price', '20.99')
        .field('category', 'Rapid Category')
        .attach('image', testImagePath);

      expect(createResponse.status).toBe(200);
      const food = await foodModel.findOne({ name: 'Rapid Test Food' });

      // Rapid updates
      for (let i = 0; i < 3; i++) {
        const updateResponse = await request(app)
          .put('/api/food/update')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('id', food._id.toString())
          .field('name', `Rapid Test Food ${i}`)
          .field('description', `Updated description ${i}`)
          .field('price', `${20 + i}.99`)
          .field('category', 'Rapid Category')
          .attach('image', testImagePath);

        expect(updateResponse.status).toBe(200);
      }

      // Verify final state
      const finalFood = await foodModel.findById(food._id);
      expect(finalFood.name).toBe('Rapid Test Food 2');
      expect(finalFood.price).toBe(22.99);
    });
  });
});