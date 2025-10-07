import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { logger, imageLogger, imageServingMiddleware } from '../utils/logger.js';

// Mock console methods to avoid cluttering test output
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
};

vi.stubGlobal('console', consoleMock);

describe('Image Logger', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any test files
    const testLogPath = path.join(process.cwd(), 'logs', 'test-images.log');
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  describe('Image Upload Logging', () => {
    it('should log upload start', () => {
      logger.image.upload.start('test.jpg', 1024, 'image/jpeg', 'user123');
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('🖼️ [IMAGE-UPLOAD] Upload iniciado: test.jpg (1024 bytes, image/jpeg) por usuário user123')
      );
    });

    it('should log upload success', () => {
      logger.image.upload.success('test.jpg', '/uploads/test.jpg', 500, 'user123');
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ [IMAGE-UPLOAD] Upload concluído: test.jpg → /uploads/test.jpg (500ms) por usuário user123')
      );
    });

    it('should log upload error', () => {
      const error = new Error('Upload failed');
      logger.image.upload.error('test.jpg', error, 'user123');
      
      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ [IMAGE-UPLOAD] Falha no upload: test.jpg por usuário user123 - Upload failed')
      );
    });
  });

  describe('Image Serving Logging', () => {
    it('should log serving request', () => {
      logger.image.serving.request('/uploads/test.jpg', 'Mozilla/5.0', '127.0.0.1');
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('🌐 [IMAGE-SERVE] Imagem solicitada: /uploads/test.jpg de 127.0.0.1')
      );
    });

    it('should log serving success', () => {
      logger.image.serving.success('/uploads/test.jpg', 2048, 150, false);
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('📤 [IMAGE-SERVE] Imagem servida: /uploads/test.jpg (2048 bytes, 150ms)')
      );
    });

    it('should log serving success with cache', () => {
      logger.image.serving.success('/uploads/test.jpg', 2048, 50, true);
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('📤 [IMAGE-SERVE] Imagem servida: /uploads/test.jpg (2048 bytes, 50ms) [CACHED]')
      );
    });

    it('should log not found', () => {
      logger.image.serving.notFound('/uploads/missing.jpg', '127.0.0.1');
      
      expect(consoleMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('❓ [IMAGE-SERVE] Imagem não encontrada: /uploads/missing.jpg solicitada de 127.0.0.1')
      );
    });
  });

  describe('Image Validation Logging', () => {
    it('should log validation failure', () => {
      logger.image.upload.validation.failed('test.txt', 'Invalid file type', 'user123');
      
      expect(consoleMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ [IMAGE-VALIDATION] Validação falhou: test.txt - Invalid file type (usuário user123)')
      );
    });

    it('should log validation success', () => {
      logger.image.upload.validation.passed('test.jpg', ['type', 'size'], 'user123');
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ [IMAGE-VALIDATION] Validação passou: test.jpg - type, size (usuário user123)')
      );
    });
  });

  describe('Image Performance Logging', () => {
    it('should log slow upload', () => {
      logger.image.performance.slowUpload('large.jpg', 6000, 5000);
      
      expect(consoleMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('🐌 [IMAGE-PERF] Upload lento detectado: large.jpg levou 6000ms (limite: 5000ms)')
      );
    });

    it('should not log fast upload', () => {
      logger.image.performance.slowUpload('small.jpg', 2000, 5000);
      
      expect(consoleMock.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('🐌 [IMAGE-PERF]')
      );
    });

    it('should log performance metrics', () => {
      logger.image.performance.metrics('upload', 10, 1500, 3000, 500);
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('📊 [IMAGE-METRICS] Métricas de upload: 10 operações, média 1500ms, máx 3000ms, mín 500ms')
      );
    });
  });

  describe('Image File Operations Logging', () => {
    it('should log file creation', () => {
      logger.image.file.created('/uploads/new.jpg', 1024);
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('📁 [IMAGE-FILE] Arquivo criado: /uploads/new.jpg (1024 bytes)')
      );
    });

    it('should log file deletion', () => {
      logger.image.file.deleted('/uploads/old.jpg', 'user request');
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('🗑️ [IMAGE-FILE] Arquivo removido: /uploads/old.jpg (motivo: user request)')
      );
    });

    it('should log corrupted file', () => {
      const error = new Error('File corrupted');
      logger.image.file.corrupted('/uploads/bad.jpg', error);
      
      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('💥 [IMAGE-FILE] Arquivo corrompido detectado: /uploads/bad.jpg')
      );
    });
  });

  describe('Image Logger Utilities', () => {
    it('should measure operation time', async () => {
      const mockOperation = vi.fn().mockResolvedValue({ path: '/uploads/test.jpg' });
      
      const result = await imageLogger.timeOperation(mockOperation, 'test', { filename: 'test.jpg' });
      
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('duration');
      expect(result.result.path).toBe('/uploads/test.jpg');
      expect(typeof result.duration).toBe('number');
    });

    it('should handle operation errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(
        imageLogger.timeOperation(mockOperation, 'test', { filename: 'test.jpg' })
      ).rejects.toThrow('Operation failed');
    });
  });

  describe('Performance Collector', () => {
    it('should record and report metrics', () => {
      const collector = imageLogger.performanceCollector;
      
      // Record some operations
      collector.record('upload', 1000);
      collector.record('upload', 2000);
      collector.record('upload', 1500);
      
      // Report metrics
      collector.report();
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('📊 [IMAGE-METRICS] Métricas de upload: 3 operações, média 1500ms, máx 2000ms, mín 1000ms')
      );
    });
  });
});