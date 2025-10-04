import validator from 'validator';

/**
 * Input sanitization and XSS prevention middleware for category data
 */
class InputSanitizer {
  constructor() {
    // HTML entities for encoding
    this.htmlEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
  }

  /**
   * Sanitize string input to prevent XSS attacks
   */
  sanitizeString(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // For category names, we want to be less aggressive
    // Just remove the most dangerous patterns and normalize whitespace
    let sanitized = input;
    
    // Remove script patterns and dangerous content
    sanitized = this.removeScriptPatterns(sanitized);
    
    // Normalize whitespace and trim
    sanitized = this.normalizeWhitespace(sanitized);
    
    return sanitized;
  }

  /**
   * Remove HTML tags and potentially dangerous content
   */
  removeHtmlTags(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove HTML tags but keep content
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * Remove script patterns and dangerous content
   */
  removeScriptPatterns(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove script-like patterns (case insensitive)
    const dangerousPatterns = [
      /javascript:/gi,
      /vbscript:/gi,
      /data:/gi,
      /on\w+\s*=/gi, // Event handlers like onclick=
      /<script/gi,
      /<\/script>/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /<link/gi,
      /<meta/gi,
      /<style/gi,
      /expression\s*\(/gi,
      /url\s*\(/gi,
      /import\s*\(/gi,
      /eval\s*\(/gi,
      /function\s*\(/gi
    ];

    let sanitized = input;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  /**
   * Normalize whitespace and trim input
   */
  normalizeWhitespace(input) {
    if (typeof input !== 'string') {
      return input;
    }

    return input
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim(); // Remove leading/trailing whitespace
  }

  /**
   * Sanitize category name with additional business logic
   */
  sanitizeCategoryName(name) {
    console.log('[DEBUG] sanitizeCategoryName input:', name, typeof name);
    
    if (!name || typeof name !== 'string') {
      console.log('[DEBUG] sanitizeCategoryName returning empty - invalid input');
      return '';
    }

    // First, just trim and normalize whitespace
    let sanitized = name.trim().replace(/\s+/g, ' ');
    console.log('[DEBUG] After basic cleanup:', sanitized);
    
    // Remove only the most dangerous characters, but keep normal punctuation
    sanitized = sanitized
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .substring(0, 100); // Limit length
    
    console.log('[DEBUG] sanitizeCategoryName final result:', sanitized);
    return sanitized;
  }

  /**
   * Sanitize slug with strict rules
   */
  sanitizeSlug(slug) {
    if (!slug || typeof slug !== 'string') {
      return '';
    }

    return slug
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\-]/g, '') // Only allow lowercase letters, numbers, and hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 100); // Limit length
  }

  /**
   * Validate and sanitize image filename/path
   */
  sanitizeImagePath(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') {
      return '';
    }

    // Remove any path traversal attempts
    let sanitized = imagePath.replace(/\.\./g, '').replace(/[\/\\]/g, '');
    
    // Only allow safe characters for filenames
    sanitized = sanitized.replace(/[^a-zA-Z0-9\-_\.]/g, '');
    
    // Ensure it has a valid image extension
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const hasValidExtension = validExtensions.some(ext => 
      sanitized.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      return '';
    }
    
    return sanitized.substring(0, 255); // Limit filename length
  }

  /**
   * Comprehensive category data sanitization
   */
  sanitizeCategoryData(data) {
    console.log('[DEBUG] sanitizeCategoryData input:', data);
    
    if (!data || typeof data !== 'object') {
      return {};
    }

    const sanitized = {};

    // Sanitize name
    if (data.name !== undefined) {
      console.log('[DEBUG] Processing name field:', data.name);
      sanitized.name = this.sanitizeCategoryName(data.name);
      console.log('[DEBUG] Sanitized name result:', sanitized.name);
    }

    // Sanitize originalName
    if (data.originalName !== undefined) {
      sanitized.originalName = this.sanitizeCategoryName(data.originalName);
    }

    // Sanitize slug
    if (data.slug !== undefined) {
      sanitized.slug = this.sanitizeSlug(data.slug);
    }

    // Sanitize image path
    if (data.image !== undefined) {
      sanitized.image = this.sanitizeImagePath(data.image);
    }

    // Handle boolean fields properly for FormData
    if (data.isActive !== undefined) {
      if (typeof data.isActive === 'string') {
        sanitized.isActive = data.isActive === 'true';
      } else {
        sanitized.isActive = Boolean(data.isActive);
      }
    }

    // Handle numeric fields properly for FormData
    if (data.order !== undefined) {
      let order;
      if (typeof data.order === 'string') {
        order = parseInt(data.order, 10);
      } else {
        order = Number(data.order);
      }
      sanitized.order = isNaN(order) ? 0 : Math.max(0, Math.min(order, 9999));
    }

    return sanitized;
  }

  /**
   * Validate input lengths and patterns
   */
  validateInputConstraints(data) {
    const errors = {};

    if (data.name !== undefined && data.name !== null) {
      if (typeof data.name === 'string' && data.name.trim().length === 0) {
        errors.name = 'Nome da categoria não pode estar vazio após sanitização';
      } else if (typeof data.name === 'string' && data.name.length > 100) {
        errors.name = 'Nome da categoria muito longo';
      }
    }

    if (data.originalName !== undefined && data.originalName !== null) {
      if (typeof data.originalName === 'string' && data.originalName.trim().length === 0) {
        errors.originalName = 'Nome original não pode estar vazio após sanitização';
      } else if (typeof data.originalName === 'string' && data.originalName.length > 100) {
        errors.originalName = 'Nome original muito longo';
      }
    }

    if (data.slug !== undefined && data.slug !== null) {
      if (typeof data.slug === 'string' && data.slug.trim().length === 0) {
        errors.slug = 'Slug não pode estar vazio após sanitização';
      } else if (typeof data.slug === 'string' && data.slug.length > 100) {
        errors.slug = 'Slug muito longo';
      } else if (typeof data.slug === 'string' && data.slug.length > 0 && !/^[a-z0-9\-]+$/.test(data.slug)) {
        errors.slug = 'Slug contém caracteres inválidos após sanitização';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Create singleton instance
const inputSanitizer = new InputSanitizer();

/**
 * Middleware to sanitize category input data
 */
const sanitizeCategoryInput = (req, res, next) => {
  try {
    console.log('[DEBUG] sanitizeCategoryInput - Original req.body:', req.body);
    
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      const originalBody = { ...req.body };
      const sanitizedData = inputSanitizer.sanitizeCategoryData(req.body);
      
      console.log('[DEBUG] sanitizeCategoryInput - Sanitized data:', sanitizedData);
      
      // Update request body with sanitized data
      Object.keys(sanitizedData).forEach(key => {
        req.body[key] = sanitizedData[key];
      });

      // Validate constraints only for non-empty fields
      const fieldsToValidate = {};
      Object.keys(sanitizedData).forEach(key => {
        const value = sanitizedData[key];
        if (value !== undefined && value !== null && value !== '') {
          // For strings, check if they have content after trimming
          if (typeof value === 'string') {
            if (value.trim().length > 0) {
              fieldsToValidate[key] = value;
            }
          } else {
            // For non-strings (booleans, numbers), include them
            fieldsToValidate[key] = value;
          }
        }
      });

      if (Object.keys(fieldsToValidate).length > 0) {
        const validation = inputSanitizer.validateInputConstraints(fieldsToValidate);
        if (!validation.isValid) {
          console.log('[DEBUG] Validation failed:', validation.errors);
          return res.status(400).json({
            success: false,
            message: 'Dados inválidos após sanitização',
            errors: validation.errors,
            code: 'SANITIZATION_VALIDATION_ERROR'
          });
        }
      }

      // Log sanitization for security monitoring (only in development)
      if (process.env.NODE_ENV === 'development') {
        const changes = {};
        Object.keys(originalBody).forEach(key => {
          if (originalBody[key] !== req.body[key]) {
            changes[key] = {
              original: originalBody[key],
              sanitized: req.body[key]
            };
          }
        });
        
        if (Object.keys(changes).length > 0) {
          console.log('[SANITIZATION] Input sanitized:', changes);
        }
      }
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = inputSanitizer.sanitizeString(req.query[key]);
        }
      });
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      Object.keys(req.params).forEach(key => {
        if (typeof req.params[key] === 'string') {
          // For IDs, only allow alphanumeric characters
          if (key === 'id') {
            req.params[key] = req.params[key].replace(/[^a-zA-Z0-9]/g, '');
          } else if (key === 'slug') {
            req.params[key] = inputSanitizer.sanitizeSlug(req.params[key]);
          } else {
            req.params[key] = inputSanitizer.sanitizeString(req.params[key]);
          }
        }
      });
    }

    next();
  } catch (error) {
    console.error('Error in input sanitization middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno na sanitização de dados',
      code: 'SANITIZATION_ERROR'
    });
  }
};

/**
 * Middleware to validate and sanitize specific fields
 * This should run AFTER sanitization to check sanitized values
 */
const validateSpecificFields = (requiredFields = []) => {
  return (req, res, next) => {
    console.log('=== VALIDATE SPECIFIC FIELDS ===');
    console.log('Required fields:', requiredFields);
    console.log('Request body:', req.body);
    
    const errors = {};

    // Check required fields after sanitization
    requiredFields.forEach(field => {
      const value = req.body[field];
      console.log(`Checking field ${field}:`, value, typeof value);
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        errors[field] = `${field} é obrigatório`;
      }
    });

    console.log('Validation errors:', errors);

    if (Object.keys(errors).length > 0) {
      console.log('Returning 400 - Required fields missing');
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios não fornecidos',
        errors,
        code: 'REQUIRED_FIELDS_MISSING'
      });
    }

    console.log('Validation passed, continuing...');
    next();
  };
};

/**
 * Security headers middleware
 */
const setSecurityHeaders = (req, res, next) => {
  // Prevent XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Content Security Policy for API responses
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

export { 
  sanitizeCategoryInput, 
  validateSpecificFields, 
  setSecurityHeaders,
  inputSanitizer 
};
export default sanitizeCategoryInput;