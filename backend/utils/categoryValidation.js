/**
 * Validates category data for creation or update
 * @param {Object} categoryData - The category data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {Object} - Validation result with isValid and errors
 */
export const validateCategoryData = (categoryData, isUpdate = false) => {
  const errors = {};
  let isValid = true;

  // Name validation - only validate if it's a create operation or name is being updated
  if (!isUpdate || (categoryData.name !== undefined && categoryData.name !== null)) {
    if (!categoryData.name || typeof categoryData.name !== 'string') {
      errors.name = 'Nome da categoria é obrigatório';
      isValid = false;
    } else if (categoryData.name.trim().length === 0) {
      errors.name = 'Nome da categoria não pode estar vazio';
      isValid = false;
    } else if (categoryData.name.length > 100) {
      errors.name = 'Nome da categoria deve ter no máximo 100 caracteres';
      isValid = false;
    }
  }

  // Original name validation (optional - will be auto-generated from name if not provided)
  if (categoryData.originalName !== undefined) {
    if (typeof categoryData.originalName !== 'string') {
      errors.originalName = 'Nome original da categoria deve ser uma string válida';
      isValid = false;
    } else if (categoryData.originalName.trim().length === 0) {
      errors.originalName = 'Nome original da categoria não pode estar vazio';
      isValid = false;
    } else if (categoryData.originalName.length > 100) {
      errors.originalName = 'Nome original da categoria deve ter no máximo 100 caracteres';
      isValid = false;
    }
  }

  // Slug validation (optional - will be auto-generated from name if not provided)
  if (categoryData.slug !== undefined) {
    if (typeof categoryData.slug !== 'string') {
      errors.slug = 'Slug da categoria deve ser uma string válida';
      isValid = false;
    } else if (categoryData.slug.trim().length === 0) {
      errors.slug = 'Slug da categoria não pode estar vazio';
      isValid = false;
    } else if (categoryData.slug.length > 100) {
      errors.slug = 'Slug da categoria deve ter no máximo 100 caracteres';
      isValid = false;
    } else if (!/^[a-z0-9-]+$/.test(categoryData.slug)) {
      errors.slug = 'Slug deve conter apenas letras minúsculas, números e hífens';
      isValid = false;
    }
  }

  // Image validation (optional for creation, only validate if provided)
  if (categoryData.image !== undefined) {
    if (typeof categoryData.image !== 'string') {
      errors.image = 'Imagem deve ser uma string válida';
      isValid = false;
    } else if (categoryData.image.trim().length === 0) {
      errors.image = 'Imagem da categoria não pode estar vazia';
      isValid = false;
    }
  }

  // IsActive validation
  if (categoryData.isActive !== undefined && typeof categoryData.isActive !== 'boolean') {
    errors.isActive = 'Status ativo deve ser verdadeiro ou falso';
    isValid = false;
  }

  // Order validation
  if (categoryData.order !== undefined) {
    if (typeof categoryData.order !== 'number' || categoryData.order < 0) {
      errors.order = 'Ordem deve ser um número maior ou igual a zero';
      isValid = false;
    }
  }

  return { isValid, errors };
};

/**
 * Validates image file for category upload with enhanced checks
 * @param {Object} file - The uploaded file object
 * @returns {Object} - Validation result with isValid and errors
 */
export const validateCategoryImage = (file) => {
  const errors = {};
  let isValid = true;

  if (!file) {
    errors.image = 'Arquivo de imagem é obrigatório';
    isValid = false;
    return { isValid, errors };
  }

  // Enhanced file type validation
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  
  if (!allowedTypes.includes(file.mimetype)) {
    errors.image = 'Formato de imagem inválido. Use PNG, JPG, JPEG ou WEBP';
    isValid = false;
  }

  // Validate file extension matches MIME type
  if (file.originalname) {
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    const expectedExtensions = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/jpg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp']
    };
    
    const validExtensions = expectedExtensions[file.mimetype] || [];
    if (allowedTypes.includes(file.mimetype) && !validExtensions.includes(fileExtension)) {
      errors.image = 'Extensão do arquivo não corresponde ao tipo de imagem';
      isValid = false;
    }
  }

  // Enhanced file size validation (2MB max)
  if (allowedTypes.includes(file.mimetype)) {
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    const minSize = 1024; // 1KB minimum
    
    if (file.size > maxSize) {
      errors.image = 'Imagem deve ter no máximo 2MB';
      isValid = false;
    } else if (file.size < minSize) {
      errors.image = 'Arquivo de imagem muito pequeno (mínimo 1KB)';
      isValid = false;
    }
  }

  // Validate filename for security
  if (file.originalname) {
    const filename = file.originalname;
    
    // Check for dangerous characters
    if (/[<>:"/\\|?*]/.test(filename)) {
      errors.image = 'Nome do arquivo contém caracteres inválidos';
      isValid = false;
    }
    
    // Check filename length
    if (filename.length > 255) {
      errors.image = 'Nome do arquivo muito longo (máximo 255 caracteres)';
      isValid = false;
    }
    
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      errors.image = 'Nome do arquivo inválido';
      isValid = false;
    }
  }

  return { isValid, errors };
};

