/**
 * Image Inconsistency Service Tests
 * 
 * Tests for the service layer of image inconsistency detection and correction.
 * 
 * Requirements: 4.3, 6.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ImageInconsistencyService from '../services/imageInconsistencyService.js';

// Mock the detector
vi.mock('../utils/imageInconsistencyDetector.js', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      generateHealthReport: vi.fn(),
      detectDuplicateImages: vi.fn(),
      detectOrphanedImages: vi.fn(),
      detectIncorrectReferences: vi.fn(),
      correctDuplicateImages: vi.fn(),
      correctOrphanedImages: vi.fn(),
      correctIncorrectReferences: vi.fn(),
      runComprehensiveCorrection: vi.fn(),
      integrityChecker: {
        getStorageStatistics: vi.fn(),
        performIntegrityCheck: vi.fn()
      }
    }))
  };
});

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    backend: {
      info: vi.fn(),
      error: vi.fn()
    }
  }
}));

describe('ImageInconsistencyService', () => {
  let service;
  let mockDetector;

  beforeEach(() => {
    service = new ImageInconsistencyService();
    mockDetector = service.detector;
  });

  describe('getSystemHealth', () => {
    it('should return system health status successfully', async () => {
      const mockHealthReport = {
        healthScore: 85,
        status: 'good',
        timestamp: '2024-01-01T00:00:00.000Z',
        summary: {
          totalFiles: 10,
          totalIssues: 2
        },
        recommendations: [
          { type: 'cleanup', priority: 'medium', title: 'Clean up duplicates' }
        ]
      };

      mockDetector.generateHealthReport.mockResolvedValue(mockHealthReport);

      const result = await service.getSystemHealth();

      expect(result.success).toBe(true);
      expect(result.data.healthScore).toBe(85);
      expect(result.data.status).toBe('good');
      expect(result.data.recommendations).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
      mockDetector.generateHealthReport.mockRejectedValue(new Error('Test error'));

      const result = await service.getSystemHealth();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erro ao obter status de saúde do sistema');
      expect(result.error).toBe('Test error');
    });

    it('should limit recommendations to top 5', async () => {
      const mockHealthReport = {
        healthScore: 50,
        status: 'fair',
        timestamp: '2024-01-01T00:00:00.000Z',
        summary: { totalFiles: 10, totalIssues: 8 },
        recommendations: Array(10).fill().map((_, i) => ({
          type: 'cleanup',
          priority: 'medium',
          title: `Recommendation ${i + 1}`
        }))
      };

      mockDetector.generateHealthReport.mockResolvedValue(mockHealthReport);

      const result = await service.getSystemHealth();

      expect(result.success).toBe(true);
      expect(result.data.recommendations).toHaveLength(5);
    });
  });

  describe('getDetailedHealthReport', () => {
    it('should return detailed health report', async () => {
      const mockHealthReport = {
        healthScore: 75,
        status: 'good',
        timestamp: '2024-01-01T00:00:00.000Z',
        summary: { totalFiles: 20, totalIssues: 3 },
        details: {
          duplicates: { duplicates: [] },
          orphaned: { orphanedFiles: [] },
          incorrectReferences: { incorrectReferences: [] }
        },
        recommendations: []
      };

      mockDetector.generateHealthReport.mockResolvedValue(mockHealthReport);

      const result = await service.getDetailedHealthReport();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHealthReport);
    });

    it('should handle errors in detailed report generation', async () => {
      mockDetector.generateHealthReport.mockRejectedValue(new Error('Report error'));

      const result = await service.getDetailedHealthReport();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erro ao gerar relatório detalhado de saúde');
    });
  });

  describe('detectDuplicates', () => {
    it('should detect duplicates successfully', async () => {
      const mockDuplicateResult = {
        success: true,
        duplicates: [
          {
            hash: 'abc123',
            files: ['file1.jpg', 'file2.jpg'],
            size: 1024
          }
        ],
        statistics: {
          totalDuplicateFiles: 1,
          wastedSpace: 1024
        }
      };

      mockDetector.detectDuplicateImages.mockResolvedValue(mockDuplicateResult);

      const result = await service.detectDuplicates();

      expect(result.success).toBe(true);
      expect(result.data.duplicateGroups).toBe(1);
      expect(result.data.totalDuplicateFiles).toBe(1);
      expect(result.data.wastedSpace).toBe(1024);
      expect(result.data.duplicates).toHaveLength(1);
    });

    it('should handle detection failure', async () => {
      mockDetector.detectDuplicateImages.mockResolvedValue({
        success: false,
        error: 'Detection failed'
      });

      const result = await service.detectDuplicates();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erro ao detectar imagens duplicadas');
    });
  });

  describe('detectOrphaned', () => {
    it('should detect orphaned images successfully', async () => {
      const mockOrphanedResult = {
        success: true,
        orphanedFiles: ['orphan1.jpg', 'orphan2.jpg'],
        totalFiles: 10,
        referencedFiles: 8
      };

      mockDetector.detectOrphanedImages.mockResolvedValue(mockOrphanedResult);

      const result = await service.detectOrphaned();

      expect(result.success).toBe(true);
      expect(result.data.orphanedCount).toBe(2);
      expect(result.data.totalFiles).toBe(10);
      expect(result.data.referencedFiles).toBe(8);
      expect(result.data.orphanedFiles).toEqual(['orphan1.jpg', 'orphan2.jpg']);
    });

    it('should handle orphaned detection failure', async () => {
      mockDetector.detectOrphanedImages.mockResolvedValue({
        success: false,
        error: 'Orphaned detection failed'
      });

      const result = await service.detectOrphaned();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erro ao detectar imagens órfãs');
    });
  });

  describe('detectIncorrectReferences', () => {
    it('should detect incorrect references and group by type', async () => {
      const mockIncorrectRefResult = {
        success: true,
        incorrectReferences: [
          {
            categoryId: '123',
            categoryName: 'Category 1',
            issue: 'file_not_found',
            description: 'File missing'
          },
          {
            categoryId: '456',
            categoryName: 'Category 2',
            issue: 'file_not_found',
            description: 'File missing'
          },
          {
            categoryId: '789',
            categoryName: 'Category 3',
            issue: 'id_mismatch',
            description: 'ID mismatch'
          }
        ],
        totalCategories: 10
      };

      mockDetector.detectIncorrectReferences.mockResolvedValue(mockIncorrectRefResult);

      const result = await service.detectIncorrectReferences();

      expect(result.success).toBe(true);
      expect(result.data.totalIssues).toBe(3);
      expect(result.data.totalCategories).toBe(10);
      expect(result.data.issuesByType.file_not_found).toHaveLength(2);
      expect(result.data.issuesByType.id_mismatch).toHaveLength(1);
    });
  });

  describe('correctDuplicates', () => {
    it('should correct duplicates when found', async () => {
      // Mock detection result
      mockDetector.detectDuplicateImages.mockResolvedValue({
        success: true,
        duplicates: [{ hash: 'abc', files: ['file1.jpg', 'file2.jpg'], size: 1024 }]
      });

      // Mock correction result
      mockDetector.correctDuplicateImages.mockResolvedValue({
        success: true,
        corrected: 1,
        errors: 0,
        freedSpace: 1024,
        correctedFiles: ['file2.jpg']
      });

      const result = await service.correctDuplicates(true);

      expect(result.success).toBe(true);
      expect(result.message).toBe('1 imagens duplicadas removidas com sucesso');
      expect(result.data.corrected).toBe(1);
      expect(result.data.freedSpace).toBe(1024);
    });

    it('should handle case when no duplicates found', async () => {
      mockDetector.detectDuplicateImages.mockResolvedValue({
        success: true,
        duplicates: []
      });

      const result = await service.correctDuplicates();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Nenhuma imagem duplicada encontrada');
      expect(result.data.corrected).toBe(0);
    });

    it('should handle correction failure', async () => {
      mockDetector.detectDuplicateImages.mockResolvedValue({
        success: true,
        duplicates: [{ hash: 'abc', files: ['file1.jpg', 'file2.jpg'] }]
      });

      mockDetector.correctDuplicateImages.mockResolvedValue({
        success: false,
        error: 'Correction failed'
      });

      const result = await service.correctDuplicates();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erro ao corrigir imagens duplicadas');
    });
  });

  describe('correctOrphaned', () => {
    it('should correct orphaned images when found', async () => {
      mockDetector.detectOrphanedImages.mockResolvedValue({
        success: true,
        orphanedFiles: ['orphan1.jpg', 'orphan2.jpg']
      });

      mockDetector.correctOrphanedImages.mockResolvedValue({
        success: true,
        cleaned: 2,
        errors: 0,
        backupPath: '/path/to/backups'
      });

      const result = await service.correctOrphaned(true);

      expect(result.success).toBe(true);
      expect(result.message).toBe('2 imagens órfãs removidas com sucesso');
      expect(result.data.cleaned).toBe(2);
    });

    it('should handle case when no orphaned files found', async () => {
      mockDetector.detectOrphanedImages.mockResolvedValue({
        success: true,
        orphanedFiles: []
      });

      const result = await service.correctOrphaned();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Nenhuma imagem órfã encontrada');
      expect(result.data.cleaned).toBe(0);
    });
  });

  describe('correctIncorrectReferences', () => {
    it('should correct incorrect references when found', async () => {
      mockDetector.detectIncorrectReferences.mockResolvedValue({
        success: true,
        incorrectReferences: [
          { categoryId: '123', issue: 'id_mismatch' },
          { categoryId: '456', issue: 'non_unique_format' }
        ]
      });

      mockDetector.correctIncorrectReferences.mockResolvedValue({
        success: true,
        corrected: 1,
        skipped: 1,
        errors: 0,
        corrections: []
      });

      const result = await service.correctIncorrectReferences();

      expect(result.success).toBe(true);
      expect(result.message).toBe('1 referências corrigidas, 1 requerem intervenção manual');
      expect(result.data.corrected).toBe(1);
      expect(result.data.skipped).toBe(1);
    });

    it('should handle case when no incorrect references found', async () => {
      mockDetector.detectIncorrectReferences.mockResolvedValue({
        success: true,
        incorrectReferences: []
      });

      const result = await service.correctIncorrectReferences();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Nenhuma referência incorreta encontrada');
      expect(result.data.corrected).toBe(0);
    });
  });

  describe('runComprehensiveCorrection', () => {
    it('should run comprehensive correction successfully', async () => {
      const mockCorrectionResult = {
        success: true,
        duration: 5000,
        summary: {
          totalCorrected: 5,
          totalErrors: 1,
          freedSpace: 2048
        },
        corrections: {
          duplicates: { corrected: 2, errors: 0, freedSpace: 1024 },
          orphaned: { cleaned: 2, errors: 0 },
          references: { corrected: 1, skipped: 0, errors: 1 }
        }
      };

      mockDetector.runComprehensiveCorrection.mockResolvedValue(mockCorrectionResult);

      const result = await service.runComprehensiveCorrection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('5 correções realizadas');
      expect(result.message).toContain('1 erros');
      expect(result.message).toContain('2 KB liberados');
      expect(result.data.duration).toBe(5000);
      expect(result.data.summary.totalCorrected).toBe(5);
    });

    it('should handle comprehensive correction failure', async () => {
      mockDetector.runComprehensiveCorrection.mockResolvedValue({
        success: false,
        error: 'Comprehensive correction failed'
      });

      const result = await service.runComprehensiveCorrection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erro na correção abrangente');
    });
  });

  describe('getStorageStatistics', () => {
    it('should return storage statistics successfully', async () => {
      const mockStorageStats = {
        success: true,
        statistics: {
          totalFiles: 50,
          totalSize: 1048576,
          averageSize: 20971,
          totalCategories: 25,
          categoriesWithImages: 23,
          storageEfficiency: 92
        },
        fileSizes: [
          { filename: 'large1.jpg', size: 102400 },
          { filename: 'large2.jpg', size: 98304 }
        ]
      };

      mockDetector.integrityChecker.getStorageStatistics.mockResolvedValue(mockStorageStats);

      const result = await service.getStorageStatistics();

      expect(result.success).toBe(true);
      expect(result.data.totalFiles).toBe(50);
      expect(result.data.totalSize).toBe(1048576);
      expect(result.data.storageEfficiency).toBe(92);
      expect(result.data.largestFiles).toHaveLength(2);
    });

    it('should handle storage statistics error', async () => {
      mockDetector.integrityChecker.getStorageStatistics.mockResolvedValue({
        success: false,
        error: 'Storage stats error'
      });

      const result = await service.getStorageStatistics();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erro ao obter estatísticas de armazenamento');
    });
  });

  describe('validateSystemIntegrity', () => {
    it('should validate system integrity successfully', async () => {
      const mockIntegrityReport = {
        summary: {
          isHealthy: true,
          totalIssues: 0
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        orphanedImages: { orphanedFiles: [] },
        missingFiles: { missingFiles: [] },
        invalidNaming: { invalidNaming: [] }
      };

      mockDetector.integrityChecker.performIntegrityCheck.mockResolvedValue(mockIntegrityReport);

      const result = await service.validateSystemIntegrity();

      expect(result.success).toBe(true);
      expect(result.data.isHealthy).toBe(true);
      expect(result.data.totalIssues).toBe(0);
      expect(result.data.orphanedImages).toBe(0);
      expect(result.data.missingFiles).toBe(0);
      expect(result.data.invalidNaming).toBe(0);
    });

    it('should handle integrity validation error', async () => {
      mockDetector.integrityChecker.performIntegrityCheck.mockRejectedValue(
        new Error('Integrity check failed')
      );

      const result = await service.validateSystemIntegrity();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erro ao validar integridade do sistema');
    });
  });
});