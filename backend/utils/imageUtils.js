/**
 * Image utility functions for backend
 * Provides consistent image URL resolution and validation
 */

/**
 * Resolves image path to full URL
 * @param {string} imagePath - The image path to resolve
 * @param {string} baseUrl - The base URL to prepend
 * @returns {string|null} - Resolved URL or null if invalid
 */
export const resolveImageUrl = (imagePath, baseUrl) => {
  if (!imagePath || typeof imagePath !== 'string') return null;
  
  // Handle absolute URLs
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Handle paths starting with /uploads/
  if (imagePath.startsWith('/uploads/')) {
    return baseUrl + imagePath;
  }
  
  // Handle relative paths - add /uploads/ prefix
  return baseUrl + '/uploads/' + imagePath;
};

/**
 * Gets image URL with fallback support
 * @param {string} imagePath - The image path to resolve
 * @param {string} baseUrl - The base URL to prepend
 * @param {string} fallback - Fallback image path (default: '/placeholder.png')
 * @returns {string} - Resolved URL or fallback URL
 */
export const getImageWithFallback = (imagePath, baseUrl, fallback = '/placeholder.png') => {
  const resolvedUrl = resolveImageUrl(imagePath, baseUrl);
  return resolvedUrl || (baseUrl + fallback);
};

/**
 * Validates if an image path is safe and valid
 * @param {string} imagePath - The image path to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidImagePath = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return false;
  
  // Prevent directory traversal attacks
  if (imagePath.includes('../')) return false;
  
  // Allow absolute URLs
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return true;
  
  // Allow /uploads/ paths
  if (imagePath.startsWith('/uploads/')) return true;
  
  // Allow relative paths (will be prefixed with /uploads/)
  return true;
};

/**
 * Normalizes image path to consistent format
 * @param {string} imagePath - The image path to normalize
 * @returns {string|null} - Normalized path or null if invalid
 */
export const normalizeImagePath = (imagePath) => {
  if (!isValidImagePath(imagePath)) return null;
  
  // Return absolute URLs as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Return /uploads/ paths as-is
  if (imagePath.startsWith('/uploads/')) {
    return imagePath;
  }
  
  // Add /uploads/ prefix to relative paths
  return '/uploads/' + imagePath;
};

/**
 * Extracts filename from image path
 * @param {string} imagePath - The image path
 * @returns {string|null} - Filename or null if invalid
 */
export const getImageFilename = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return null;
  
  const normalizedPath = normalizeImagePath(imagePath);
  if (!normalizedPath) return null;
  
  // Extract filename from path
  const parts = normalizedPath.split('/');
  return parts[parts.length - 1];
};

/**
 * Gets image directory from path
 * @param {string} imagePath - The image path
 * @returns {string|null} - Directory path or null if invalid
 */
export const getImageDirectory = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return null;
  
  const normalizedPath = normalizeImagePath(imagePath);
  if (!normalizedPath) return null;
  
  // Extract directory from path
  const parts = normalizedPath.split('/');
  parts.pop(); // Remove filename
  return parts.join('/');
};

/**
 * Checks if image path is for a category image
 * @param {string} imagePath - The image path
 * @returns {boolean} - True if category image, false otherwise
 */
export const isCategoryImage = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return false;
  return imagePath.includes('/categories/') || imagePath.includes('categories/');
};

/**
 * Checks if image path is for a food image
 * @param {string} imagePath - The image path
 * @returns {boolean} - True if food image, false otherwise
 */
export const isFoodImage = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return false;
  // Food images are typically in root uploads or food subdirectory
  return !isCategoryImage(imagePath);
};

/**
 * Generates a unique filename for uploaded images
 * @param {string} originalName - Original filename
 * @param {string} category - Image category (e.g., 'food', 'categories')
 * @returns {string} - Unique filename
 */
export const generateUniqueFilename = (originalName, category = 'general') => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  const extension = originalName.split('.').pop();
  return `${category}_${timestamp}_${random}.${extension}`;
};

/**
 * Gets the relative path for storing images
 * @param {string} category - Image category
 * @param {string} filename - Image filename
 * @returns {string} - Relative storage path
 */
export const getStoragePath = (category, filename) => {
  if (category === 'categories') {
    return `/uploads/categories/${filename}`;
  }
  return `/uploads/${filename}`;
};

export default {
  resolveImageUrl,
  getImageWithFallback,
  isValidImagePath,
  normalizeImagePath,
  getImageFilename,
  getImageDirectory,
  isCategoryImage,
  isFoodImage,
  generateUniqueFilename,
  getStoragePath
};