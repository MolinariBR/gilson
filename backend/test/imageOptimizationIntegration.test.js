import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import imageCompressionMiddleware from '../middleware/imageCompression.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Image Optimization Integration Tests', () => {
  let app;
  let testImagePath;

  beforeEach(() => {
    // Create test Express app
    app = express();
    app.use(express.json());

    // Set up test image serving with optimization
    app.use('/uploads', express.static('uploads', {
      maxAge: '1y',
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Vary', 'Accept-Encoding');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          
          const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml'
          };
          
          if (mimeTypes[ext]) {
            res.setHeader('Content-Type', mimeTypes[ext]);
          }
        }
      }
    }));

    // Create test image file
    testImagePath = path.join(__dirname, '../uploads/test-image.jpg');
    if (!fs.existsSync(path.dirname(testImagePath))) {
      fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    }
    
    // Create a simple test image (just some bytes)
    const testImageData = Buffer.from('fake-image-data-for-testing');
    fs.writeFileSync(testImagePath, testImageData);
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  describe('Image Serving Optimization', () => {
    it('should serve images with proper caching headers', async () => {
      const response = await request(app)
        .get('/uploads/test-image.jpg')
        .expect(200);

      // Check caching headers
      expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['vary']).toBe('Accept-Encoding');
      expect(response.headers['etag']).toBeDefined();
      expect(response.headers['last-modified']).toBeDefined();
    });

    it('should return 404 for non-existent images', async () => {
      await request(app)
        .get('/uploads/non-existent-image.jpg')
        .expect(404);
    });

    it('should handle different image formats', async () => {
      const formats = [
        { ext: '.png', mime: 'image/png' },
        { ext: '.gif', mime: 'image/gif' },
        { ext: '.webp', mime: 'image/webp' },
        { ext: '.svg', mime: 'image/svg+xml' }
      ];

      for (const format of formats) {
        const formatImagePath = path.join(__dirname, `../uploads/test-image${format.ext}`);
        fs.writeFileSync(formatImagePath, Buffer.from('test-data'));

        const response = await request(app)
          .get(`/uploads/test-image${format.ext}`)
          .expect(200);

        expect(response.headers['content-type']).toBe(format.mime);

        // Clean up
        fs.unlinkSync(formatImagePath);
      }
    });
  });

  describe('Image Compression Middleware', () => {
    it('should provide compression statistics', () => {
      const stats = imageCompressionMiddleware.getCompressionStats();
      
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('quality');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('optimizer');
      
      expect(typeof stats.enabled).toBe('boolean');
      expect(typeof stats.quality).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
    });

    it('should handle compression middleware without errors', async () => {
      // Create a mock request with file
      const mockReq = {
        file: {
          path: testImagePath,
          filename: 'test-image.jpg',
          mimetype: 'image/jpeg',
          size: 1024
        }
      };
      
      const mockRes = {};
      const mockNext = () => {};

      // Should not throw errors
      expect(() => {
        imageCompressionMiddleware.compressUploadedImages(mockReq, mockRes, mockNext);
      }).not.toThrow();
    });
  });

  describe('Performance Metrics', () => {
    it('should measure image serving performance', async () => {
      const startTime = Date.now();
      
      // Make multiple concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/uploads/test-image.jpg')
      );
      
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(1000); // Less than 1 second for 5 requests
      
      console.log(`Served ${requests.length} images concurrently in ${totalTime}ms`);
    });

    it('should validate caching effectiveness', async () => {
      // First request (cache miss)
      const firstStart = Date.now();
      const firstResponse = await request(app).get('/uploads/test-image.jpg');
      const firstTime = Date.now() - firstStart;
      
      // Second request (should be faster due to caching)
      const secondStart = Date.now();
      const secondResponse = await request(app).get('/uploads/test-image.jpg');
      const secondTime = Date.now() - secondStart;
      
      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
      
      // Both should have caching headers
      expect(firstResponse.headers['etag']).toBeDefined();
      expect(secondResponse.headers['etag']).toBeDefined();
      expect(firstResponse.headers['etag']).toBe(secondResponse.headers['etag']);
      
      console.log(`First request: ${firstTime}ms, Second request: ${secondTime}ms`);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed image requests gracefully', async () => {
      const malformedRequests = [
        '/uploads/../../../etc/passwd',
        '/uploads/image.jpg%00.txt',
        '/uploads/image.jpg?query=malicious',
        '/uploads/image.jpg#fragment'
      ];

      for (const malformedPath of malformedRequests) {
        const response = await request(app).get(malformedPath);
        
        // Should either return 404 or handle gracefully (not 500)
        expect([404, 400, 403]).toContain(response.status);
      }
    });

    it('should handle large file requests', async () => {
      // Create a larger test file
      const largeImagePath = path.join(__dirname, '../uploads/large-test-image.jpg');
      const largeImageData = Buffer.alloc(1024 * 1024, 'x'); // 1MB of data
      fs.writeFileSync(largeImagePath, largeImageData);

      const response = await request(app)
        .get('/uploads/large-test-image.jpg')
        .expect(200);

      expect(response.headers['content-length']).toBe(String(largeImageData.length));

      // Clean up
      fs.unlinkSync(largeImagePath);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers for images', async () => {
      const response = await request(app)
        .get('/uploads/test-image.jpg')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-type']).toBe('image/jpeg');
    });

    it('should prevent directory traversal', async () => {
      const traversalAttempts = [
        '/uploads/../test-image.jpg',
        '/uploads/..%2Ftest-image.jpg',
        '/uploads/..%252Ftest-image.jpg'
      ];

      for (const attempt of traversalAttempts) {
        const response = await request(app).get(attempt);
        
        // Should not serve files outside uploads directory
        expect([404, 400, 403]).toContain(response.status);
      }
    });
  });
});