import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { logger, imageLogger } from '../utils/logger.js';
import imageMonitoring, { ImageMonitoring } from '../utils/imageMonitoring.js';
import imageLoggingIntegration from '../utils/imageLoggingIntegration.js';
import fs from 'fs';
import path from 'path';

describe('Image Logging and Monitoring System', () => {
  let testMonitoring;
  
  beforeEach(() => {
    // Create a fresh monitoring instance for testing
    testMonitoring = new ImageMonitoring();
  });

  afterEach(() => {
    // Clean up any test files
    testMonitoring.resetMetrics();
  });

  describe('Image Logger', () => {
    test('should log upload start correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.image.upload.start('test.jpg', 1024, 'image/jpeg', 'user123');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🖼️ [IMAGE-UPLOAD] Upload iniciado: test.jpg (1024 bytes, image/jpeg) por usuário user123')
      );
      
      consoleSpy.mockRestore();
    });

    test('should log upload success correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.image.upload.success('test.jpg', '/uploads/categories/test.jpg', 1500, 'user123');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ [IMAGE-UPLOAD] Upload concluído: test.jpg → /uploads/categories/test.jpg (1500ms) por usuário user123')
      );
      
      consoleSpy.mockRestore();
    });

    test('should log upload error correctly', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const error = new Error('Test upload error');
      
      logger.image.upload.error('test.jpg', error, 'user123');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ [IMAGE-UPLOAD] Falha no upload: test.jpg por usuário user123 - Test upload error')
      );
      
      consoleSpy.mockRestore();
    });

    test('should log validation failure correctly', () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      
      logger.image.upload.validation.failed('test.jpg', 'Invalid file type', 'user123');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ [IMAGE-VALIDATION] Validação falhou: test.jpg - Invalid file type (usuário user123)')
      );
      
      consoleSpy.mockRestore();
    });

    test('should log validation success correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.image.upload.validation.passed('test.jpg', ['type', 'size'], 'user123');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ [IMAGE-VALIDATION] Validação passou: test.jpg - type, size (usuário user123)')
      );
      
      consoleSpy.mockRestore();
    });

    test('should log file operations correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.image.file.created('/uploads/test.jpg', 2048);
      logger.image.file.deleted('/uploads/old.jpg', 'cleanup');
      logger.image.file.moved('/tmp/upload.jpg', '/uploads/final.jpg');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📁 [IMAGE-FILE] Arquivo criado: /uploads/test.jpg (2048 bytes)')
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🗑️ [IMAGE-FILE] Arquivo removido: /uploads/old.jpg (motivo: cleanup)')
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📦 [IMAGE-FILE] Arquivo movido: /tmp/upload.jpg → /uploads/final.jpg')
      );
      
      consoleSpy.mockRestore();
    });

    test('should log performance metrics correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.image.performance.metrics('upload', 10, 1500, 3000, 500);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📊 [IMAGE-METRICS] Métricas de upload: 10 operações, média 1500ms, máx 3000ms, mín 500ms')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Image Monitoring', () => {
    test('should record upload metrics correctly', () => {
      testMonitoring.recordUpload(true, 1000, 2048);
      testMonitoring.recordUpload(false, 2000, 1024);
      
      const metrics = testMonitoring.getMetricsSummary();
      
      expect(metrics.uploads.total).toBe(2);
      expect(metrics.uploads.successful).toBe(1);
      expect(metrics.uploads.failed).toBe(1);
      expect(metrics.uploads.totalSize).toBe(2048);
      expect(metrics.uploads.averageDuration).toBe(1500);
    });

    test('should record serving metrics correctly', () => {
      testMonitoring.recordServing('success', 500, 4096);
      testMonitoring.recordServing('notFound', 100, 0);
      testMonitoring.recordServing('error', 200, 0);
      
      const metrics = testMonitoring.getMetricsSummary();
      
      expect(metrics.serving.total).toBe(3);
      expect(metrics.serving.successful).toBe(1);
      expect(metrics.serving.notFound).toBe(1);
      expect(metrics.serving.errors).toBe(1);
      expect(metrics.serving.totalSize).toBe(4096);
    });

    test('should record validation metrics correctly', () => {
      testMonitoring.recordValidation(true);
      testMonitoring.recordValidation(false, 'type');
      testMonitoring.recordValidation(false, 'size');
      
      const metrics = testMonitoring.getMetricsSummary();
      
      expect(metrics.validation.total).toBe(3);
      expect(metrics.validation.passed).toBe(1);
      expect(metrics.validation.failed).toBe(2);
      expect(metrics.validation.typeFailures).toBe(1);
      expect(metrics.validation.sizeFailures).toBe(1);
    });

    test('should trigger alerts for high failure rates', () => {
      // Generate enough samples to trigger alert
      for (let i = 0; i < 15; i++) {
        testMonitoring.recordUpload(false, 1000, 1024); // All failures
      }
      
      const alerts = testMonitoring.alerts.history;
      const failureRateAlert = alerts.find(alert => alert.type === 'HIGH_UPLOAD_FAILURE_RATE');
      
      expect(failureRateAlert).toBeDefined();
      expect(failureRateAlert.severity).toBe('critical');
    });

    test('should trigger alerts for slow uploads', () => {
      testMonitoring.recordUpload(true, 6000, 1024); // Slow upload (> 5s threshold)
      
      const alerts = testMonitoring.alerts.history;
      const slowUploadAlert = alerts.find(alert => alert.type === 'SLOW_UPLOAD_DETECTED');
      
      expect(slowUploadAlert).toBeDefined();
      expect(slowUploadAlert.severity).toBe('warning');
    });

    test('should format bytes correctly', () => {
      expect(testMonitoring.formatBytes(1024)).toBe('1 KB');
      expect(testMonitoring.formatBytes(1048576)).toBe('1 MB');
      expect(testMonitoring.formatBytes(1073741824)).toBe('1 GB');
    });

    test('should format duration correctly', () => {
      expect(testMonitoring.formatDuration(1000)).toBe('1s');
      expect(testMonitoring.formatDuration(61000)).toBe('1m 1s');
      expect(testMonitoring.formatDuration(3661000)).toBe('1h 1m 1s');
    });

    test('should reset metrics correctly', () => {
      testMonitoring.recordUpload(true, 1000, 1024);
      testMonitoring.recordServing('success', 500, 2048);
      
      let metrics = testMonitoring.getMetricsSummary();
      expect(metrics.uploads.total).toBe(1);
      expect(metrics.serving.total).toBe(1);
      
      testMonitoring.resetMetrics();
      
      metrics = testMonitoring.getMetricsSummary();
      expect(metrics.uploads.total).toBe(0);
      expect(metrics.serving.total).toBe(0);
    });
  });

  describe('Image Logging Integration', () => {
    test('should provide system status', () => {
      const status = imageLoggingIntegration.getSystemStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('alerts');
      expect(status).toHaveProperty('recommendations');
      
      expect(['healthy', 'warning', 'critical']).toContain(status.status);
    });

    test('should generate performance report', () => {
      const report = imageLoggingIntegration.generatePerformanceReport('hour');
      
      expect(report).toHaveProperty('timeframe', 'hour');
      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
      expect(report).toHaveProperty('alerts');
      expect(report).toHaveProperty('recommendations');
      
      expect(report.details).toHaveProperty('uploads');
      expect(report.details).toHaveProperty('serving');
      expect(report.details).toHaveProperty('validation');
      expect(report.details).toHaveProperty('maintenance');
    });

    test('should calculate overall success rate correctly', () => {
      const mockMetrics = {
        uploads: { total: 10, successful: 8 },
        serving: { total: 20, successful: 19 }
      };
      
      const successRate = imageLoggingIntegration.calculateOverallSuccessRate(mockMetrics);
      expect(successRate).toBe('90.00%'); // (8+19)/(10+20) = 27/30 = 90%
    });

    test('should determine system health correctly', () => {
      const healthyMetrics = {
        uploads: { total: 10, successful: 10 },
        serving: { total: 10, successful: 10 }
      };
      
      const warningMetrics = {
        uploads: { total: 10, successful: 8 }, // 80% success rate
        serving: { total: 10, successful: 10 }
      };
      
      expect(imageLoggingIntegration.determineSystemHealth(healthyMetrics, [])).toBe('healthy');
      expect(imageLoggingIntegration.determineSystemHealth(warningMetrics, [])).toBe('warning');
    });

    test('should generate appropriate recommendations', () => {
      const metricsWithSlowUploads = {
        uploads: { total: 100, successful: 100, slowUploads: 15 }, // 15% slow uploads
        serving: { total: 100, successful: 100, slowServing: 2 },
        validation: { total: 100, passed: 100, failed: 0 },
        maintenance: { orphansDetected: 5 }
      };
      
      const recommendations = imageLoggingIntegration.generateRecommendations(metricsWithSlowUploads, []);
      
      const performanceRec = recommendations.find(rec => rec.type === 'performance');
      expect(performanceRec).toBeDefined();
      expect(performanceRec.priority).toBe('medium');
    });
  });

  describe('Performance Collector', () => {
    test('should record and report performance metrics', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      imageLogger.performanceCollector.record('test_operation', 100);
      imageLogger.performanceCollector.record('test_operation', 200);
      imageLogger.performanceCollector.record('test_operation', 150);
      
      imageLogger.performanceCollector.report();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📊 [IMAGE-METRICS] Métricas de test_operation: 3 operações, média 150ms, máx 200ms, mín 100ms')
      );
      
      // Should clear metrics after reporting
      expect(imageLogger.performanceCollector.operations.size).toBe(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Log File Writing', () => {
    test('should write logs to appropriate files', () => {
      // This test would need to check actual file writing
      // For now, we'll just verify the logger methods don't throw errors
      expect(() => {
        logger.image.upload.start('test.jpg', 1024, 'image/jpeg');
        logger.image.upload.success('test.jpg', '/path/to/image', 1000);
        logger.image.serving.request('/path/to/image', 'Mozilla/5.0', '127.0.0.1');
        logger.image.file.created('/path/to/image', 1024);
        logger.image.maintenance.cleanup(5, 10240);
      }).not.toThrow();
    });
  });
});

// Integration test with actual file operations
describe('Image Logging Integration Tests', () => {
  const testDir = path.join(process.cwd(), 'test-temp');
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should log file operations with actual files', () => {
    const testFile = path.join(testDir, 'test-image.jpg');
    const testContent = Buffer.from('fake image content');
    
    // Create test file
    fs.writeFileSync(testFile, testContent);
    
    const consoleSpy = vi.spyOn(console, 'log');
    
    // Log file creation
    logger.image.file.created(testFile, testContent.length);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`📁 [IMAGE-FILE] Arquivo criado: ${testFile} (${testContent.length} bytes)`)
    );
    
    // Log file deletion
    fs.unlinkSync(testFile);
    logger.image.file.deleted(testFile, 'test cleanup');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`🗑️ [IMAGE-FILE] Arquivo removido: ${testFile} (motivo: test cleanup)`)
    );
    
    consoleSpy.mockRestore();
  });
});