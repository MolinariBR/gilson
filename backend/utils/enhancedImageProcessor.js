import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateCategoryImage, validateImageDimensions } from './categoryValidation.js';
import { logger, imageLogger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced image processor with validation, rollback, and integrity checks
 */
class EnhancedImageProcessor {
  constructor() {
    this.tempFiles = new Set(); // Track temporary files for cleanup
    this.backupFiles = new Map(); // Track backup files for rollback
  }

  /**
   * Process image upload with comprehensive validation and rollback support
   * @param {Object} imageFile - The uploaded image file
   * @param {string} categoryId - Category ID for unique naming
   * @param {string} oldImagePath - Path to old image (for rollback)
   * @returns {Promise<Object>} - Processing result
   */
  async processImageUpload(imageFile, categoryId, oldImagePath = null) {
    const rollbackActions = [];
    const startTime = Date.now();
    const filename = imageFile?.originalname || 'unknown';
    
    try {
      logger.image.upload.start(filename, imageFile?.size || 0, imageFile?.mimetype || 'unknown', categoryId);

      // Step 1: Validate image file
      const fileValidation = validateCategoryImage(imageFile);
      if (!fileValidation.isValid) {
        logger.image.upload.validation.failed(filename, 'Validação do arquivo falhou', categoryId);
        return {
          success: false,
          message: 'Validação do arquivo falhou',
          errors: fileValidation.errors,
          code: 'FILE_VALIDATION_FAILED'
        };
      }

      logger.image.upload.validation.passed(filename, ['file-type', 'file-size'], categoryId);

      // Step 2: Validate image dimensions and integrity (if middleware data available)
      if (imageFile.imageValidation) {
        const dimensionValidation = validateImageDimensions(imageFile.imageValidation);
        if (!dimensionValidation.isValid) {
          logger.image.upload.validation.failed(filename, 'Validação das dimensões falhou', categoryId);
          return {
            success: false,
            message: 'Validação das dimensões falhou',
            errors: dimensionValidation.errors,
            code: 'DIMENSION_VALIDATION_FAILED'
          };
        }
        logger.image.upload.validation.passed(filename, ['dimensions'], categoryId);
      }

      // Step 3: Generate unique filename
      const uniqueFilename = this.generateUniqueImageName(categoryId, imageFile.originalname);
      const targetPath = path.join(this.getCategoryImagePath(), uniqueFilename);

      logger.backend.info(`Processing image ${filename} -> ${uniqueFilename} for category ${categoryId}`);

      // Step 4: Create backup of old image if exists
      if (oldImagePath) {
        logger.image.file.moved(oldImagePath, 'backup before replacement');
        const backupResult = await this.createImageBackup(oldImagePath);
        if (backupResult.success) {
          rollbackActions.push(() => this.restoreImageBackup(backupResult.backupPath, oldImagePath));
        }
      }

      // Step 5: Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        rollbackActions.push(() => {
          try {
            if (fs.readdirSync(targetDir).length === 0) {
              fs.rmdirSync(targetDir);
            }
          } catch (error) {
            logger.system.warn('Could not remove directory during rollback:', error);
          }
        });
      }

      // Step 6: Move/copy image file to target location
      const moveResult = await this.moveImageFile(imageFile.path, targetPath);
      if (!moveResult.success) {
        logger.image.upload.error(filename, new Error(moveResult.error), categoryId);
        await this.executeRollback(rollbackActions);
        return {
          success: false,
          message: 'Falha ao mover arquivo de imagem',
          error: moveResult.error,
          code: 'FILE_MOVE_FAILED'
        };
      }

      rollbackActions.push(() => this.deleteImageFile(targetPath));
      logger.image.file.moved(imageFile.path, targetPath);

      // Step 7: Verify image integrity after move
      const integrityResult = await this.verifyImageIntegrity(targetPath);
      if (!integrityResult.success) {
        logger.image.file.corrupted(targetPath, new Error(integrityResult.error));
        await this.executeRollback(rollbackActions);
        return {
          success: false,
          message: 'Verificação de integridade falhou',
          error: integrityResult.error,
          code: 'INTEGRITY_CHECK_FAILED'
        };
      }

      logger.image.upload.validation.passed(filename, ['integrity'], categoryId);

      // Step 8: Optimize image if needed
      const optimizationResult = await this.optimizeImage(targetPath);
      if (!optimizationResult.success) {
        // Optimization failure is not critical, log warning but continue
        logger.system.warn('Image optimization failed:', optimizationResult.error);
      } else if (optimizationResult.optimizedSize) {
        logger.backend.info(`Image optimized: ${optimizationResult.originalSize} -> ${optimizationResult.optimizedSize} bytes (${optimizationResult.compressionRatio})`);
      }

      // Step 9: Clean up old image if everything succeeded
      if (oldImagePath) {
        await this.deleteOldImage(oldImagePath);
        logger.image.file.deleted(oldImagePath, 'replaced by new image');
      }

      // Step 10: Clean up temporary files
      this.cleanupTempFiles();

      const finalSize = fs.statSync(targetPath).size;
      const duration = Date.now() - startTime;

      // Log successful processing
      logger.image.upload.success(filename, `/uploads/categories/${uniqueFilename}`, duration, categoryId);
      logger.image.file.created(targetPath, finalSize);

      // Check for slow processing
      logger.image.performance.slowUpload(filename, duration);

      // Record performance metrics
      imageLogger.performanceCollector.record('enhanced_image_processing', duration);

      return {
        success: true,
        message: 'Imagem processada com sucesso',
        filename: uniqueFilename,
        path: `/uploads/categories/${uniqueFilename}`,
        url: `/uploads/categories/${uniqueFilename}`,
        size: finalSize,
        optimization: optimizationResult.success ? optimizationResult : null
      };

    } catch (error) {
      // Execute rollback on any error
      await this.executeRollback(rollbackActions);
      
      const duration = Date.now() - startTime;
      logger.image.upload.error(filename, error, categoryId);
      
      // Record failed operation metrics
      imageLogger.performanceCollector.record('enhanced_image_processing_failed', duration);

      return {
        success: false,
        message: 'Erro interno no processamento da imagem',
        error: error.message,
        code: 'INTERNAL_PROCESSING_ERROR'
      };
    }
  }

  /**
   * Generate unique image name for category
   * @param {string} categoryId - Category ID
   * @param {string} originalFilename - Original filename
   * @returns {string} - Unique filename
   */
  generateUniqueImageName(categoryId, originalFilename) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const fileExtension = path.extname(originalFilename);
    return `cat_${categoryId}_${timestamp}_${random}${fileExtension}`;
  }

  /**
   * Get category images directory path
   * @returns {string} - Directory path
   */
  getCategoryImagePath() {
    return path.join(__dirname, '..', 'uploads', 'categories');
  }

  /**
   * Create backup of existing image
   * @param {string} imagePath - Path to image to backup
   * @returns {Promise<Object>} - Backup result
   */
  async createImageBackup(imagePath) {
    try {
      if (!imagePath || !fs.existsSync(imagePath)) {
        return { success: true, message: 'No image to backup' };
      }

      const backupDir = path.join(this.getCategoryImagePath(), '.backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = Date.now();
      const backupFilename = `backup_${timestamp}_${path.basename(imagePath)}`;
      const backupPath = path.join(backupDir, backupFilename);

      fs.copyFileSync(imagePath, backupPath);
      this.backupFiles.set(imagePath, backupPath);

      return {
        success: true,
        backupPath,
        message: 'Backup created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restore image from backup
   * @param {string} backupPath - Path to backup file
   * @param {string} originalPath - Original file path to restore to
   * @returns {Promise<Object>} - Restore result
   */
  async restoreImageBackup(backupPath, originalPath) {
    try {
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Backup file not found' };
      }

      fs.copyFileSync(backupPath, originalPath);
      fs.unlinkSync(backupPath); // Clean up backup after restore

      return {
        success: true,
        message: 'Image restored from backup'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Move image file from temporary location to target
   * @param {string} sourcePath - Source file path
   * @param {string} targetPath - Target file path
   * @returns {Promise<Object>} - Move result
   */
  async moveImageFile(sourcePath, targetPath) {
    try {
      if (!fs.existsSync(sourcePath)) {
        return {
          success: false,
          error: 'Source file does not exist'
        };
      }

      // Use copy + unlink instead of rename for cross-device compatibility
      fs.copyFileSync(sourcePath, targetPath);
      fs.unlinkSync(sourcePath);

      return {
        success: true,
        message: 'File moved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify image integrity after processing
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} - Verification result
   */
  async verifyImageIntegrity(imagePath) {
    try {
      if (!fs.existsSync(imagePath)) {
        return {
          success: false,
          error: 'Image file does not exist'
        };
      }

      // Check file size
      const stats = fs.statSync(imagePath);
      if (stats.size === 0) {
        return {
          success: false,
          error: 'Image file is empty'
        };
      }

      // Check file header
      const buffer = fs.readFileSync(imagePath, { start: 0, end: 10 });
      if (!this.validateImageHeader(buffer)) {
        return {
          success: false,
          error: 'Invalid image file header'
        };
      }

      // Try to use sharp for deeper validation if available
      try {
        const { default: sharp } = await import('sharp');
        const metadata = await sharp(imagePath).metadata();
        
        if (!metadata.width || !metadata.height) {
          return {
            success: false,
            error: 'Image has no valid dimensions'
          };
        }

        // Test processing capability
        await sharp(imagePath).resize(50, 50).jpeg().toBuffer();

        return {
          success: true,
          metadata,
          message: 'Image integrity verified'
        };
      } catch (sharpError) {
        // Sharp not available or image processing failed
        console.warn('Sharp validation failed, using basic validation:', sharpError.message);
        
        return {
          success: true,
          message: 'Basic integrity check passed',
          warning: 'Advanced validation not available'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate image file header
   * @param {Buffer} buffer - File header buffer
   * @returns {boolean} - True if valid image header
   */
  validateImageHeader(buffer) {
    if (!buffer || buffer.length < 4) return false;
    
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return true;
    }
    
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return true;
    }
    
    // WebP: 52 49 46 46 (RIFF)
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      return true;
    }
    
    return false;
  }

  /**
   * Optimize image if needed
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} - Optimization result
   */
  async optimizeImage(imagePath) {
    try {
      const { default: sharp } = await import('sharp');
      
      const metadata = await sharp(imagePath).metadata();
      const originalSize = fs.statSync(imagePath).size;
      
      // Check if optimization is needed
      const needsOptimization = 
        metadata.width > 800 || 
        metadata.height > 800 || 
        originalSize > 500 * 1024; // 500KB
      
      if (!needsOptimization) {
        return {
          success: true,
          message: 'Image already optimized',
          skipped: true
        };
      }

      // Create optimized version
      const optimizedBuffer = await sharp(imagePath)
        .resize(800, 800, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85,
          progressive: true 
        })
        .toBuffer();

      // Only replace if optimization actually reduced size
      if (optimizedBuffer.length < originalSize) {
        fs.writeFileSync(imagePath, optimizedBuffer);
        
        return {
          success: true,
          message: 'Image optimized successfully',
          originalSize,
          optimizedSize: optimizedBuffer.length,
          compressionRatio: ((originalSize - optimizedBuffer.length) / originalSize * 100).toFixed(2) + '%'
        };
      } else {
        return {
          success: true,
          message: 'Optimization did not reduce file size',
          skipped: true
        };
      }
    } catch (error) {
      // Optimization failure is not critical
      return {
        success: false,
        error: error.message,
        message: 'Image optimization failed but upload continues'
      };
    }
  }

  /**
   * Delete old image file
   * @param {string} imagePath - Path to image to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteOldImage(imagePath) {
    try {
      if (!imagePath) {
        return { success: true, message: 'No old image to delete' };
      }

      // Extract filename if full path provided
      const filename = imagePath.startsWith('/uploads/') 
        ? path.basename(imagePath) 
        : imagePath;
      
      const fullPath = path.join(this.getCategoryImagePath(), filename);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return {
          success: true,
          message: 'Old image deleted successfully'
        };
      } else {
        return {
          success: true,
          message: 'Old image file not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete image file
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteImageFile(imagePath) {
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute rollback actions
   * @param {Array} rollbackActions - Array of rollback functions
   * @returns {Promise<void>}
   */
  async executeRollback(rollbackActions) {
    for (const action of rollbackActions.reverse()) {
      try {
        await action();
      } catch (error) {
        console.error('Rollback action failed:', error);
      }
    }
  }

  /**
   * Clean up temporary files
   */
  cleanupTempFiles() {
    for (const tempFile of this.tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (error) {
        console.warn('Failed to cleanup temp file:', tempFile, error.message);
      }
    }
    this.tempFiles.clear();
  }

  /**
   * Validate category image association
   * @param {string} categoryId - Category ID
   * @param {string} imagePath - Image path or filename
   * @returns {boolean} - True if association is valid
   */
  validateCategoryImageAssociation(categoryId, imagePath) {
    if (!categoryId || !imagePath) {
      return false;
    }
    
    const filename = path.basename(imagePath);
    const expectedPrefix = `cat_${categoryId}_`;
    return filename.startsWith(expectedPrefix);
  }

  /**
   * Clean up old backup files
   * @param {number} maxAge - Maximum age in milliseconds (default: 24 hours)
   * @returns {Promise<Object>} - Cleanup result
   */
  async cleanupOldBackups(maxAge = 24 * 60 * 60 * 1000) {
    try {
      const backupDir = path.join(this.getCategoryImagePath(), '.backups');
      
      if (!fs.existsSync(backupDir)) {
        return { success: true, cleaned: 0 };
      }

      const files = fs.readdirSync(backupDir);
      let cleanedCount = 0;
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }

      return {
        success: true,
        cleaned: cleanedCount,
        message: `Cleaned up ${cleanedCount} old backup files`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default EnhancedImageProcessor;