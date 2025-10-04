/**
 * Centralized exports for admin constants and utilities
 * This file provides a single entry point for all admin-related constants
 */

// Export all translation-related functions and constants
export {
  ADMIN_TRANSLATIONS,
  getAdminTranslation,
  getCategoryTranslation,
  getAllCategoryTranslations,
  getOrderStatusTranslation
} from './adminTranslations';

// Import the function to use it in the re-export
import { getAdminTranslation } from './adminTranslations';

// Re-export for convenience - common translation patterns
export const t = (path, fallback = '', params = {}) => {
  return getAdminTranslation(path, fallback, params);
};