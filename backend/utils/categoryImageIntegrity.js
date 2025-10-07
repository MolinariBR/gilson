/**
 * Category Image Integrity Utility
 * 
 * Provides utilities for maintaining integrity between category database records
 * and their associated image files in the filesystem.
 * 
 * Requirements: 4.3, 1.4
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import categoryModel from '../models/categoryModel.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CategoryImageIntegrity {
  constructor() {
    this.categoriesDir = path.join(__dirname, '..', 'uploads', 'categories');
  }

  /**
   * Check if filename follows unique naming pattern
   */
  isUniqueNamingFormat(filename) {
    const uniquePattern = /^cat_[a-f0-9]{24}_\d+_\d+\.[a-zA-Z0-9]+$/;
    return uniquePattern.test(filename);
  }

  /**
   * Extract category ID from unique filename
   */
  extractCategoryIdFromFilename(filename) {
    const match = filename.match(/^cat_([a-f0-9]{24})_\d+_\d+\.[a-zA-Z0-9]+$/);
    return match ? match[1] : null;
  }

  /**
   * Get all image files in categories directory
   */
  getAllImageFiles() {
    try {
      if (!fs.existsSync(this.categoriesDir)) {
        return [];
      }

      return fs.readdirSync(this.categoriesDir).filter(file => {
        const filePath = path.join(this.categoriesDir, file);
        return !file.startsWith('.') && fs.statSync(filePath).isFile();
      });
    } catch (error) {
      logger.image.error('Error reading categories directory:', error);
      return [];
    }
  }

  /**
   * Find orphaned image files (files not referenced by any category)
   */
  async findOrphanedImages() {
    try {
      const allFiles = this.getAllImageFiles();
      const categories = await categoryModel.find({}).lean();
      
      // Create set of referenced filenames
      const referencedFiles = new Set();
      categories.forEach(category => {
        if (category.image) {
          const filename = path.basename(category.image);
          referencedFiles.add(filename);
        }
      });

      // Find orphaned files
      const orphanedFiles = allFiles.filter(filename => !referencedFiles.has(filename));

      return {
        success: true,
        orphanedFiles,
        totalFiles: allFiles.length,
        referencedFiles: referencedFiles.size
      };
    } catch (error) {
      logger.image.error('Error finding orphaned images:', error);
      return {
        success: false,
        error: error.message,
        orphanedFiles: []
      };
    }
  }

  /**
   * Find categories with missing image files
   */
  async findMissingImageFiles() {
    try {
      const categories = await categoryModel.find({}).lean();
      const allFiles = this.getAllImageFiles();
      const filesSet = new Set(allFiles);

      const missingFiles = [];

      for (const category of categories) {
        if (category.image) {
          const filename = path.basename(category.image);
          if (!filesSet.has(filename)) {
            missingFiles.push({
              categoryId: category._id.toString(),
              categoryName: category.name,
              imagePath: category.image,
              filename: filename
            });
          }
        }
      }

      return {
        success: true,
        missingFiles,
        totalCategories: categories.length,
        categoriesWithImages: categories.filter(c => c.image).length
      };
    } catch (error) {
      logger.image.error('Error finding missing image files:', error);
      return {
        success: false,
        error: error.message,
        missingFiles: []
      };
    }
  }

  /**
   * Find categories with invalid image naming
   */
  async findInvalidImageNaming() {
    try {
      const categories = await categoryModel.find({}).lean();
      const invalidNaming = [];

      for (const category of categories) {
        if (category.image) {
          const filename = path.basename(category.image);
          
          // Check if follows unique naming convention
          if (!this.isUniqueNamingFormat(filename)) {
            invalidNaming.push({
              categoryId: category._id.toString(),
              categoryName: category.name,
              imagePath: category.image,
              filename: filename,
              issue: 'non_unique_format'
            });
          } else {
            // Check if category ID in filename matches actual category ID
            const extractedId = this.extractCategoryIdFromFilename(filename);
            if (extractedId !== category._id.toString()) {
              invalidNaming.push({
                categoryId: category._id.toString(),
                categoryName: category.name,
                imagePath: category.image,
                filename: filename,
                extractedId: extractedId,
                issue: 'id_mismatch'
              });
            }
          }
        }
      }

      return {
        success: true,
        invalidNaming,
        totalCategories: categories.length
      };
    } catch (error) {
      logger.image.error('Error finding invalid image naming:', error);
      return {
        success: false,
        error: error.message,
        invalidNaming: []
      };
    }
  }

  /**
   * Perform comprehensive integrity check
   */
  async performIntegrityCheck() {
    try {
      logger.image.info('Starting comprehensive category image integrity check...');

      const [orphanedResult, missingResult, invalidNamingResult] = await Promise.all([
        this.findOrphanedImages(),
        this.findMissingImageFiles(),
        this.findInvalidImageNaming()
      ]);

      const report = {
        timestamp: new Date().toISOString(),
        orphanedImages: orphanedResult,
        missingFiles: missingResult,
        invalidNaming: invalidNamingResult,
        summary: {
          totalIssues: 0,
          isHealthy: true
        }
      };

      // Calculate total issues
      const totalIssues = 
        (orphanedResult.orphanedFiles?.length || 0) +
        (missingResult.missingFiles?.length || 0) +
        (invalidNamingResult.invalidNaming?.length || 0);

      report.summary.totalIssues = totalIssues;
      report.summary.isHealthy = totalIssues === 0;

      // Log summary
      logger.image.info(`Integrity check completed:`);
      logger.image.info(`  Orphaned images: ${orphanedResult.orphanedFiles?.length || 0}`);
      logger.image.info(`  Missing files: ${missingResult.missingFiles?.length || 0}`);
      logger.image.info(`  Invalid naming: ${invalidNamingResult.invalidNaming?.length || 0}`);
      logger.image.info(`  Total issues: ${totalIssues}`);
      logger.image.info(`  System health: ${report.summary.isHealthy ? 'HEALTHY' : 'ISSUES FOUND'}`);

      return report;
    } catch (error) {
      logger.image.error('Error performing integrity check:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clean up orphaned images with backup
   */
  async cleanupOrphanedImages(createBackup = true) {
    try {
      const orphanedResult = await this.findOrphanedImages();
      
      if (!orphanedResult.success) {
        return orphanedResult;
      }

      const { orphanedFiles } = orphanedResult;
      
      if (orphanedFiles.length === 0) {
        return {
          success: true,
          message: 'No orphaned images found',
          cleaned: 0
        };
      }

      const results = {
        success: true,
        cleaned: 0,
        errors: 0,
        backupPath: null,
        cleanedFiles: []
      };

      // Create backup directory if needed
      if (createBackup) {
        const backupDir = path.join(this.categoriesDir, '.backups');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        results.backupPath = backupDir;
      }

      // Clean up each orphaned file
      for (const filename of orphanedFiles) {
        try {
          const filePath = path.join(this.categoriesDir, filename);
          
          // Create backup if requested
          if (createBackup) {
            const backupFilePath = path.join(results.backupPath, `orphan_${Date.now()}_${filename}`);
            fs.copyFileSync(filePath, backupFilePath);
          }

          // Delete original file
          fs.unlinkSync(filePath);
          
          results.cleaned++;
          results.cleanedFiles.push(filename);
          logger.image.info(`Cleaned orphaned image: ${filename}`);
          
        } catch (error) {
          results.errors++;
          logger.image.error(`Error cleaning orphaned image ${filename}:`, error);
        }
      }

      logger.image.info(`Cleanup completed: ${results.cleaned} files cleaned, ${results.errors} errors`);
      
      return results;
    } catch (error) {
      logger.image.error('Error cleaning up orphaned images:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate integrity report for monitoring
   */
  async generateIntegrityReport() {
    try {
      const integrityCheck = await this.performIntegrityCheck();
      
      const report = {
        timestamp: new Date().toISOString(),
        system: 'category-image-integrity',
        version: '1.0.0',
        status: integrityCheck.summary?.isHealthy ? 'healthy' : 'issues_found',
        metrics: {
          totalCategories: 0,
          categoriesWithImages: 0,
          totalImageFiles: 0,
          orphanedImages: integrityCheck.orphanedImages?.orphanedFiles?.length || 0,
          missingFiles: integrityCheck.missingFiles?.missingFiles?.length || 0,
          invalidNaming: integrityCheck.invalidNaming?.invalidNaming?.length || 0,
          totalIssues: integrityCheck.summary?.totalIssues || 0
        },
        details: integrityCheck,
        recommendations: []
      };

      // Add metrics from detailed results
      if (integrityCheck.missingFiles?.success) {
        report.metrics.totalCategories = integrityCheck.missingFiles.totalCategories;
        report.metrics.categoriesWithImages = integrityCheck.missingFiles.categoriesWithImages;
      }

      if (integrityCheck.orphanedImages?.success) {
        report.metrics.totalImageFiles = integrityCheck.orphanedImages.totalFiles;
      }

      // Generate recommendations
      if (report.metrics.orphanedImages > 0) {
        report.recommendations.push({
          type: 'cleanup',
          priority: 'medium',
          message: `${report.metrics.orphanedImages} orphaned image files should be cleaned up`,
          action: 'Run cleanup utility to remove orphaned files'
        });
      }

      if (report.metrics.missingFiles > 0) {
        report.recommendations.push({
          type: 'data_integrity',
          priority: 'high',
          message: `${report.metrics.missingFiles} categories reference missing image files`,
          action: 'Update category records or restore missing image files'
        });
      }

      if (report.metrics.invalidNaming > 0) {
        report.recommendations.push({
          type: 'migration',
          priority: 'medium',
          message: `${report.metrics.invalidNaming} categories have invalid image naming`,
          action: 'Run migration script to update to unique naming convention'
        });
      }

      return report;
    } catch (error) {
      logger.image.error('Error generating integrity report:', error);
      return {
        timestamp: new Date().toISOString(),
        system: 'category-image-integrity',
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Validate category image association
   */
  validateCategoryImageAssociation(categoryId, imagePath) {
    try {
      if (!categoryId || !imagePath) {
        return false;
      }
      
      // Extract filename from path
      const filename = path.basename(imagePath);
      
      // Check if filename follows the pattern cat_[categoryId]_[timestamp]_[random].[ext]
      const expectedPrefix = `cat_${categoryId}_`;
      
      if (!filename.startsWith(expectedPrefix)) {
        return false;
      }
      
      // Validate the complete pattern with regex
      const pattern = new RegExp(`^cat_${categoryId}_\\d+_\\d+\\.[a-zA-Z0-9]+$`);
      return pattern.test(filename);
    } catch (error) {
      logger.image.error('Error validating category image association:', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics() {
    try {
      const allFiles = this.getAllImageFiles();
      let totalSize = 0;
      const fileSizes = [];

      for (const filename of allFiles) {
        try {
          const filePath = path.join(this.categoriesDir, filename);
          const stats = fs.statSync(filePath);
          const size = stats.size;
          totalSize += size;
          fileSizes.push({ filename, size });
        } catch (error) {
          logger.image.error(`Error getting stats for ${filename}:`, error);
        }
      }

      // Sort by size (largest first)
      fileSizes.sort((a, b) => b.size - a.size);

      const categories = await categoryModel.countDocuments();
      const categoriesWithImages = await categoryModel.countDocuments({ image: { $exists: true, $ne: null } });

      return {
        success: true,
        statistics: {
          totalFiles: allFiles.length,
          totalSize: totalSize,
          averageSize: allFiles.length > 0 ? Math.round(totalSize / allFiles.length) : 0,
          largestFile: fileSizes[0] || null,
          smallestFile: fileSizes[fileSizes.length - 1] || null,
          totalCategories: categories,
          categoriesWithImages: categoriesWithImages,
          storageEfficiency: categories > 0 ? Math.round((categoriesWithImages / categories) * 100) : 0
        },
        fileSizes: fileSizes.slice(0, 10) // Top 10 largest files
      };
    } catch (error) {
      logger.image.error('Error getting storage statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default CategoryImageIntegrity;