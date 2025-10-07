import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// Maximum image dimensions (optional - can be adjusted based on needs)
const MAX_WIDTH = 2048;
const MAX_HEIGHT = 2048;

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
 * Validates image dimensions using sharp (if available) or basic validation
 * @param {string} filePath - Path to the uploaded file
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
const validateImageDimensions = async (filePath) => {
  try {
    // Try to use sharp for image dimension validation
    const { default: sharp } = await import('sharp');
    const metadata = await sharp(filePath).metadata();
    
    return metadata.width <= MAX_WIDTH && metadata.height <= MAX_HEIGHT;
  } catch (error) {
    // If sharp is not available, skip dimension validation
    console.warn('Sharp not available for image dimension validation:', error.message);
    return true; // Allow the image if we can't validate dimensions
  }
};

/**
 * Multer file filter for basic validation
 */
const fileFilter = (req, file, cb) => {
  // Validate file type
  if (!validateFileType(file)) {
    const error = new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }
  
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
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + extension);
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
      try {
        // If no file uploaded, continue (let route handler decide if required)
        if (!req.file) {
          return next();
        }
        
        // Validate file size (double-check after multer)
        if (!validateFileSize(req.file)) {
          // Remove uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(400).json({
            success: false,
            message: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
          });
        }
        
        // Validate image dimensions
        const dimensionsValid = await validateImageDimensions(req.file.path);
        if (!dimensionsValid) {
          // Remove uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(400).json({
            success: false,
            message: `Image dimensions too large. Maximum allowed dimensions are ${MAX_WIDTH}x${MAX_HEIGHT}px`
          });
        }
        
        // Add validation metadata to request
        req.imageValidation = {
          isValid: true,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
          savedPath: req.file.path,
          savedFilename: req.file.filename
        };
        
        next();
      } catch (error) {
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        console.error('Image validation error:', error);
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
  ALLOWED_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_WIDTH,
  MAX_HEIGHT
};