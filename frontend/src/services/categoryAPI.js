import axios from 'axios';

/**
 * Category API service for frontend
 * Handles all API calls related to categories
 */
class CategoryAPI {
  constructor() {
    this.baseURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  /**
   * Fetch all active categories for frontend display
   * @returns {Promise<Array>} Array of active categories
   */
  async getActiveCategories() {
    try {
      const response = await this.apiClient.get('/categories');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch categories');
    } catch (error) {
      console.error('Error fetching active categories:', error);
      throw error;
    }
  }

  /**
   * Fetch a specific category by slug
   * @param {string} slug - Category slug
   * @returns {Promise<Object>} Category object
   */
  async getCategoryBySlug(slug) {
    try {
      const response = await this.apiClient.get(`/categories/${slug}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Category not found');
    } catch (error) {
      console.error(`Error fetching category ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Get category image URL
   * @param {string} imagePath - Image path from category data
   * @returns {string} Full image URL
   */
  getCategoryImageURL(imagePath) {
    if (!imagePath) return '';
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Construct full URL
    return `${this.baseURL}${imagePath}`;
  }
}

// Export singleton instance
export const categoryAPI = new CategoryAPI();
export default categoryAPI;