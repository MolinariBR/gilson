import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import foodRouter from '../routes/foodRoute.js';
import categoryRouter from '../routes/categoryRoute.js';

describe('Route Configuration Tests', () => {
  describe('Food Route Configuration', () => {
    it('should have image validation middleware on add route', async () => {
      const app = express();
      app.use('/api/food', foodRouter);

      // Test with invalid file type - should be rejected by validation middleware
      const response = await request(app)
        .post('/api/food/add')
        .field('name', 'Test Food')
        .field('description', 'Test description')
        .field('price', '10.99')
        .field('category', 'test-category')
        .field('userId', '507f1f77bcf86cd799439011') // Mock user ID
        .attach('image', Buffer.from('not an image'), 'test.txt');

      // Should be rejected by image validation middleware before reaching auth
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid file type');
    });

    it('should have image validation middleware on update route', async () => {
      const app = express();
      app.use('/api/food', foodRouter);

      // Test with invalid file type - should be rejected by validation middleware
      const response = await request(app)
        .put('/api/food/update')
        .field('name', 'Updated Food')
        .field('description', 'Updated description')
        .field('price', '15.99')
        .field('id', '507f1f77bcf86cd799439011') // Mock food ID
        .field('userId', '507f1f77bcf86cd799439011') // Mock user ID
        .attach('image', Buffer.from('not an image'), 'test.txt');

      // Should be rejected by image validation middleware before reaching auth
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid file type');
    });

    it('should accept requests without image files', async () => {
      const app = express();
      app.use('/api/food', foodRouter);

      // Test without image - should pass validation middleware but fail at auth
      const response = await request(app)
        .post('/api/food/add')
        .field('name', 'Test Food No Image')
        .field('description', 'Test description')
        .field('price', '10.99')
        .field('category', 'test-category')
        .field('userId', '507f1f77bcf86cd799439011'); // Mock user ID

      // Should pass image validation but fail at auth (since we don't have valid auth)
      expect(response.status).toBe(200); // Will reach controller but fail there
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You are not admin'); // Auth failure message
    });
  });

  describe('Category Route Configuration', () => {
    it('should have image validation middleware on create route', async () => {
      const app = express();
      app.use('/api/category', categoryRouter);

      // Test with invalid file type - should be rejected by validation middleware
      const response = await request(app)
        .post('/api/category/admin/categories')
        .field('name', 'Test Category')
        .field('originalName', 'Test Category')
        .field('slug', 'test-category')
        .attach('image', Buffer.from('not an image'), 'test.txt');

      // Should be rejected by image validation middleware before reaching auth
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid file type');
    });

    it('should have image validation middleware on update route', async () => {
      const app = express();
      app.use('/api/category', categoryRouter);

      // Test with invalid file type - should be rejected by validation middleware
      const response = await request(app)
        .put('/api/category/admin/categories/507f1f77bcf86cd799439011')
        .field('name', 'Updated Category')
        .attach('image', Buffer.from('not an image'), 'test.txt');

      // Should be rejected by image validation middleware before reaching auth
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid file type');
    });

    it('should have image validation middleware on upload route', async () => {
      const app = express();
      app.use('/api/category', categoryRouter);

      // Test with invalid file type - should be rejected by validation middleware
      const response = await request(app)
        .post('/api/category/admin/categories/upload')
        .attach('image', Buffer.from('not an image'), 'test.txt');

      // Should be rejected by image validation middleware before reaching auth
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid file type');
    });
  });

  describe('File Size Validation', () => {
    it('should reject files larger than 5MB', async () => {
      const app = express();
      app.use('/api/food', foodRouter);

      // Create a buffer larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      // Add JPEG header to make it look like a valid image
      largeBuffer[0] = 0xFF;
      largeBuffer[1] = 0xD8;
      largeBuffer[largeBuffer.length - 2] = 0xFF;
      largeBuffer[largeBuffer.length - 1] = 0xD9;

      const response = await request(app)
        .post('/api/food/add')
        .field('name', 'Test Food Large')
        .field('description', 'Test description')
        .field('price', '10.99')
        .field('category', 'test-category')
        .field('userId', '507f1f77bcf86cd799439011')
        .attach('image', largeBuffer, 'large.jpg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('File size too large');
    });
  });

  describe('Valid Image Types', () => {
    const validImageTypes = [
      { ext: 'jpg', mime: 'image/jpeg' },
      { ext: 'jpeg', mime: 'image/jpeg' },
      { ext: 'png', mime: 'image/png' },
      { ext: 'gif', mime: 'image/gif' },
      { ext: 'webp', mime: 'image/webp' }
    ];

    validImageTypes.forEach(({ ext, mime }) => {
      it(`should accept ${ext.toUpperCase()} files`, async () => {
        const app = express();
        app.use('/api/food', foodRouter);

        // Create a minimal valid image buffer
        let imageBuffer;
        if (mime === 'image/jpeg') {
          imageBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0xFF, 0xD9]);
        } else if (mime === 'image/png') {
          imageBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52]);
        } else {
          // For other types, use a minimal buffer that won't fail dimension validation
          imageBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
        }

        const response = await request(app)
          .post('/api/food/add')
          .field('name', `Test Food ${ext.toUpperCase()}`)
          .field('description', 'Test description')
          .field('price', '10.99')
          .field('category', 'test-category')
          .field('userId', '507f1f77bcf86cd799439011')
          .attach('image', imageBuffer, `test.${ext}`);

        // Should pass image validation but may fail at auth/controller level
        // The important thing is it's not rejected by image validation (400 with "Invalid file type")
        if (response.status === 400 && response.body.message && response.body.message.includes('Invalid file type')) {
          throw new Error(`${ext.toUpperCase()} file was rejected by image validation`);
        }
        
        // If we get here, the image validation passed
        expect(true).toBe(true);
      });
    });
  });
});