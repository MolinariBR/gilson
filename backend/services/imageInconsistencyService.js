/**
 * Image Inconsistency Service
 * 
 * Service layer for image inconsistency detection and correction functionality.
 * Provides API endpoints for monitoring and maintaining image system health.
 * 
 * Requirements: 4.3, 6.4
 */

import ImageInconsistencyDetector from '../utils/imageInconsistencyDetector.js';
import { logger } from '../utils/logger.js';

class ImageInconsistencyService {
  constructor() {
    this.detector = new ImageInconsistencyDetector();
  }

  /**
   * Get system health status
   * @returns {Promise<Object>} - Health status
   */
  async getSystemHealth() {
    try {
      logger.backend.info('Generating system health status...');
      
      const report = await this.detector.generateHealthReport();
      
      return {
        success: true,
        data: {
          healthScore: report.healthScore,
          status: report.status,
          timestamp: report.timestamp,
          summary: report.summary,
          recommendations: report.recommendations?.slice(0, 5) || [] // Limit to top 5 recommendations
        }
      };
    } catch (error) {
      logger.backend.error('Error getting system health:', error);
      return {
        success: false,
        message: 'Erro ao obter status de saúde do sistema',
        error: error.message
      };
    }
  }

  /**
   * Get detailed health report
   * @returns {Promise<Object>} - Detailed health report
   */
  async getDetailedHealthReport() {
    try {
      logger.backend.info('Generating detailed health report...');
      
      const report = await this.detector.generateHealthReport();
      
      return {
        success: true,
        data: report
      };
    } catch (error) {
      logger.backend.error('Error generating detailed health report:', error);
      return {
        success: false,
        message: 'Erro ao gerar relatório detalhado de saúde',
        error: error.message
      };
    }
  }

  /**
   * Detect duplicate images
   * @returns {Promise<Object>} - Duplicate detection result
   */
  async detectDuplicates() {
    try {
      logger.backend.info('Detecting duplicate images...');
      
      const result = await this.detector.detectDuplicateImages();
      
      if (!result.success) {
        return {
          success: false,
          message: 'Erro ao detectar imagens duplicadas',
          error: result.error
        };
      }

      return {
        success: true,
        data: {
          duplicateGroups: result.duplicates.length,
          totalDuplicateFiles: result.statistics.totalDuplicateFiles,
          wastedSpace: result.statistics.wastedSpace,
          duplicates: result.duplicates.map(group => ({
            hash: group.hash,
            fileCount: group.files.length,
            size: group.size,
            files: group.files
          }))
        }
      };
    } catch (error) {
      logger.backend.error('Error detecting duplicates:', error);
      return {
        success: false,
        message: 'Erro ao detectar imagens duplicadas',
        error: error.message
      };
    }
  }

  /**
   * Detect orphaned images
   * @returns {Promise<Object>} - Orphaned detection result
   */
  async detectOrphaned() {
    try {
      logger.backend.info('Detecting orphaned images...');
      
      const result = await this.detector.detectOrphanedImages();
      
      if (!result.success) {
        return {
          success: false,
          message: 'Erro ao detectar imagens órfãs',
          error: result.error
        };
      }

      return {
        success: true,
        data: {
          orphanedCount: result.orphanedFiles.length,
          totalFiles: result.totalFiles,
          referencedFiles: result.referencedFiles,
          orphanedFiles: result.orphanedFiles
        }
      };
    } catch (error) {
      logger.backend.error('Error detecting orphaned images:', error);
      return {
        success: false,
        message: 'Erro ao detectar imagens órfãs',
        error: error.message
      };
    }
  }

