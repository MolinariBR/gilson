import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

/**
 * Secure file upload configuration for category images
 */
class FileUploadSecurity {
  constructor() {
    this.allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png'
    ];
    
    this.allowedExtensions = ['.jpg', '.jpeg', '.png'];
    this.maxFileSize = 2 * 1024 * 1024; // 2MB
    this.uploadDir = 'uploads/categories';
    
    // Ensure upload directory exists
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists and has proper permissions
   */
  ensureUploadDirectory() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true, mode: 0o755 });
    }
  }

  /**
   * Generate secure filename to prevent path traversal and conflicts
   */
  generateSecureFilename(originalname) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalname).toLowerCase();
    
    // Validate extension
    if (!this.allowedExtensions.includes(extension)) {
      throw new Error('Extensão de arquivo não permitida');
    }
    
    return `category_${timestamp}_${randomBytes}${extension}`;
  }

  /**
   * Validate file type using multiple methods for security
   */
  validateFileType(file) {
    const errors = [];

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push('Tipo de arquivo não permitido. Use apenas PNG, JPG ou JPEG');
    }

    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(extension)) {
      errors.push('Extensão de arquivo não permitida');
    }

    // Additional security: Check file signature (magic numbers)
    if (file.buffer) {
      const isValidImage = this.validateImageSignature(file.buffer);
      if (!isValidImage) {
        errors.push('Arquivo não é uma imagem válida');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate image file signature (magic numbers) for additional security
   */
  validateImageSignature(buffer) {
    if (!buffer || buffer.length < 3) {
      return false;
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    
    // JPEG signature: FF D8 FF
    const jpegSignature = [0xFF, 0xD8, 0xFF];

    // Check PNG (requires 8 bytes)
    if (buffer.length >= pngSignature.length) {
      let isPng = true;
      for (let i = 0; i < pngSignature.length; i++) {
        if (buffer[i] !== pngSignature[i]) {
          isPng = false;
          break;
        }
      }
      if (isPng) return true;
    }

    // Check JPEG (requires 3 bytes)
    if (buffer.length >= jpegSignature.length) {
      let isJpeg = true;
      for (let i = 0; i < jpegSignature.length; i++) {
        if (buffer[i] !== jpegSignature[i]) {
          isJpeg = false;
          break;
        }
      }
      if (isJpeg) return true;
    }

    return false;
  }

  /**
   * Create multer storage configuration with security measures
   */
  createSecureStorage() {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        this.ensureUploadDirectory();
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        try {
          const secureFilename = this.generateSecureFilename(file.originalname);
          cb(null, secureFilename);
        } catch (error) {
          cb(error, null);
        }
      }
    });
  }

  /**
   * Create file filter with comprehensive validation
   */
  createFileFilter() {
    return (req, file, cb) => {
      const validation = this.validateFileType(file);
      
      if (validation.isValid) {
        cb(null, true);
      } else {
        const error = new Error(validation.errors.join('; '));
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
      }
    };
  }

  /**
   * Create secure multer configuration
   */
  createSecureUpload() {
    return multer({
      storage: this.createSecureStorage(),
      limits: {
        fileSize: this.maxFileSize,
        files: 1, // Only allow single file upload
        fields: 10, // Limit number of form fields
        fieldNameSize: 100, // Limit field name size
        fieldSize: 1024 * 1024 // Limit field value size to 1MB
      },
      fileFilter: this.createFileFilter()
    });
  }
}

// Create singleton instance
const fileUploadSecurity = new FileUploadSecurity();

/**
 * Middleware for secure category image upload
 */
const secureImageUpload = fileUploadSecurity.createSecureUpload().single('image');

/**
 * Enhanced error handling middleware for file uploads
 */
const handleUploadErrors = (error, req, res, next) => {
  console.log('=== UPLOAD ERROR HANDLER ===');
  console.log('Error:', error);
  console.log('req.body after upload:', req.body);
  console.log('req.file after upload:', req.file);

  if (error instanceof multer.MulterError) {
    console.log('Multer error detected:', error.code);
    let message = 'Erro no upload do arquivo';
    let code = 'UPLOAD_ERROR';

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Arquivo muito grande. Tamanho máximo permitido: 2MB';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Muitos arquivos. Envie apenas um arquivo por vez';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Campo de arquivo inesperado. Use o campo "image"';
        code = 'UNEXPECTED_FIELD';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Muitos campos no formulário';
        code = 'TOO_MANY_FIELDS';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Nome do campo muito longo';
        code = 'FIELD_NAME_TOO_LONG';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Valor do campo muito longo';
        code = 'FIELD_VALUE_TOO_LONG';
        break;
    }

    return res.status(400).json({
      success: false,
      message,
      code,
      error: error.message
    });
  }

  if (error && error.code === 'INVALID_FILE_TYPE') {
    console.log('Invalid file type error');
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }

  if (error) {
    console.error('General upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no upload do arquivo',
      code: 'INTERNAL_UPLOAD_ERROR'
    });
  }

  console.log('No upload error, continuing...');
  next();
};

/**
 * Middleware to validate uploaded file after multer processing
 */
const validateUploadedFile = (req, res, next) => {
  // If no file was uploaded and it's required, handle it
  if (!req.file && req.method === 'POST' && req.path.includes('/upload')) {
    return res.status(400).json({
      success: false,
      message: 'Nenhum arquivo foi enviado',
      code: 'NO_FILE_UPLOADED'
    });
  }

  // If file was uploaded, perform additional validation
  if (req.file) {
    try {
      // Verify file exists on disk
      if (!fs.existsSync(req.file.path)) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao salvar arquivo no servidor',
          code: 'FILE_SAVE_ERROR'
        });
      }

      // Additional file size check (in case multer limits were bypassed)
      const stats = fs.statSync(req.file.path);
      if (stats.size > fileUploadSecurity.maxFileSize) {
        // Remove the uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Arquivo muito grande. Tamanho máximo permitido: 2MB',
          code: 'FILE_TOO_LARGE'
        });
      }

      // Validate file signature by reading the actual file
      const buffer = fs.readFileSync(req.file.path, { flag: 'r' });
      const isValidImage = fileUploadSecurity.validateImageSignature(buffer);
      
      if (!isValidImage) {
        // Remove the uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Arquivo não é uma imagem válida',
          code: 'INVALID_IMAGE_FORMAT'
        });
      }

    } catch (error) {
      console.error('Error validating uploaded file:', error);
      
      // Clean up file if it exists
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up invalid file:', cleanupError);
        }
      }

      return res.status(500).json({
        success: false,
        message: 'Erro ao validar arquivo enviado',
        code: 'FILE_VALIDATION_ERROR'
      });
    }
  }

  next();
};

/**
 * Middleware to clean up uploaded files on request failure
 */
const cleanupOnError = (error, req, res, next) => {
  // Clean up uploaded file if request failed
  if (req.file && req.file.path && fs.existsSync(req.file.path)) {
    try {
      fs.unlinkSync(req.file.path);
      console.log(`Cleaned up uploaded file: ${req.file.path}`);
    } catch (cleanupError) {
      console.error('Error cleaning up file on error:', cleanupError);
    }
  }

  next(error);
};

export { 
  secureImageUpload, 
  handleUploadErrors, 
  validateUploadedFile, 
  cleanupOnError,
  fileUploadSecurity 
};
export default secureImageUpload;