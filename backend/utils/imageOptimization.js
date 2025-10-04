import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Image optimization utilities for category images
 */
class ImageOptimizer {
  constructor() {
    this.maxWidth = parseInt(process.env.CATEGORY_IMAGE_MAX_WIDTH) || 400;
    this.maxHeight = parseInt(process.env.CATEGORY_IMAGE_MAX_HEIGHT) || 400;
    this.quality = parseInt(process.env.CATEGORY_IMAGE_QUALITY) || 85;
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'webp'];
  }

  /**
   * Get image file size
   * @param {string} imagePath - Path to image file
   * @returns {number} - File size in bytes
   */
  getImageSize(imagePath) {
    try {
      if (!fs.existsSync(imagePath)) {
        return 0;
      }
      const stats = fs.statSync(imagePath);
      return stats.size;
    } catch (error) {
      console.error('Error getting image size:', error);
      return 0;
    }
  }

  /**
   * Get image dimensions (requires sharp or similar library)
   * For now, returns estimated dimensions based on file size
   * @param {string} imagePath - Path to image file
   * @returns {Object} - Image dimensions
   */
  getImageDimensions(imagePath) {
    try {
      const size = this.getImageSize(imagePath);
      // Rough estimation - actual implementation would use sharp
      const estimatedPixels = size / 3; // Assuming 3 bytes per pixel
      const estimatedWidth = Math.sqrt(estimatedPixels);
      
      return {
        width: Math.round(estimatedWidth),
        height: Math.round(estimatedWidth),
        size: size
      };
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      return { width: 0, height: 0, size: 0 };
    }
  }

  /**
   * Check if image needs optimization
   * @param {string} imagePath - Path to image file
   * @returns {boolean} - Whether image needs optimization
   */
  needsOptimization(imagePath) {
    try {
      const dimensions = this.getImageDimensions(imagePath);
      const maxSizeBytes = 500 * 1024; // 500KB
      
      return (
        dimensions.width > this.maxWidth ||
        dimensions.height > this.maxHeight ||
        dimensions.size > maxSizeBytes
      );
    } catch (error) {
      console.error('Error checking if image needs optimization:', error);
      return false;
    }
  }

  /**
   * Generate optimized filename
   * @param {string} originalFilename - Original filename
   * @param {string} suffix - Optional suffix (e.g., '_optimized')
   * @returns {string} - Optimized filename
   */
  generateOptimizedFilename(originalFilename, suffix = '_opt') {
    const ext = path.extname(originalFilename);
    const name = path.basename(originalFilename, ext);
    return `${name}${suffix}${ext}`;
  }

  /**
   * Get image format from file extension
   * @param {string} filename - Filename
   * @returns {string} - Image format
   */
  getImageFormat(filename) {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    return this.supportedFormats.includes(ext) ? ext : 'jpeg';
  }

  /**
   * Validate image file for optimization
   * @param {string} imagePath - Path to image file
   * @returns {Object} - Validation result
   */
  validateImageForOptimization(imagePath) {
    try {
      if (!fs.existsSync(imagePath)) {
        return {
          isValid: false,
          error: 'Image file does not exist'
        };
      }

      const format = this.getImageFormat(imagePath);
      if (!this.supportedFormats.includes(format)) {
        return {
          isValid: false,
          error: `Unsupported image format: ${format}`
        };
      }

      const size = this.getImageSize(imagePath);
      const maxSize = 10 * 1024 * 1024; // 10MB max for processing
      
      if (size > maxSize) {
        return {
          isValid: false,
          error: 'Image file too large for optimization'
        };
      }

      return {
        isValid: true,
        format,
        size,
        needsOptimization: this.needsOptimization(imagePath)
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Create WebP version of image (placeholder - requires sharp)
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output WebP path
   * @returns {Promise<Object>} - Conversion result
   */
  async createWebPVersion(inputPath, outputPath) {
    try {
      // This is a placeholder implementation
      // In a real implementation, you would use sharp:
      // await sharp(inputPath)
      //   .webp({ quality: this.quality })
      //   .toFile(outputPath);
      
      // For now, just copy the file
      fs.copyFileSync(inputPath, outputPath);
      
      return {
        success: true,
        message: 'WebP version created (placeholder)',
        outputPath,
        originalSize: this.getImageSize(inputPath),
        optimizedSize: this.getImageSize(outputPath)
      };
    } catch (error) {
      console.error('Error creating WebP version:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Optimize image (placeholder - requires sharp)
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output optimized image path
   * @returns {Promise<Object>} - Optimization result
   */
  async optimizeImage(inputPath, outputPath = null) {
    try {
      const validation = this.validateImageForOptimization(inputPath);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      if (!validation.needsOptimization) {
        return {
          success: true,
          message: 'Image already optimized',
          skipped: true,
          originalSize: validation.size
        };
      }

      const finalOutputPath = outputPath || this.generateOptimizedFilename(inputPath);
      
      // This is a placeholder implementation
      // In a real implementation, you would use sharp:
      // await sharp(inputPath)
      //   .resize(this.maxWidth, this.maxHeight, { 
      //     fit: 'inside',
      //     withoutEnlargement: true 
      //   })
      //   .jpeg({ quality: this.quality })
      //   .toFile(finalOutputPath);
      
      // For now, just copy the file
      fs.copyFileSync(inputPath, finalOutputPath);
      
      const originalSize = this.getImageSize(inputPath);
      const optimizedSize = this.getImageSize(finalOutputPath);
      const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);

      return {
        success: true,
        message: 'Image optimized successfully (placeholder)',
        inputPath,
        outputPath: finalOutputPath,
        originalSize,
        optimizedSize,
        compressionRatio: `${compressionRatio}%`,
        format: validation.format
      };
    } catch (error) {
      console.error('Error optimizing image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up old optimized images
   * @param {string} directory - Directory to clean
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Promise<Object>} - Cleanup result
   */
  async cleanupOptimizedImages(directory, maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    try {
      if (!fs.existsSync(directory)) {
        return {
          success: true,
          message: 'Directory does not exist',
          cleaned: 0
        };
      }

      const files = fs.readdirSync(directory);
      let cleanedCount = 0;
      const now = Date.now();

      for (const file of files) {
        if (file.includes('_opt') || file.includes('_optimized')) {
          const filePath = path.join(directory, file);
          const stats = fs.statSync(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            cleanedCount++;
          }
        }
      }

      return {
        success: true,
        message: `Cleaned up ${cleanedCount} old optimized images`,
        cleaned: cleanedCount
      };
    } catch (error) {
      console.error('Error cleaning up optimized images:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get optimization statistics for a directory
   * @param {string} directory - Directory to analyze
   * @returns {Object} - Optimization statistics
   */
  getOptimizationStats(directory) {
    try {
      if (!fs.existsSync(directory)) {
        return {
          totalImages: 0,
          optimizedImages: 0,
          totalSize: 0,
          optimizedSize: 0,
          compressionRatio: '0%'
        };
      }

      const files = fs.readdirSync(directory);
      let totalImages = 0;
      let optimizedImages = 0;
      let totalSize = 0;
      let optimizedSize = 0;

      for (const file of files) {
        const filePath = path.join(directory, file);
        const size = this.getImageSize(filePath);
        
        if (this.supportedFormats.some(format => file.toLowerCase().endsWith(format))) {
          totalImages++;
          totalSize += size;
          
          if (file.includes('_opt') || file.includes('_optimized')) {
            optimizedImages++;
            optimizedSize += size;
          }
        }
      }

      const compressionRatio = totalSize > 0 
        ? ((totalSize - optimizedSize) / totalSize * 100).toFixed(2)
        : '0';

      return {
        totalImages,
        optimizedImages,
        totalSize,
        optimizedSize,
        compressionRatio: `${compressionRatio}%`,
        averageSize: totalImages > 0 ? Math.round(totalSize / totalImages) : 0
      };
    } catch (error) {
      console.error('Error getting optimization stats:', error);
      return {
        totalImages: 0,
        optimizedImages: 0,
        totalSize: 0,
        optimizedSize: 0,
        compressionRatio: '0%',
        error: error.message
      };
    }
  }
}

export default ImageOptimizer;