  /**
   * Detect incorrect references
   * @returns {Promise<Object>} - Incorrect reference detection result
   */
  async detectIncorrectReferences() {
    try {
      logger.backend.info('Detecting incorrect references...');
      
      const result = await this.detector.detectIncorrectReferences();
      
      if (!result.success) {
        return {
          success: false,
          message: 'Erro ao detectar referências incorretas',
          error: result.error
        };
      }

      // Group issues by type for better presentation
      const issuesByType = {};
      result.incorrectReferences.forEach(ref => {
        if (!issuesByType[ref.issue]) {
          issuesByType[ref.issue] = [];
        }
        issuesByType[ref.issue].push({
          categoryId: ref.categoryId,
          categoryName: ref.categoryName,
          imagePath: ref.imagePath,
          filename: ref.filename,
          description: ref.description
        });
      });

      return {
        success: true,
        data: {
          totalIssues: result.incorrectReferences.length,
          totalCategories: result.totalCategories,
          issuesByType: issuesByType,
          issues: result.incorrectReferences
        }
      };
    } catch (error) {
      logger.backend.error('Error detecting incorrect references:', error);
      return {
        success: false,
        message: 'Erro ao detectar referências incorretas',
        error: error.message
      };
    }
  }

  /**
   * Run automatic correction for duplicates
   * @param {boolean} createBackup - Whether to create backups
   * @returns {Promise<Object>} - Correction result
   */
  async correctDuplicates(createBackup = true) {
    try {
      logger.backend.info('Starting automatic duplicate correction...');
      
      // First detect duplicates
      const detectResult = await this.detector.detectDuplicateImages();
      if (!detectResult.success || detectResult.duplicates.length === 0) {
        return {
          success: true,
          message: 'Nenhuma imagem duplicada encontrada',
          data: { corrected: 0, errors: 0, freedSpace: 0 }
        };
      }

      // Correct duplicates
      const correctionResult = await this.detector.correctDuplicateImages(
        detectResult.duplicates, 
        createBackup
      );
      
      if (!correctionResult.success) {
        return {
          success: false,
          message: 'Erro ao corrigir imagens duplicadas',
          error: correctionResult.error
        };
      }

      return {
        success: true,
        message: `${correctionResult.corrected} imagens duplicadas removidas com sucesso`,
        data: {
          corrected: correctionResult.corrected,
          errors: correctionResult.errors,
          freedSpace: correctionResult.freedSpace,
          correctedFiles: correctionResult.correctedFiles
        }
      };
    } catch (error) {
      logger.backend.error('Error correcting duplicates:', error);
      return {
        success: false,
        message: 'Erro ao corrigir imagens duplicadas',
        error: error.message
      };
    }
  }

  /**
   * Run automatic correction for orphaned images
   * @param {boolean} createBackup - Whether to create backups
   * @returns {Promise<Object>} - Correction result
   */
  async correctOrphaned(createBackup = true) {
    try {
      logger.backend.info('Starting automatic orphaned correction...');
      
      // First detect orphaned images
      const detectResult = await this.detector.detectOrphanedImages();
      if (!detectResult.success || detectResult.orphanedFiles.length === 0) {
        return {
          success: true,
          message: 'Nenhuma imagem órfã encontrada',
          data: { cleaned: 0, errors: 0 }
        };
      }

      // Correct orphaned images
      const correctionResult = await this.detector.correctOrphanedImages(
        detectResult.orphanedFiles, 
        createBackup
      );
      
      if (!correctionResult.success) {
        return {
          success: false,
          message: 'Erro ao corrigir imagens órfãs',
          error: correctionResult.error
        };
      }

      return {
        success: true,
        message: `${correctionResult.cleaned} imagens órfãs removidas com sucesso`,
        data: {
          cleaned: correctionResult.cleaned,
          errors: correctionResult.errors,
          backupPath: correctionResult.backupPath
        }
      };
    } catch (error) {
      logger.backend.error('Error correcting orphaned images:', error);
      return {
        success: false,
        message: 'Erro ao corrigir imagens órfãs',
        error: error.message
      };
    }
  }

  /**
   * Run automatic correction for incorrect references
   * @returns {Promise<Object>} - Correction result
   */
  async correctIncorrectReferences() {
    try {
      logger.backend.info('Starting automatic reference correction...');
      
      // First detect incorrect references
      const detectResult = await this.detector.detectIncorrectReferences();
      if (!detectResult.success || detectResult.incorrectReferences.length === 0) {
        return {
          success: true,
          message: 'Nenhuma referência incorreta encontrada',
          data: { corrected: 0, skipped: 0, errors: 0 }
        };
      }

      // Correct references
      const correctionResult = await this.detector.correctIncorrectReferences(
        detectResult.incorrectReferences
      );
      
      if (!correctionResult.success) {
        return {
          success: false,
          message: 'Erro ao corrigir referências incorretas',
          error: correctionResult.error
        };
      }

      return {
        success: true,
        message: `${correctionResult.corrected} referências corrigidas, ${correctionResult.skipped} requerem intervenção manual`,
        data: {
          corrected: correctionResult.corrected,
          skipped: correctionResult.skipped,
          errors: correctionResult.errors,
          corrections: correctionResult.corrections
        }
      };
    } catch (error) {
      logger.backend.error('Error correcting incorrect references:', error);
      return {
        success: false,
        message: 'Erro ao corrigir referências incorretas',
        error: error.message
      };
    }
  }

