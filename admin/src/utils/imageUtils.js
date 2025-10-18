/**
 * Image utility functions for resolving and handling image URLs
 */

/**
 * Resolves an image path to a full URL
 * @param {string} imagePath - The image path from the database
 * @param {string} baseUrl - The base URL of the backend server
 * @returns {string|null} - The resolved image URL or null if no path provided
 */
export const resolveImageUrl = (imagePath, baseUrl) => {
  if (!imagePath) return null;
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it already starts with /uploads/, just prepend base URL
  if (imagePath.startsWith('/uploads/')) {
    return baseUrl + imagePath;
  }
  
  // Otherwise, assume it needs /uploads/ prefix
  return baseUrl + '/uploads/' + imagePath;
};

/**
 * Determines if an image is a category image based on its path
 * @param {string} imagePath - The image path to check
 * @returns {boolean} - True if it's a category image
 */
export const isCategoryImage = (imagePath) => {
  if (!imagePath) return false;
  
  // Check if path contains category indicators
  return imagePath.includes('/uploads/') || 
         imagePath.includes('cat_') ||
         imagePath.includes('category_');
};

/**
 * Gets optimized lazy loading settings for category images
 * @param {boolean} isCategory - Whether this is a category image
 * @returns {Object} - Optimized lazy loading configuration
 */
export const getCategoryLazyLoadConfig = (isCategory = false) => {
  if (isCategory) {
    return {
      lazy: true,
      rootMargin: '100px', // Less aggressive for admin interface
      threshold: 0.1,
      priority: 'high'
    };
  }
  
  return {
    lazy: true,
    rootMargin: '50px',
    threshold: 0.2,
    priority: 'normal'
  };
};

/**
 * Generates cache-optimized URL for category images
 * @param {string} imagePath - The original image path
 * @param {string} baseUrl - The base URL
 * @param {string} categoryId - The category ID for cache optimization
 * @returns {string} - Cache-optimized URL
 */
export const getCacheOptimizedImageUrl = (imagePath, baseUrl, categoryId = null) => {
  const resolvedUrl = resolveImageUrl(imagePath, baseUrl);
  if (!resolvedUrl) return null;
  
  // For category images, add cache-busting parameter based on category ID
  if (categoryId && isCategoryImage(imagePath)) {
    const separator = resolvedUrl.includes('?') ? '&' : '?';
    return `${resolvedUrl}${separator}v=${categoryId.slice(-8)}`; // Use last 8 chars of ID as version
  }
  
  return resolvedUrl;
};

/**
 * Gets an image URL with fallback support
 * @param {string} imagePath - The image path from the database
 * @param {string} baseUrl - The base URL of the backend server
 * @param {string} fallback - The fallback image path (default: '/placeholder.png')
 * @returns {string} - The resolved image URL or fallback URL
 */
export const getImageWithFallback = (imagePath, baseUrl, fallback = '/placeholder.png') => {
  const resolvedUrl = resolveImageUrl(imagePath, baseUrl);
  return resolvedUrl || (baseUrl + fallback);
};

/**
 * Validates if an image path is in the correct format
 * @param {string} imagePath - The image path to validate
 * @returns {boolean} - True if the path is valid
 */
export const isValidImagePath = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return false;
  
  // Allow full URLs
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return true;
  }
  
  // Allow paths that start with /uploads/
  if (imagePath.startsWith('/uploads/')) {
    return true;
  }
  
  // Allow relative paths (will be converted to /uploads/ format)
  return imagePath.length > 0 && !imagePath.includes('..');
};

/**
 * Normalizes an image path to the standard /uploads/ format
 * @param {string} imagePath - The image path to normalize
 * @returns {string|null} - The normalized path or null if invalid
 */
export const normalizeImagePath = (imagePath) => {
  if (!isValidImagePath(imagePath)) return null;
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it already starts with /uploads/, return as is
  if (imagePath.startsWith('/uploads/')) {
    return imagePath;
  }
  
  // Add /uploads/ prefix
  return '/uploads/' + imagePath;
};