import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger, imageLogger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed image types - more restrictive for categories
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Maximum file size (2MB for better performance)
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

// Image dimension constraints
const MAX_WIDTH = 2000;
const MAX_HEIGHT = 2000;
const MIN_WIDTH = 100;
const MIN_HEIGHT = 100;

/**
 * Validates file type based on MIME type and extension
 * @param {Object} file - Multer file object
 * @returns {boolean} - True if valid, false otherwise
 */
const validateFileType = (file) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  return ALLOWED_TYPES.includes(mimeType) && ALLOWED_EXTENSIONS.includes(fileExtension);
};

/**
 * Validates file size
 * @param {Object} file - Multer file object
 * @returns {boolean} - True if valid, false otherwise
 */
const validateFileSize = (file) => {
  return file.size <= MAX_FILE_SIZE;
};

/**
 * Validates image dimensions and integrity using sharp (if available) or basic validation
 * @param {string} filePath - Path to the uploaded file
 * @returns {Promise<Object>} - Validation result with dimensions and integrity info
 */
const validateImageDimensions = async (filePath) => {
  try {
    // Try to use sharp for comprehensive image validation
    const { default: sharp } = await import('sharp');
    const metadata = await sharp(filePath).metadata();
    
    // Check if image has valid metadata
    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        error: 'Invalid image file - no dimensions found',
        metadata: null
      };
    }
    
    // Validate dimensions
    const dimensionsValid = 
      metadata.width >= MIN_WIDTH && 
      metadata.width <= MAX_WIDTH &&
      metadata.height >= MIN_HEIGHT && 
      metadata.height <= MAX_HEIGHT;
    
    if (!dimensionsValid) {
      return {
        isValid: false,
        error: `Image dimensions must be between ${MIN_WIDTH}x${MIN_HEIGHT} and ${MAX_WIDTH}x${MAX_HEIGHT}px. Current: ${metadata.width}x${metadata.height}px`,
        metadata
      };
    }
    
    // Test image integrity by trying to process it
    try {
      await sharp(filePath).resize(100, 100).jpeg().toBuffer();
    } catch (integrityError) {
      return {
        isValid: false,
        error: 'Image file appears to be corrupted or invalid',
        metadata
      };
    }
    
    return {
      isValid: true,
      metadata,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      }
    };
  } catch (error) {
    // If sharp is not available, perform basic file validation
    console.warn('Sharp not available for image validation, using basic validation:', error.message);
    
    try {
      // Basic file integrity check
      const fs = await import('fs');
      const stats = fs.statSync(filePath);
      
      if (stats.size === 0) {
        return {
          isValid: false,
          error: 'Image file is empty',
          metadata: null
        };
      }
      
      // Basic file header check for common image formats
      const buffer = fs.readFileSync(filePath, { start: 0, end: 10 });
      const isValidImage = validateImageHeader(buffer);
      
      if (!isValidImage) {
        return {
          isValid: false,
          error: 'File does not appear to be a valid image',
          metadata: null
        };
      }
      
      return {
        isValid: true,
        metadata: null,
        dimensions: null,
        warning: 'Dimensions not validated - sharp library not available'
      };
    } catch (basicError) {
      return {
        isValid: false,
        error: 'Unable to validate image file: ' + basicError.message,
        metadata: null
      };
    }
  }
};

/**
 * Validates image file header for basic integrity check
 * @param {Buffer} buffer - First few bytes of the file
 * @returns {boolean} - True if valid image header detected
 */
const validateImageHeader = (buffer) => {
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
};

/**
 * Multer file filter for basic validation
 */
const fileFilter = (req, file, cb) => {
  const filename = file.originalname || 'unknown';
  
  // Log upload attempt
  logger.image.upload.start(filename, 0, file.mimetype, req.user?.id);
  
  // Validate file type
  if (!validateFileType(file)) {
    logger.image.upload.validation.failed(filename, `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`, req.user?.id);
    
    const error = new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }
  
  logger.image.upload.validation.passed(filename, ['file-type'], req.user?.id);
  cb(null, true);
};

