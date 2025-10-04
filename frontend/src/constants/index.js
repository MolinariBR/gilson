/**
 * Centralized exports for translation constants
 * This file provides easy access to all translation utilities
 */

// Main translations
export { 
  TRANSLATIONS, 
  getTranslation, 
  getWelcomeMessage 
} from './translations.js';

// Category translations
export {
  CATEGORY_TRANSLATIONS,
  CATEGORY_TRANSLATIONS_REVERSE,
  getCategoryTranslation,
  getCategoryEnglish,
  getAllCategoriesInPortuguese,
  getAllCategoriesInEnglish,
  categoryExists
} from './categories.js';