/**
 * Validates image dimensions and integrity
 * @param {Object} imageValidation - Image validation data from middleware
 * @returns {Object} - Validation result
 */
export const validateImageDimensions = (imageValidation) => {
  const errors = {};
  let isValid = true;

  if (!imageValidation) {
    errors.image = 'Dados de validação da imagem não encontrados';
    return { isValid: false, errors };
  }

  // Check if dimensions are available
  if (imageValidation.dimensions) {
    const { width, height } = imageValidation.dimensions;
    const minWidth = 100;
    const minHeight = 100;
    const maxWidth = 2000;
    const maxHeight = 2000;

    if (width < minWidth || height < minHeight) {
      errors.image = `Dimensões da imagem muito pequenas (mínimo ${minWidth}x${minHeight}px)`;
      isValid = false;
    } else if (width > maxWidth || height > maxHeight) {
      errors.image = `Dimensões da imagem muito grandes (máximo ${maxWidth}x${maxHeight}px)`;
      isValid = false;
    }

    // Check aspect ratio (optional - prevent extremely stretched images)
    const aspectRatio = width / height;
    if (aspectRatio < 0.2 || aspectRatio > 5) {
      errors.image = 'Proporção da imagem inválida (muito esticada)';
      isValid = false;
    }
  }

  return { isValid, errors };
};

/**
 * Generates a URL-friendly slug from a string
 * @param {string} text - The text to convert to slug
 * @returns {string} - The generated slug
 */
export const generateSlug = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Sanitizes category data by trimming strings and setting defaults
 * Enhanced with XSS prevention
 * @param {Object} categoryData - The category data to sanitize
 * @returns {Object} - The sanitized category data
 */
export const sanitizeCategoryData = (categoryData) => {
  const sanitized = { ...categoryData };

  // Enhanced sanitization for string fields - but less aggressive
  if (sanitized.name !== undefined) {
    sanitized.name = sanitized.name ? sanitizeStringField(sanitized.name) : '';
  }
  if (sanitized.originalName !== undefined) {
    sanitized.originalName = sanitized.originalName ? sanitizeStringField(sanitized.originalName) : '';
  }
  if (sanitized.slug !== undefined) {
    sanitized.slug = sanitized.slug ? sanitizeSlugField(sanitized.slug) : '';
  }
  if (sanitized.image !== undefined) {
    sanitized.image = sanitized.image ? sanitizeImagePath(sanitized.image) : '';
  }

  // Handle type conversion for FormData values
  if (sanitized.isActive !== undefined) {
    if (typeof sanitized.isActive === 'string') {
      sanitized.isActive = sanitized.isActive === 'true';
    } else {
      sanitized.isActive = Boolean(sanitized.isActive);
    }
  } else {
    sanitized.isActive = true;
  }

  if (sanitized.order !== undefined) {
    if (typeof sanitized.order === 'string') {
      sanitized.order = parseInt(sanitized.order, 10) || 0;
    } else {
      sanitized.order = Number(sanitized.order) || 0;
    }
  } else {
    sanitized.order = 0;
  }

  // Generate slug if not provided and name exists
  if ((!sanitized.slug || sanitized.slug.trim() === '') && sanitized.name && sanitized.name.trim() !== '') {
    sanitized.slug = generateSlug(sanitized.name);
  }

  // Generate originalName if not provided and name exists
  if ((!sanitized.originalName || sanitized.originalName.trim() === '') && sanitized.name && sanitized.name.trim() !== '') {
    sanitized.originalName = sanitized.name;
  }

  return sanitized;
};

/**
 * Enhanced string field sanitization with XSS prevention
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeStringField = (input) => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>]/g, '') // Only remove angle brackets, keep other characters
    .substring(0, 100);
};

/**
 * Enhanced slug field sanitization
 * @param {string} input - Input slug to sanitize
 * @returns {string} - Sanitized slug
 */
const sanitizeSlugField = (input) => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\-]/g, '') // Only allow lowercase letters, numbers, and hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100);
};

/**
 * Enhanced image path sanitization
 * @param {string} input - Input image path to sanitize
 * @returns {string} - Sanitized image path
 */
const sanitizeImagePath = (input) => {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove path traversal attempts and dangerous characters
  return input
    .trim()
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9\-_\.]/g, '')
    .substring(0, 255);
};