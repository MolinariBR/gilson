/**
 * Food category translations for Portuguese Brazilian (PT-BR)
 * Maps English category names to Portuguese equivalents
 */

export const CATEGORY_TRANSLATIONS = {
  "Salad": "Salada",
  "Rolls": "Rolinhos", 
  "Deserts": "Sobremesas",
  "Sandwich": "Sanduíche",
  "Cake": "Bolo",
  "Pure Veg": "Vegetariano",
  "Pasta": "Massa",
  "Noodles": "Macarrão"
};

/**
 * Reverse mapping for Portuguese to English (useful for API calls)
 */
export const CATEGORY_TRANSLATIONS_REVERSE = Object.fromEntries(
  Object.entries(CATEGORY_TRANSLATIONS).map(([english, portuguese]) => [portuguese, english])
);

/**
 * Helper function to get Portuguese category name
 * @param {string} englishCategory - English category name
 * @returns {string} Portuguese category name or original if not found
 */
export const getCategoryTranslation = (englishCategory) => {
  return CATEGORY_TRANSLATIONS[englishCategory] || englishCategory;
};

/**
 * Helper function to get English category name from Portuguese
 * @param {string} portugueseCategory - Portuguese category name  
 * @returns {string} English category name or original if not found
 */
export const getCategoryEnglish = (portugueseCategory) => {
  return CATEGORY_TRANSLATIONS_REVERSE[portugueseCategory] || portugueseCategory;
};

/**
 * Helper function to get all available categories in Portuguese
 * @returns {Array<string>} Array of Portuguese category names
 */
export const getAllCategoriesInPortuguese = () => {
  return Object.values(CATEGORY_TRANSLATIONS);
};

/**
 * Helper function to get all available categories in English
 * @returns {Array<string>} Array of English category names
 */
export const getAllCategoriesInEnglish = () => {
  return Object.keys(CATEGORY_TRANSLATIONS);
};

/**
 * Helper function to check if a category exists (in either language)
 * @param {string} category - Category name to check
 * @returns {boolean} True if category exists
 */
export const categoryExists = (category) => {
  return CATEGORY_TRANSLATIONS[category] !== undefined || 
         CATEGORY_TRANSLATIONS_REVERSE[category] !== undefined;
};