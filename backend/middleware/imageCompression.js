import ImageOptimizer from '../utils/imageOptimization.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * Middleware to automatically compress uploaded images
 */
class ImageCompressionMiddleware {
  constructor() {
    this.optimizer = new ImageOptimizer();
    this.enableCompression = process.env.ENABLE_IMAGE_COMPRESSION !== 'false';
    this.compressionQuality = parseInt(process.env.IMAGE_COMPRESSION_QUALITY) || 85;
    this.maxImageSize = parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024; // 5MB
  }

  /**
   * Middleware function to compress uploaded images
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  compressUploadedImages = async (req, res, next) => {
    try {
      // Skip compression if disabled
      if (!this.enableCompression) {
        return next();
      }

      // Check if files were uploaded
      if (!req.file && !req.files) {
        return next();
      }

      const files = req.files || [req.file];
      const compressedFiles = [];

      for (const file of files) {
        if (!file) continue;

        const result = await this.processUploadedFile(file);
        if (result.success) {
          compressedFiles.push(result);
          
          // Update file object with compressed version info
          if (result.outputPath && result.outputPath !== file.path) {
            file.path = result.outputPath;
            file.filename = path.basename(result.outputPath);
            file.size = result.optimizedSize || file.size;
          }
        }
      }

      // Add compression results to request for logging
      req.imageCompressionResults = compressedFiles;

      next();
    } catch (error) {
      logger.system.error('Image compression middleware error:', error);
      // Don't fail the request if compression fails
      next();
    }
  };

  /**
   * Process a single uploaded file
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} - Processing result
   */
  async processUploadedFile(file) {
    try {
      if (!file || !file.path) {
        return {
          success: false,
          error: 'Invalid file object'
        };
      }

      // Check if file is an image
      if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        return {
          success: true,
          message: 'File is not an image, skipping compression',
          skipped: true
        };
      }

      // Check file size
      if (file.size > this.maxImageSize) {
        logger.system.warn(`Image too large for compression: ${file.filename} (${file.size} bytes)`);
        return {
          success: false,
          error: 'Image too large for compression'
        };
      }

      // Optimize the image
      const result = await this.optimizer.optimizeImage(file.path);
      
      if (result.success && !result.skipped) {
        logger.system.info(`Image compressed: ${file.filename} - ${result.compressionRatio} reduction`);
        
        // If optimization created a new file, replace the original
        if (result.outputPath && result.outputPath !== file.path) {
          // Remove original file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          
          // Move optimized file to original location
          if (fs.existsSync(result.outputPath)) {
            fs.renameSync(result.outputPath, file.path);
          }
        }
      }

      return result;
    } catch (error) {
      logger.system.error(`Error processing uploaded file ${file?.filename}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Middleware to log compression results
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  logCompressionResults = (req, res, next) => {
    if (req.imageCompressionResults && req.imageCompressionResults.length > 0) {
      const results = req.imageCompressionResults;
      const totalOriginalSize = results.reduce((sum, r) => sum + (r.originalSize || 0), 0);
      const totalOptimizedSize = results.reduce((sum, r) => sum + (r.optimizedSize || 0), 0);
      const totalSavings = totalOriginalSize - totalOptimizedSize;
      const avgCompressionRatio = totalOriginalSize > 0 
        ? ((totalSavings / totalOriginalSize) * 100).toFixed(2)
        : '0';

      logger.system.info(`Batch compression completed: ${results.length} images, ${totalSavings} bytes saved (${avgCompressionRatio}% average reduction)`);
    }
    
    next();
  };

  /**
   * Get compression statistics
   * @returns {Object} - Compression statistics
   */
  getCompressionStats() {
    return {
      enabled: this.enableCompression,
      quality: this.compressionQuality,
      maxSize: this.maxImageSize,
      optimizer: this.optimizer.getOptimizationStats('uploads')
    };
  }
}

// Create singleton instance
const imageCompressionMiddleware = new ImageCompressionMiddleware();

export default imageCompressionMiddleware;
export { ImageCompressionMiddleware };