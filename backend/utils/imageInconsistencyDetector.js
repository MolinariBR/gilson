/**
 * Image Inconsistency Detection and Correction Utility
 * 
 * Provides comprehensive utilities for detecting and correcting image inconsistencies
 * in the category image system, including duplicate detection, orphaned image cleanup,
 * and automatic correction of incorrect references.
 * 
 * Requirements: 4.3, 6.4
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import categoryModel from '../models/categoryModel.js';
import CategoryImageIntegrity from './categoryImageIntegrity.js';
import { logger, imageLogger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ImageInconsistencyDetector {
  constructor() {
    this.categoriesDir = path.join(__dirname, '..', 'uploads', 'categories');
    this.backupDir = path.join(this.categoriesDir, '.backups');
    this.integrityChecker = new CategoryImageIntegrity();
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    try {
      if (!fs.existsSync(this.categoriesDir)) {
        fs.mkdirSync(this.categoriesDir, { recursive: true });
      }
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
    } catch (error) {
      logger.backend.error('Error creating directories:', error);
    }
  }

  /**
   * Calculate file hash for duplicate detection
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - File hash
   */
  async calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Detect duplicate images based on file content
   * @returns {Promise<Object>} - Duplicate detection result
   */
  async detectDuplicateImages() {
    const startTime = Date.now();
    
    try {
      logger.backend.info('Starting duplicate image detection...');
      
      const allFiles = this.integrityChecker.getAllImageFiles();
      const fileHashes = new Map(); // hash -> [filenames]
      const duplicates = [];
      let processedFiles = 0;

      for (const filename of allFiles) {
        try {
          const filePath = path.join(this.categoriesDir, filename);
          const hash = await this.calculateFileHash(filePath);
          
          if (fileHashes.has(hash)) {
            // Found duplicate
            const existingFiles = fileHashes.get(hash);
            
            // Check if this is the first time we're seeing this duplicate
            if (existingFiles.length === 1) {
              duplicates.push({
                hash,
                files: [...existingFiles, filename],
                size: fs.statSync(filePath).size
              });
            } else {
              // Add to existing duplicate group
              const duplicateGroup = duplicates.find(d => d.hash === hash);
              if (duplicateGroup) {
                duplicateGroup.files.push(filename);
              }
            }
            
            fileHashes.get(hash).push(filename);
          } else {
            fileHashes.set(hash, [filename]);
          }
          
          processedFiles++;
        } catch (error) {
          logger.image.file.corrupted(filename, error);
        }
      }

      const duration = Date.now() - startTime;
      
      // Calculate statistics
      const totalDuplicateFiles = duplicates.reduce((sum, group) => sum + group.files.length - 1, 0);
      const wastedSpace = duplicates.reduce((sum, group) => sum + (group.size * (group.files.length - 1)), 0);

      const result = {
        success: true,
        duplicates,
        statistics: {
          totalFiles: allFiles.length,
          processedFiles,
          duplicateGroups: duplicates.length,
          totalDuplicateFiles,
          wastedSpace,
          duration
        }
      };

      logger.backend.info(`Duplicate detection completed: ${duplicates.length} groups, ${totalDuplicateFiles} duplicate files, ${wastedSpace} bytes wasted`);
      
      return result;
    } catch (error) {
      logger.backend.error('Error detecting duplicate images:', error);
      return {
        success: false,
        error: error.message,
        duplicates: []
      };
    }
  }

  /**
   * Detect orphaned images (not referenced by any category)
   * @returns {Promise<Object>} - Orphaned image detection result
   */
  async detectOrphanedImages() {
    try {
      logger.backend.info('Starting orphaned image detection...');
      
      const result = await this.integrityChecker.findOrphanedImages();
      
      if (result.success) {
        logger.backend.info(`Orphaned detection completed: ${result.orphanedFiles.length} orphaned files found`);
      }
      
      return result;
    } catch (error) {
      logger.backend.error('Error detecting orphaned images:', error);
      return {
        success: false,
        error: error.message,
        orphanedFiles: []
      };
    }
  }

  /**
   * Detect categories with incorrect image references
   * @returns {Promise<Object>} - Incorrect reference detection result
   */
  async detectIncorrectReferences() {
    try {
      logger.backend.info('Starting incorrect reference detection...');
      
      const categories = await categoryModel.find({}).lean();
      const incorrectReferences = [];
      const allFiles = this.integrityChecker.getAllImageFiles();
      const filesSet = new Set(allFiles);

      for (const category of categories) {
        if (!category.image) {
          incorrectReferences.push({
            categoryId: category._id.toString(),
            categoryName: category.name,
            issue: 'missing_image_reference',
            description: 'Category has no image reference'
          });
          continue;
        }

        const filename = path.basename(category.image);
        
        // Check if file exists
        if (!filesSet.has(filename)) {
          incorrectReferences.push({
            categoryId: category._id.toString(),
            categoryName: category.name,
            imagePath: category.image,
            filename,
            issue: 'file_not_found',
            description: 'Referenced image file does not exist'
          });
          continue;
        }

        // Check if follows unique naming convention
        if (!this.integrityChecker.isUniqueNamingFormat(filename)) {
          incorrectReferences.push({
            categoryId: category._id.toString(),
            categoryName: category.name,
            imagePath: category.image,
            filename,
            issue: 'non_unique_format',
            description: 'Image filename does not follow unique naming convention'
          });
          continue;
        }

        // Check if category ID in filename matches
        const extractedId = this.integrityChecker.extractCategoryIdFromFilename(filename);
        if (extractedId !== category._id.toString()) {
          incorrectReferences.push({
            categoryId: category._id.toString(),
            categoryName: category.name,
            imagePath: category.image,
            filename,
            extractedId,
            issue: 'id_mismatch',
            description: 'Category ID in filename does not match category ID'
          });
        }
      }

      logger.backend.info(`Incorrect reference detection completed: ${incorrectReferences.length} issues found`);
      
      return {
        success: true,
        incorrectReferences,
        totalCategories: categories.length,
        categoriesWithIssues: incorrectReferences.length
      };
    } catch (error) {
      logger.backend.error('Error detecting incorrect references:', error);
      return {
        success: false,
        error: error.message,
        incorrectReferences: []
      };
    }
  }

  /**
   * Automatically correct duplicate images by keeping the newest and removing others
   * @param {Array} duplicateGroups - Array of duplicate groups from detectDuplicateImages
   * @param {boolean} createBackup - Whether to create backups before deletion
   * @returns {Promise<Object>} - Correction result
   */
  async correctDuplicateImages(duplicateGroups, createBackup = true) {
    try {
      logger.backend.info(`Starting duplicate image correction for ${duplicateGroups.length} groups...`);
      
      const results = {
        success: true,
        corrected: 0,
        errors: 0,
        freedSpace: 0,
        correctedFiles: [],
        errors: []
      };

      for (const group of duplicateGroups) {
        try {
          // Sort files by modification time (newest first)
          const filesWithStats = group.files.map(filename => {
            const filePath = path.join(this.categoriesDir, filename);
            const stats = fs.statSync(filePath);
            return { filename, mtime: stats.mtime, size: stats.size };
          }).sort((a, b) => b.mtime - a.mtime);

          // Keep the newest file, remove others
          const [keepFile, ...removeFiles] = filesWithStats;
          
          logger.backend.info(`Keeping newest file: ${keepFile.filename}, removing ${removeFiles.length} duplicates`);

          for (const fileInfo of removeFiles) {
            try {
              const filePath = path.join(this.categoriesDir, fileInfo.filename);
              
              // Create backup if requested
              if (createBackup) {
                const backupPath = path.join(this.backupDir, `duplicate_${Date.now()}_${fileInfo.filename}`);
                fs.copyFileSync(filePath, backupPath);
              }

              // Remove duplicate file
              fs.unlinkSync(filePath);
              
              results.corrected++;
              results.freedSpace += fileInfo.size;
              results.correctedFiles.push(fileInfo.filename);
              
              logger.image.file.deleted(filePath, 'duplicate removal');
            } catch (error) {
              results.errors++;
              results.errors.push(`Failed to remove ${fileInfo.filename}: ${error.message}`);
              logger.image.serving.error(filePath, error, 'duplicate removal');
            }
          }
        } catch (error) {
          results.errors++;
          results.errors.push(`Failed to process duplicate group ${group.hash}: ${error.message}`);
        }
      }

      logger.backend.info(`Duplicate correction completed: ${results.corrected} files removed, ${results.freedSpace} bytes freed`);
      
      return results;
    } catch (error) {
      logger.backend.error('Error correcting duplicate images:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Automatically correct orphaned images by removing them
   * @param {Array} orphanedFiles - Array of orphaned filenames
   * @param {boolean} createBackup - Whether to create backups before deletion
   * @returns {Promise<Object>} - Correction result
   */
  async correctOrphanedImages(orphanedFiles, createBackup = true) {
    try {
      logger.backend.info(`Starting orphaned image correction for ${orphanedFiles.length} files...`);
      
      return await this.integrityChecker.cleanupOrphanedImages(createBackup);
    } catch (error) {
      logger.backend.error('Error correcting orphaned images:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Attempt to correct incorrect references automatically
   * @param {Array} incorrectReferences - Array of incorrect references
   * @returns {Promise<Object>} - Correction result
   */
  async correctIncorrectReferences(incorrectReferences) {
    try {
      logger.backend.info(`Starting incorrect reference correction for ${incorrectReferences.length} issues...`);
      
      const results = {
        success: true,
        corrected: 0,
        skipped: 0,
        errors: 0,
        corrections: [],
        errors: []
      };

      for (const ref of incorrectReferences) {
        try {
          switch (ref.issue) {
            case 'missing_image_reference':
              // Skip - requires manual intervention to assign image
              results.skipped++;
              results.corrections.push({
                categoryId: ref.categoryId,
                action: 'skipped',
                reason: 'Missing image reference requires manual assignment'
              });
              break;

            case 'file_not_found':
              // Try to find a suitable replacement or mark for manual intervention
              const suitableFile = await this.findSuitableReplacementImage(ref.categoryId);
              if (suitableFile) {
                await categoryModel.findByIdAndUpdate(ref.categoryId, {
                  image: `/uploads/categories/${suitableFile}`
                });
                results.corrected++;
                results.corrections.push({
                  categoryId: ref.categoryId,
                  action: 'replaced',
                  oldImage: ref.imagePath,
                  newImage: `/uploads/categories/${suitableFile}`
                });
                logger.backend.info(`Replaced missing image for category ${ref.categoryId} with ${suitableFile}`);
              } else {
                results.skipped++;
                results.corrections.push({
                  categoryId: ref.categoryId,
                  action: 'skipped',
                  reason: 'No suitable replacement image found'
                });
              }
              break;

            case 'non_unique_format':
              // Try to rename file to follow unique format
              const newFilename = this.generateUniqueFilename(ref.categoryId, ref.filename);
              const oldPath = path.join(this.categoriesDir, ref.filename);
              const newPath = path.join(this.categoriesDir, newFilename);
              
              if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
                fs.renameSync(oldPath, newPath);
                await categoryModel.findByIdAndUpdate(ref.categoryId, {
                  image: `/uploads/categories/${newFilename}`
                });
                results.corrected++;
                results.corrections.push({
                  categoryId: ref.categoryId,
                  action: 'renamed',
                  oldFilename: ref.filename,
                  newFilename: newFilename
                });
                logger.backend.info(`Renamed ${ref.filename} to ${newFilename} for category ${ref.categoryId}`);
              } else {
                results.skipped++;
                results.corrections.push({
                  categoryId: ref.categoryId,
                  action: 'skipped',
                  reason: 'File rename not possible (source missing or target exists)'
                });
              }
              break;

            case 'id_mismatch':
              // Generate new filename with correct category ID
              const correctFilename = this.generateUniqueFilename(ref.categoryId, ref.filename);
              const sourcePath = path.join(this.categoriesDir, ref.filename);
              const targetPath = path.join(this.categoriesDir, correctFilename);
              
              if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
                fs.renameSync(sourcePath, targetPath);
                await categoryModel.findByIdAndUpdate(ref.categoryId, {
                  image: `/uploads/categories/${correctFilename}`
                });
                results.corrected++;
                results.corrections.push({
                  categoryId: ref.categoryId,
                  action: 'id_corrected',
                  oldFilename: ref.filename,
                  newFilename: correctFilename
                });
                logger.backend.info(`Corrected ID mismatch: renamed ${ref.filename} to ${correctFilename}`);
              } else {
                results.skipped++;
                results.corrections.push({
                  categoryId: ref.categoryId,
                  action: 'skipped',
                  reason: 'ID correction not possible (source missing or target exists)'
                });
              }
              break;

            default:
              results.skipped++;
              results.corrections.push({
                categoryId: ref.categoryId,
                action: 'skipped',
                reason: `Unknown issue type: ${ref.issue}`
              });
          }
        } catch (error) {
          results.errors++;
          results.errors.push(`Failed to correct reference for category ${ref.categoryId}: ${error.message}`);
          logger.backend.error(`Error correcting reference for category ${ref.categoryId}:`, error);
        }
      }

      logger.backend.info(`Reference correction completed: ${results.corrected} corrected, ${results.skipped} skipped, ${results.errors} errors`);
      
      return results;
    } catch (error) {
      logger.backend.error('Error correcting incorrect references:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find a suitable replacement image for a category
   * @param {string} categoryId - Category ID
   * @returns {Promise<string|null>} - Suitable filename or null
   */
  async findSuitableReplacementImage(categoryId) {
    try {
      const allFiles = this.integrityChecker.getAllImageFiles();
      
      // Look for files that might belong to this category
      const categoryPrefix = `cat_${categoryId}_`;
      const possibleFiles = allFiles.filter(filename => 
        filename.startsWith(categoryPrefix)
      );
      
      if (possibleFiles.length > 0) {
        // Return the most recent file
        const filesWithStats = possibleFiles.map(filename => {
          const filePath = path.join(this.categoriesDir, filename);
          const stats = fs.statSync(filePath);
          return { filename, mtime: stats.mtime };
        }).sort((a, b) => b.mtime - a.mtime);
        
        return filesWithStats[0].filename;
      }
      
      return null;
    } catch (error) {
      logger.backend.error('Error finding suitable replacement image:', error);
      return null;
    }
  }

  /**
   * Generate unique filename for a category
   * @param {string} categoryId - Category ID
   * @param {string} originalFilename - Original filename
   * @returns {string} - New unique filename
   */
  generateUniqueFilename(categoryId, originalFilename) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const extension = path.extname(originalFilename);
    return `cat_${categoryId}_${timestamp}_${random}${extension}`;
  }

  /**
   * Generate comprehensive health report
   * @returns {Promise<Object>} - Health report
   */
  async generateHealthReport() {
    const startTime = Date.now();
    
    try {
      logger.backend.info('Generating comprehensive image system health report...');
      
      // Run all detection methods
      const [duplicateResult, orphanedResult, incorrectRefResult, storageStats] = await Promise.all([
        this.detectDuplicateImages(),
        this.detectOrphanedImages(),
        this.detectIncorrectReferences(),
        this.integrityChecker.getStorageStatistics()
      ]);

      const duration = Date.now() - startTime;
      
      // Calculate overall health score (0-100)
      const totalIssues = 
        (duplicateResult.statistics?.totalDuplicateFiles || 0) +
        (orphanedResult.orphanedFiles?.length || 0) +
        (incorrectRefResult.incorrectReferences?.length || 0);
      
      const totalFiles = duplicateResult.statistics?.totalFiles || 0;
      const healthScore = totalFiles > 0 ? Math.max(0, 100 - Math.round((totalIssues / totalFiles) * 100)) : 100;
      
      const report = {
        timestamp: new Date().toISOString(),
        system: 'category-image-inconsistency-detector',
        version: '1.0.0',
        duration,
        healthScore,
        status: healthScore >= 90 ? 'excellent' : healthScore >= 70 ? 'good' : healthScore >= 50 ? 'fair' : 'poor',
        
        summary: {
          totalFiles: totalFiles,
          totalIssues: totalIssues,
          duplicateGroups: duplicateResult.duplicates?.length || 0,
          duplicateFiles: duplicateResult.statistics?.totalDuplicateFiles || 0,
          orphanedFiles: orphanedResult.orphanedFiles?.length || 0,
          incorrectReferences: incorrectRefResult.incorrectReferences?.length || 0,
          wastedSpace: duplicateResult.statistics?.wastedSpace || 0
        },
        
        details: {
          duplicates: duplicateResult,
          orphaned: orphanedResult,
          incorrectReferences: incorrectRefResult,
          storage: storageStats
        },
        
        recommendations: []
      };

      // Generate recommendations
      if (report.summary.duplicateFiles > 0) {
        report.recommendations.push({
          type: 'cleanup',
          priority: 'medium',
          title: 'Remove Duplicate Images',
          description: `${report.summary.duplicateFiles} duplicate images found in ${report.summary.duplicateGroups} groups`,
          action: 'Run automatic duplicate correction to free up space',
          estimatedSavings: `${Math.round(report.summary.wastedSpace / 1024)} KB`
        });
      }

      if (report.summary.orphanedFiles > 0) {
        report.recommendations.push({
          type: 'cleanup',
          priority: 'low',
          title: 'Clean Up Orphaned Images',
          description: `${report.summary.orphanedFiles} orphaned image files found`,
          action: 'Run orphaned image cleanup to remove unused files'
        });
      }

      if (report.summary.incorrectReferences > 0) {
        report.recommendations.push({
          type: 'data_integrity',
          priority: 'high',
          title: 'Fix Incorrect References',
          description: `${report.summary.incorrectReferences} categories have incorrect image references`,
          action: 'Run automatic reference correction or manual review'
        });
      }

      if (report.healthScore < 70) {
        report.recommendations.push({
          type: 'maintenance',
          priority: 'high',
          title: 'System Maintenance Required',
          description: `Health score is ${report.healthScore}%, indicating significant issues`,
          action: 'Run comprehensive cleanup and correction procedures'
        });
      }

      logger.backend.info(`Health report generated: Score ${report.healthScore}%, ${totalIssues} total issues found`);
      
      return report;
    } catch (error) {
      logger.backend.error('Error generating health report:', error);
      return {
        timestamp: new Date().toISOString(),
        system: 'category-image-inconsistency-detector',
        status: 'error',
        error: error.message,
        healthScore: 0
      };
    }
  }

  /**
   * Run comprehensive automatic correction
   * @param {Object} options - Correction options
   * @returns {Promise<Object>} - Correction results
   */
  async runComprehensiveCorrection(options = {}) {
    const {
      correctDuplicates = true,
      correctOrphaned = true,
      correctReferences = true,
      createBackups = true
    } = options;

    const startTime = Date.now();
    
    try {
      logger.backend.info('Starting comprehensive automatic correction...');
      
      const results = {
        success: true,
        duration: 0,
        corrections: {
          duplicates: null,
          orphaned: null,
          references: null
        },
        summary: {
          totalCorrected: 0,
          totalErrors: 0,
          freedSpace: 0
        }
      };

      // Detect all issues first
      const [duplicateResult, orphanedResult, incorrectRefResult] = await Promise.all([
        correctDuplicates ? this.detectDuplicateImages() : { duplicates: [] },
        correctOrphaned ? this.detectOrphanedImages() : { orphanedFiles: [] },
        correctReferences ? this.detectIncorrectReferences() : { incorrectReferences: [] }
      ]);

      // Run corrections
      if (correctDuplicates && duplicateResult.duplicates?.length > 0) {
        logger.backend.info('Correcting duplicate images...');
        results.corrections.duplicates = await this.correctDuplicateImages(
          duplicateResult.duplicates, 
          createBackups
        );
        results.summary.totalCorrected += results.corrections.duplicates.corrected || 0;
        results.summary.totalErrors += results.corrections.duplicates.errors || 0;
        results.summary.freedSpace += results.corrections.duplicates.freedSpace || 0;
      }

      if (correctOrphaned && orphanedResult.orphanedFiles?.length > 0) {
        logger.backend.info('Correcting orphaned images...');
        results.corrections.orphaned = await this.correctOrphanedImages(
          orphanedResult.orphanedFiles, 
          createBackups
        );
        results.summary.totalCorrected += results.corrections.orphaned.cleaned || 0;
        results.summary.totalErrors += results.corrections.orphaned.errors || 0;
      }

      if (correctReferences && incorrectRefResult.incorrectReferences?.length > 0) {
        logger.backend.info('Correcting incorrect references...');
        results.corrections.references = await this.correctIncorrectReferences(
          incorrectRefResult.incorrectReferences
        );
        results.summary.totalCorrected += results.corrections.references.corrected || 0;
        results.summary.totalErrors += results.corrections.references.errors || 0;
      }

      results.duration = Date.now() - startTime;
      
      logger.backend.info(`Comprehensive correction completed: ${results.summary.totalCorrected} corrections, ${results.summary.totalErrors} errors, ${results.summary.freedSpace} bytes freed`);
      
      return results;
    } catch (error) {
      logger.backend.error('Error running comprehensive correction:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
}

export default ImageInconsistencyDetector;