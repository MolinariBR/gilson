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
      timeout: 30000, // Aumentado para 30 segundos
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    // Log da configuração
    console.log('🔧 CategoryAPI configurado:', {
      baseURL: this.baseURL,
      timeout: 30000,
      userAgent: navigator.userAgent
    });
  }

  /**
   * Fetch all active categories for frontend display
   * @returns {Promise<Array>} Array of active categories
   */
  async getActiveCategories(retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    try {
      console.log(`🔄 Tentando buscar categorias (tentativa ${retryCount + 1}/${maxRetries + 1})`);
      console.log(`🌐 URL da API: ${this.baseURL}/api/categories`);
      
      const response = await this.apiClient.get('/api/categories');
      
      console.log('✅ Resposta recebida:', response.status, response.statusText);
      
      if (response.data.success) {
        console.log(`✅ Categorias carregadas com sucesso: ${response.data.data.length} categorias`);
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch categories');
    } catch (error) {
      console.error(`❌ Erro ao buscar categorias (tentativa ${retryCount + 1}):`, error);
      
      // Log detalhado do erro
      if (error.response) {
        console.error('📊 Status da resposta:', error.response.status);
        console.error('📊 Headers da resposta:', error.response.headers);
        console.error('📊 Dados da resposta:', error.response.data);
      } else if (error.request) {
        console.error('📡 Requisição feita mas sem resposta:', error.request);
      } else {
        console.error('⚙️ Erro na configuração da requisição:', error.message);
      }
      
      // Retry logic
      if (retryCount < maxRetries && (
        error.code === 'NETWORK_ERROR' || 
        error.code === 'ECONNABORTED' ||
        error.message.includes('timeout') ||
        error.message.includes('Network Error') ||
        (error.response && error.response.status >= 500)
      )) {
        console.log(`🔄 Tentando novamente em ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.getActiveCategories(retryCount + 1);
      }
      
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
      const response = await this.apiClient.get(`/api/categories/${slug}`);
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