/**
 * Middleware for validating uploaded images
 * @param {string} fieldName - Name of the form field containing the image
 * @param {string} uploadPath - Path where images should be stored
 * @returns {Function} - Express middleware function
 */
const createImageValidationMiddleware = (fieldName = 'image', uploadPath = 'uploads') => {
  // Ensure upload directory exists
  const fullUploadPath = path.join(__dirname, '..', uploadPath);
  if (!fs.existsSync(fullUploadPath)) {
    fs.mkdirSync(fullUploadPath, { recursive: true });
  }
  
  // Configure multer storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, fullUploadPath);
    },
    filename: (req, file, cb) => {
      // Salva o arquivo com o nome original enviado pelo frontend
      cb(null, file.originalname);
    }
  });
  
  // Configure multer with validation
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: MAX_FILE_SIZE
    },
    fileFilter: fileFilter
  });
  
  // Return middleware chain
  return [
    upload.single(fieldName),
    async (req, res, next) => {
      const startTime = Date.now();
      
      try {
        // If no file uploaded, continue (let route handler decide if required)
        if (!req.file) {
          return next();
        }
        
        const filename = req.file.originalname;
        const userId = req.user?.id || 'unknown';
        
        // Log validation start
        logger.image.upload.validation.passed(filename, ['multer-upload'], userId);
        
        // Validate file size (double-check after multer)
        if (!validateFileSize(req.file)) {
          logger.image.upload.validation.failed(filename, `File size too large: ${req.file.size} bytes`, userId);
          
          // Remove uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            logger.image.file.deleted(req.file.path, 'validation failure - size');
          }
          
          return res.status(400).json({
            success: false,
            message: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
          });
        }
        
        logger.image.upload.validation.passed(filename, ['file-size'], userId);
        
        // Validate image dimensions and integrity
        const dimensionValidation = await validateImageDimensions(req.file.path);
        if (!dimensionValidation.isValid) {
          logger.image.upload.validation.failed(filename, dimensionValidation.error, userId);
          
          // Remove uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            logger.image.file.deleted(req.file.path, 'validation failure - dimensions');
          }
          
          return res.status(400).json({
            success: false,
            message: dimensionValidation.error,
            code: 'IMAGE_VALIDATION_FAILED'
          });
        }
        
        logger.image.upload.validation.passed(filename, ['dimensions', 'integrity'], userId);
        
        // Log successful validation
        const duration = Date.now() - startTime;
        logger.backend.info(`Image validation completed for ${filename} in ${duration}ms`);
        
        // Record performance metrics
        imageLogger.performanceCollector.record('image_validation', duration);
        
        // Add validation metadata to request
        req.imageValidation = {
          isValid: true,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
          savedPath: req.file.path,
          savedFilename: req.file.filename,
          dimensions: dimensionValidation.dimensions,
          metadata: dimensionValidation.metadata,
          warning: dimensionValidation.warning
        };
        
        next();
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          logger.image.file.deleted(req.file.path, 'validation error cleanup');
        }
        
        logger.image.upload.error(req.file?.originalname || 'unknown', error, req.user?.id);
        
        // Record failed operation metrics
        imageLogger.performanceCollector.record('image_validation_failed', duration);
        
        res.status(500).json({
          success: false,
          message: 'Error validating image file'
        });
      }
    }
  ];
};

/**
 * Error handler for multer errors
 */
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files uploaded'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + error.message
        });
    }
  }
  
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

export {
  createImageValidationMiddleware,
  handleMulterError,
  validateFileType,
  validateFileSize,
  validateImageDimensions,
  validateImageHeader,
  ALLOWED_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_WIDTH,
  MAX_HEIGHT,
  MIN_WIDTH,
  MIN_HEIGHT
};