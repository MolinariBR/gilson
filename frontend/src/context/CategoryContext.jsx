import React, { createContext, useContext, useEffect, useState } from 'react';
import { categoryAPI } from '../services/categoryAPI';
import { TRANSLATIONS } from '../constants/translations';
import { toast } from 'react-toastify';

// Create the context
const CategoryContext = createContext(null);

/**
 * CategoryContext Provider Component
 * Manages category state and provides category-related functionality
 */
export const CategoryContextProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useFallback, setUseFallback] = useState(false);

  /**
   * Fetch categories from API
   */
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await categoryAPI.getActiveCategories();
      
      // Transform API data to match expected format
      const transformedCategories = data.map(category => ({
        _id: category._id,
        menu_name: category.name,
        original_name: category.originalName || category.name,
        menu_image: categoryAPI.getCategoryImageURL(category.image),
        slug: category.slug,
        isActive: category.isActive,
        order: category.order
      }));

      // Sort by order
      transformedCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setCategories(transformedCategories);
      setUseFallback(false);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError(err.message);
      
      // Não usar categorias padrão - deixar vazio para que o admin crie
      setCategories([]);
      setUseFallback(true);
      
      // Show error toast but don't block functionality
      toast.error(TRANSLATIONS.messages.errorFetchingCategories || 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get category by slug
   * @param {string} slug - Category slug
   * @returns {Object|null} Category object or null if not found
   */
  const getCategoryBySlug = (slug) => {
    return categories.find(category => 
      category.slug === slug || 
      category.original_name === slug
    ) || null;
  };

  /**
   * Get category by original name (for backward compatibility)
   * @param {string} originalName - Original category name
   * @returns {Object|null} Category object or null if not found
   */
  const getCategoryByOriginalName = (originalName) => {
    return categories.find(category => 
      category.original_name === originalName
    ) || null;
  };

  /**
   * Retry fetching categories
   */
  const retryFetch = () => {
    fetchCategories();
  };

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const contextValue = {
    categories,
    loading,
    error,
    useFallback,
    fetchCategories,
    getCategoryBySlug,
    getCategoryByOriginalName,
    retryFetch
  };

  return (
    <CategoryContext.Provider value={contextValue}>
      {children}
    </CategoryContext.Provider>
  );
};

/**
 * Custom hook to use CategoryContext
 * @returns {Object} Category context value
 */
export const useCategories = () => {
  const context = useContext(CategoryContext);
  
  if (!context) {
    throw new Error('useCategories must be used within a CategoryContextProvider');
  }
  
  return context;
};

export default CategoryContext;