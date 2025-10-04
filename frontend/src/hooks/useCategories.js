import { useContext } from 'react';
import CategoryContext from '../context/CategoryContext';

/**
 * Custom hook to use CategoryContext
 * Provides easy access to category state and functions
 * 
 * @returns {Object} Category context value with the following properties:
 * - categories: Array of category objects
 * - loading: Boolean indicating if categories are being fetched
 * - error: String error message if fetch failed
 * - useFallback: Boolean indicating if using static fallback categories
 * - fetchCategories: Function to refetch categories
 * - getCategoryBySlug: Function to get category by slug
 * - getCategoryByOriginalName: Function to get category by original name
 * - retryFetch: Function to retry fetching categories
 */
export const useCategories = () => {
  const context = useContext(CategoryContext);
  
  if (!context) {
    throw new Error('useCategories must be used within a CategoryContextProvider');
  }
  
  return context;
};

export default useCategories;