  /**
   * Run comprehensive automatic correction
   * @param {Object} options - Correction options
   * @returns {Promise<Object>} - Comprehensive correction result
   */
  async runComprehensiveCorrection(options = {}) {
    try {
      logger.backend.info('Starting comprehensive automatic correction...');
      
      const result = await this.detector.runComprehensiveCorrection(options);
      
      if (!result.success) {
        return {
          success: false,
          message: 'Erro na correção abrangente',
          error: result.error
        };
      }

      const message = `Correção concluída: ${result.summary.totalCorrected} correções realizadas, ${result.summary.totalErrors} erros, ${Math.round(result.summary.freedSpace / 1024)} KB liberados`;

      return {
        success: true,
        message,
        data: {
          duration: result.duration,
          summary: result.summary,
          corrections: {
            duplicates: result.corrections.duplicates ? {
              corrected: result.corrections.duplicates.corrected,
              errors: result.corrections.duplicates.errors,
              freedSpace: result.corrections.duplicates.freedSpace
            } : null,
            orphaned: result.corrections.orphaned ? {
              cleaned: result.corrections.orphaned.cleaned,
              errors: result.corrections.orphaned.errors
            } : null,
            references: result.corrections.references ? {
              corrected: result.corrections.references.corrected,
              skipped: result.corrections.references.skipped,
              errors: result.corrections.references.errors
            } : null
          }
        }
      };
    } catch (error) {
      logger.backend.error('Error running comprehensive correction:', error);
      return {
        success: false,
        message: 'Erro na correção abrangente',
        error: error.message
      };
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} - Storage statistics
   */
  async getStorageStatistics() {
    try {
      logger.backend.info('Getting storage statistics...');
      
      const result = await this.detector.integrityChecker.getStorageStatistics();
      
      if (!result.success) {
        return {
          success: false,
          message: 'Erro ao obter estatísticas de armazenamento',
          error: result.error
        };
      }

      return {
        success: true,
        data: {
          totalFiles: result.statistics.totalFiles,
          totalSize: result.statistics.totalSize,
          averageSize: result.statistics.averageSize,
          totalCategories: result.statistics.totalCategories,
          categoriesWithImages: result.statistics.categoriesWithImages,
          storageEfficiency: result.statistics.storageEfficiency,
          largestFiles: result.fileSizes.slice(0, 5) // Top 5 largest files
        }
      };
    } catch (error) {
      logger.backend.error('Error getting storage statistics:', error);
      return {
        success: false,
        message: 'Erro ao obter estatísticas de armazenamento',
        error: error.message
      };
    }
  }

  /**
   * Validate system integrity
   * @returns {Promise<Object>} - Integrity validation result
   */
  async validateSystemIntegrity() {
    try {
      logger.backend.info('Validating system integrity...');
      
      const integrityReport = await this.detector.integrityChecker.performIntegrityCheck();
      
      return {
        success: true,
        data: {
          isHealthy: integrityReport.summary?.isHealthy || false,
          totalIssues: integrityReport.summary?.totalIssues || 0,
          timestamp: integrityReport.timestamp,
          orphanedImages: integrityReport.orphanedImages?.orphanedFiles?.length || 0,
          missingFiles: integrityReport.missingFiles?.missingFiles?.length || 0,
          invalidNaming: integrityReport.invalidNaming?.invalidNaming?.length || 0
        }
      };
    } catch (error) {
      logger.backend.error('Error validating system integrity:', error);
      return {
        success: false,
        message: 'Erro ao validar integridade do sistema',
        error: error.message
      };
    }
  }
}

export default ImageInconsistencyService;