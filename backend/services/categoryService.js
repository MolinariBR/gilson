import categoryModel from "../models/categoryModel.js";
import foodModel from "../models/foodModel.js";
import { 
  validateCategoryData, 
  validateCategoryImage, 
  generateSlug, 
  sanitizeCategoryData 
} from "../utils/categoryValidation.js";
import ImageOptimizer from "../utils/imageOptimization.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CategoryService {
  constructor() {
    // In-memory cache for categories
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheTTL = parseInt(process.env.CATEGORY_CACHE_TTL) || 3600000; // 1 hour default
    this.maxCacheSize = parseInt(process.env.CATEGORY_CACHE_MAX_SIZE) || 100;
    
    // Image optimizer
    this.imageOptimizer = new ImageOptimizer();
    
    // Cache keys
    this.CACHE_KEYS = {
      ALL_ACTIVE: 'all_active_categories',
      ALL_CATEGORIES: 'all_categories',
      BY_ID: 'category_by_id_',
      BY_SLUG: 'category_by_slug_'
    };
  }

  /**
   * Check if cache entry is valid
   * @param {string} key - Cache key
   * @returns {boolean} - Whether cache entry is valid
   */
  isCacheValid(key) {
    if (!this.cache.has(key) || !this.cacheTimestamps.has(key)) {
      return false;
    }
    
    const timestamp = this.cacheTimestamps.get(key);
    return (Date.now() - timestamp) < this.cacheTTL;
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {any} - Cached data or null
   */
  getFromCache(key) {
    if (this.isCacheValid(key)) {
      return this.cache.get(key);
    }
    
    // Clean up expired entry
    this.cache.delete(key);
    this.cacheTimestamps.delete(key);
    return null;
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  setCache(key, data) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.cacheTimestamps.delete(oldestKey);
    }
    
    this.cache.set(key, data);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * Clear cache entries related to categories
   * @param {string} specificKey - Optional specific key to clear
   */
  clearCache(specificKey = null) {
    if (specificKey) {
      this.cache.delete(specificKey);
      this.cacheTimestamps.delete(specificKey);
      return;
    }
    
    // Clear all category-related cache entries
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith('category_') || key.includes('categories')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    });
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      ttl: this.cacheTTL,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Get performance statistics
   * @returns {Promise<Object>} - Performance statistics
   */
  async getPerformanceStats() {
    try {
      const cacheStats = this.getCacheStats();
      const imageStats = this.imageOptimizer.getOptimizationStats(this.getCategoryImagePath());
      
      // Get database statistics
      const totalCategories = await categoryModel.countDocuments();
      const activeCategories = await categoryModel.countDocuments({ isActive: true });
      
      return {
        cache: cacheStats,
        images: imageStats,
        database: {
          totalCategories,
          activeCategories,
          inactiveCategories: totalCategories - activeCategories
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting performance stats:', error);
      return {
        cache: this.getCacheStats(),
        images: { error: error.message },
        database: { error: error.message },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Warm up cache with frequently accessed data
   * @returns {Promise<Object>} - Warmup result
   */
  async warmupCache() {
    try {
      console.log('Starting cache warmup...');
      
      // Preload active categories
      await this.getAllCategories(false);
      
      // Preload all categories for admin
      await this.getAllCategories(true);
      
      // Get top categories by usage (if we had usage tracking)
      // For now, just preload first few categories
      const categories = await categoryModel
        .find({ isActive: true })
        .limit(10)
        .select('_id slug')
        .lean();
      
      for (const category of categories) {
        await this.getCategoryById(category._id.toString());
        await this.getCategoryBySlug(category.slug);
      }
      
      console.log(`Cache warmed up with ${this.cache.size} entries`);
      
      return {
        success: true,
        message: 'Cache warmed up successfully',
        entriesLoaded: this.cache.size
      };
    } catch (error) {
      console.error('Error warming up cache:', error);
      return {
        success: false,
        message: 'Cache warmup failed',
        error: error.message
      };
    }
  }

  /**
   * Clean up old optimized images
   * @returns {Promise<Object>} - Cleanup result
   */
  async cleanupOptimizedImages() {
    try {
      const result = await this.imageOptimizer.cleanupOptimizedImages(
        this.getCategoryImagePath()
      );
      return result;
    } catch (error) {
      console.error('Error cleaning up optimized images:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Create a new category
   * @param {Object} categoryData - Category data
   * @param {Object} imageFile - Optional image file
   * @returns {Promise<Object>} - Created category or error
   */
  async createCategory(categoryData, imageFile = null) {
    try {
      // Sanitize input data
      const sanitizedData = sanitizeCategoryData(categoryData);
      
      // Validate category data
      const validation = validateCategoryData(sanitizedData);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Dados inválidos",
          errors: validation.errors
        };
      }

      // Check if category name already exists
      const nameExists = await this.checkCategoryNameExists(sanitizedData.name);
      if (nameExists) {
        return {
          success: false,
          message: "Categoria com este nome já existe",
          errors: { name: "Nome da categoria já está em uso" }
        };
      }

      // Check if slug already exists
      const slugExists = await categoryModel.findOne({ slug: sanitizedData.slug });
      if (slugExists) {
        return {
          success: false,
          message: "Slug da categoria já existe",
          errors: { slug: "Slug já está em uso" }
        };
      }

      // Handle image upload if provided
      if (imageFile) {
        const uploadResult = await this.uploadCategoryImage(imageFile);
        if (!uploadResult.success) {
          return uploadResult;
        }
        sanitizedData.image = uploadResult.path;
      } else {
        // Image is required - return validation error if not provided
        return {
          success: false,
          message: "Imagem da categoria é obrigatória",
          errors: { image: "Imagem da categoria é obrigatória" }
        };
      }

      // Set order if not provided (next available order)
      if (sanitizedData.order === 0) {
        const maxOrder = await categoryModel.findOne({}, {}, { sort: { order: -1 } });
        sanitizedData.order = maxOrder ? maxOrder.order + 1 : 1;
      }

      // Create category
      const category = new categoryModel(sanitizedData);
      const savedCategory = await category.save();

      // Clear cache after creating new category
      this.clearCache();

      return {
        success: true,
        message: "Categoria criada com sucesso",
        data: savedCategory
      };
    } catch (error) {
      console.error("Error creating category:", error);
      return {
        success: false,
        message: "Erro interno do servidor",
        error: error.message
      };
    }
  }

  /**
   * Get all categories
   * @param {boolean} includeInactive - Whether to include inactive categories
   * @returns {Promise<Object>} - Categories list or error
   */
  async getAllCategories(includeInactive = false) {
    try {
      // Check cache first
      const cacheKey = includeInactive ? this.CACHE_KEYS.ALL_CATEGORIES : this.CACHE_KEYS.ALL_ACTIVE;
      const cachedData = this.getFromCache(cacheKey);
      
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          cached: true
        };
      }

      // Query database with optimized projection
      const filter = includeInactive ? {} : { isActive: true };
      const categories = await categoryModel
        .find(filter)
        .select('name originalName slug image isActive order createdAt updatedAt')
        .sort({ order: 1, createdAt: 1 })
        .lean(); // Use lean() for better performance

      // Cache the result
      this.setCache(cacheKey, categories);

      return {
        success: true,
        data: categories
      };
    } catch (error) {
      console.error("Error fetching categories:", error);
      return {
        success: false,
        message: "Erro ao buscar categorias",
        error: error.message
      };
    }
  }

  /**
   * Get category by ID
   * @param {string} id - Category ID
   * @returns {Promise<Object>} - Category or error
   */
  async getCategoryById(id) {
    try {
      if (!id) {
        return {
          success: false,
          message: "ID da categoria é obrigatório"
        };
      }

      // Check cache first
      const cacheKey = this.CACHE_KEYS.BY_ID + id;
      const cachedData = this.getFromCache(cacheKey);
      
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          cached: true
        };
      }

      const category = await categoryModel
        .findById(id)
        .select('name originalName slug image isActive order createdAt updatedAt')
        .lean();
      
      if (!category) {
        return {
          success: false,
          message: "Categoria não encontrada"
        };
      }

      // Cache the result
      this.setCache(cacheKey, category);

      return {
        success: true,
        data: category
      };
    } catch (error) {
      console.error("Error fetching category by ID:", error);
      return {
        success: false,
        message: "Erro ao buscar categoria",
        error: error.message
      };
    }
  }

  /**
   * Get category by slug
   * @param {string} slug - Category slug
   * @returns {Promise<Object>} - Category or error
   */
  async getCategoryBySlug(slug) {
    try {
      if (!slug) {
        return {
          success: false,
          message: "Slug da categoria é obrigatório"
        };
      }

      // Check cache first
      const cacheKey = this.CACHE_KEYS.BY_SLUG + slug;
      const cachedData = this.getFromCache(cacheKey);
      
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          cached: true
        };
      }

      const category = await categoryModel
        .findOne({ slug, isActive: true })
        .select('name originalName slug image isActive order createdAt updatedAt')
        .lean();
      
      if (!category) {
        return {
          success: false,
          message: "Categoria não encontrada"
        };
      }

      // Cache the result
      this.setCache(cacheKey, category);

      return {
        success: true,
        data: category
      };
    } catch (error) {
      console.error("Error fetching category by slug:", error);
      return {
        success: false,
        message: "Erro ao buscar categoria",
        error: error.message
      };
    }
  }

  /**
   * Update category
   * @param {string} id - Category ID
   * @param {Object} updateData - Data to update
   * @param {Object} imageFile - Optional new image file
   * @returns {Promise<Object>} - Updated category or error
   */
  async updateCategory(id, updateData, imageFile = null) {
    try {
      if (!id) {
        return {
          success: false,
          message: "ID da categoria é obrigatório"
        };
      }

      // Check if category exists
      const existingCategory = await categoryModel.findById(id);
      if (!existingCategory) {
        return {
          success: false,
          message: "Categoria não encontrada"
        };
      }

      // Sanitize update data
      const sanitizedData = sanitizeCategoryData(updateData);
      
      // Validate update data
      const validation = validateCategoryData(sanitizedData, true);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Dados inválidos",
          errors: validation.errors
        };
      }

      // Check if new name already exists (excluding current category)
      if (sanitizedData.name && sanitizedData.name !== existingCategory.name) {
        const nameExists = await this.checkCategoryNameExists(sanitizedData.name, id);
        if (nameExists) {
          return {
            success: false,
            message: "Categoria com este nome já existe",
            errors: { name: "Nome da categoria já está em uso" }
          };
        }
      }

      // Check if new slug already exists (excluding current category)
      if (sanitizedData.slug && sanitizedData.slug !== existingCategory.slug) {
        const slugExists = await categoryModel.findOne({ 
          slug: sanitizedData.slug, 
          _id: { $ne: id } 
        });
        if (slugExists) {
          return {
            success: false,
            message: "Slug da categoria já existe",
            errors: { slug: "Slug já está em uso" }
          };
        }
      }

      // Handle image upload if provided
      if (imageFile) {
        const uploadResult = await this.processImageUpload(imageFile, existingCategory.image);
        if (!uploadResult.success) {
          return uploadResult;
        }
        sanitizedData.image = uploadResult.url;
      }

      // Update category
      const updatedCategory = await categoryModel.findByIdAndUpdate(
        id,
        sanitizedData,
        { new: true, runValidators: true }
      );

      // Clear cache after updating category
      this.clearCache();

      return {
        success: true,
        message: "Categoria atualizada com sucesso",
        data: updatedCategory
      };
    } catch (error) {
      console.error("Error updating category:", error);
      return {
        success: false,
        message: "Erro interno do servidor",
        error: error.message
      };
    }
  }

  /**
   * Delete category
   * @param {string} id - Category ID
   * @returns {Promise<Object>} - Success message or error
   */
  async deleteCategory(id) {
    try {
      if (!id) {
        return {
          success: false,
          message: "ID da categoria é obrigatório"
        };
      }

      // Check if category exists
      const category = await categoryModel.findById(id);
      if (!category) {
        return {
          success: false,
          message: "Categoria não encontrada"
        };
      }

      // Check if category has associated products
      const hasProducts = await this.checkCategoryHasProducts(id);
      if (hasProducts) {
        return {
          success: false,
          message: "Categoria não pode ser removida pois possui produtos associados",
          code: "CATEGORY_HAS_PRODUCTS"
        };
      }

      // Delete category image if it exists
      if (category.image) {
        await this.deleteCategoryImage(category.image);
      }

      // Delete category
      await categoryModel.findByIdAndDelete(id);

      // Clear cache after deleting category
      this.clearCache();

      return {
        success: true,
        message: "Categoria removida com sucesso"
      };
    } catch (error) {
      console.error("Error deleting category:", error);
      return {
        success: false,
        message: "Erro interno do servidor",
        error: error.message
      };
    }
  }

  /**
   * Check if category name already exists
   * @param {string} name - Category name
   * @param {string} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - Whether name exists
   */
  async checkCategoryNameExists(name, excludeId = null) {
    try {
      const query = { name: { $regex: new RegExp(`^${name}$`, 'i') } };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      
      const existingCategory = await categoryModel.findOne(query);
      return !!existingCategory;
    } catch (error) {
      console.error("Error checking category name:", error);
      return false;
    }
  }

  /**
   * Check if category has associated products
   * @param {string} categoryId - Category ID
   * @returns {Promise<boolean>} - Whether category has products
   */
  async checkCategoryHasProducts(categoryId) {
    try {
      // Get category to check both ID and name references
      const category = await categoryModel.findById(categoryId);
      if (!category) {
        return false;
      }

      // Check for products that reference this category by name or ID
      const productCount = await foodModel.countDocuments({
        $or: [
          { category: category.name },
          { category: category.originalName },
          { category: categoryId }
        ]
      });

      return productCount > 0;
    } catch (error) {
      console.error("Error checking category products:", error);
      return false;
    }
  }

  /**
   * Upload category image with validation
   * @param {Object} imageFile - The uploaded image file
   * @returns {Promise<Object>} - Upload result with filename or error
   */
  async uploadCategoryImage(imageFile) {
    try {
      // Validate image file
      const validation = validateCategoryImage(imageFile);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Imagem inválida",
          errors: validation.errors
        };
      }

      // Use original filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const originalName = path.parse(imageFile.originalname).name;
      const fileExtension = path.extname(imageFile.originalname);
      const filename = `${originalName}_${timestamp}${fileExtension}`;
      
      // Create categories upload directory if it doesn't exist
      const uploadDir = this.getCategoryImagePath();
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Move file to categories directory
      const filePath = path.join(uploadDir, filename);
      
      // Use copyFileSync and unlinkSync instead of renameSync to handle cross-device moves
      fs.copyFileSync(imageFile.path, filePath);
      fs.unlinkSync(imageFile.path);

      // Optimize image if needed
      const optimizationResult = await this.imageOptimizer.optimizeImage(filePath);
      let finalFilename = filename;
      let optimizationInfo = null;

      if (optimizationResult.success && !optimizationResult.skipped) {
        // If optimization created a new file, use that instead
        if (optimizationResult.outputPath !== filePath) {
          finalFilename = path.basename(optimizationResult.outputPath);
          // Remove original unoptimized file
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        optimizationInfo = {
          originalSize: optimizationResult.originalSize,
          optimizedSize: optimizationResult.optimizedSize,
          compressionRatio: optimizationResult.compressionRatio
        };
      }

      return {
        success: true,
        message: "Imagem enviada com sucesso",
        filename: finalFilename,
        path: `/uploads/categories/${finalFilename}`,
        optimization: optimizationInfo
      };
    } catch (error) {
      console.error("Error uploading category image:", error);
      return {
        success: false,
        message: "Erro ao fazer upload da imagem",
        error: error.message
      };
    }
  }

  /**
   * Delete category image from filesystem
   * @param {string} imageName - Name of the image file to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteCategoryImage(imageName) {
    try {
      if (!imageName) {
        return {
          success: true,
          message: "Nenhuma imagem para deletar"
        };
      }

      const imagePath = path.join(this.getCategoryImagePath(), imageName);
      
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        return {
          success: true,
          message: "Imagem deletada com sucesso"
        };
      } else {
        return {
          success: true,
          message: "Imagem não encontrada, nada para deletar"
        };
      }
    } catch (error) {
      console.error("Error deleting category image:", error);
      return {
        success: false,
        message: "Erro ao deletar imagem",
        error: error.message
      };
    }
  }

  /**
   * Get the full path for category images directory
   * @returns {string} - Full path to category images directory
   */
  getCategoryImagePath() {
    return path.join(__dirname, "..", "uploads", "categories");
  }

  /**
   * Generate category image URL
   * @param {string} imageName - Name of the image file
   * @returns {string} - Full URL path for the image
   */
  generateCategoryImageUrl(imageName) {
    if (!imageName) {
      return null;
    }
    return `/uploads/categories/${imageName}`;
  }

  /**
   * Validate and process image file for category
   * @param {Object} imageFile - The uploaded image file
   * @param {string} oldImageName - Name of old image to replace (optional)
   * @returns {Promise<Object>} - Processing result
   */
  async processImageUpload(imageFile, oldImageName = null) {
    try {
      // Upload new image
      const uploadResult = await this.uploadCategoryImage(imageFile);
      if (!uploadResult.success) {
        return uploadResult;
      }

      // Delete old image if provided
      if (oldImageName) {
        await this.deleteCategoryImage(oldImageName);
      }

      return {
        success: true,
        message: "Imagem processada com sucesso",
        filename: uploadResult.filename,
        url: uploadResult.path
      };
    } catch (error) {
      console.error("Error processing image upload:", error);
      return {
        success: false,
        message: "Erro ao processar upload da imagem",
        error: error.message
      };
    }
  }

  /**
   * Get category image info
   * @param {string} imageName - Name of the image file
   * @returns {Object} - Image information
   */
  getCategoryImageInfo(imageName) {
    if (!imageName) {
      return {
        exists: false,
        path: null,
        url: null,
        size: null
      };
    }

    const imagePath = path.join(this.getCategoryImagePath(), imageName);
    const exists = fs.existsSync(imagePath);
    
    let size = null;
    if (exists) {
      try {
        const stats = fs.statSync(imagePath);
        size = stats.size;
      } catch (error) {
        console.error("Error getting image stats:", error);
      }
    }

    return {
      exists,
      path: exists ? imagePath : null,
      url: exists ? this.generateCategoryImageUrl(imageName) : null,
      size
    };
  }

  /**
   * Validate category data
   * @param {Object} data - Category data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} - Validation result
   */
  async validateCategoryData(data, isUpdate = false) {
    return validateCategoryData(data, isUpdate);
  }

  /**
   * Comprehensive business logic validation for category operations
   * @param {Object} categoryData - Category data to validate
   * @param {string} operation - Operation type: 'create', 'update', 'delete'
   * @param {string} categoryId - Category ID (for update/delete operations)
   * @returns {Promise<Object>} - Validation result with business logic checks
   */
  async validateCategoryBusinessLogic(categoryData, operation = 'create', categoryId = null) {
    const errors = {};
    let isValid = true;

    try {
      // Basic data validation first (skip for delete operations)
      if (operation !== 'delete') {
        const dataValidation = await this.validateCategoryData(categoryData, operation === 'update');
        if (!dataValidation.isValid) {
          return dataValidation;
        }
      }

      // Business logic validations based on operation
      switch (operation) {
        case 'create':
          // Check for duplicate name
          if (categoryData.name) {
            const nameExists = await this.checkCategoryNameExists(categoryData.name);
            if (nameExists) {
              errors.name = 'Nome da categoria já existe no sistema';
              isValid = false;
            }
          }

          // Check for duplicate slug
          if (categoryData.slug) {
            const slugExists = await categoryModel.findOne({ slug: categoryData.slug });
            if (slugExists) {
              errors.slug = 'Slug da categoria já existe no sistema';
              isValid = false;
            }
          }
          break;

        case 'update':
          if (!categoryId) {
            errors.id = 'ID da categoria é obrigatório para atualização';
            isValid = false;
            break;
          }

          // Check if category exists
          const existingCategory = await categoryModel.findById(categoryId);
          if (!existingCategory) {
            errors.id = 'Categoria não encontrada';
            isValid = false;
            break;
          }

          // Check for duplicate name (excluding current category)
          if (categoryData.name && categoryData.name !== existingCategory.name) {
            const nameExists = await this.checkCategoryNameExists(categoryData.name, categoryId);
            if (nameExists) {
              errors.name = 'Nome da categoria já existe no sistema';
              isValid = false;
            }
          }

          // Check for duplicate slug (excluding current category)
          if (categoryData.slug && categoryData.slug !== existingCategory.slug) {
            const slugExists = await categoryModel.findOne({ 
              slug: categoryData.slug, 
              _id: { $ne: categoryId } 
            });
            if (slugExists) {
              errors.slug = 'Slug da categoria já existe no sistema';
              isValid = false;
            }
          }
          break;

        case 'delete':
          if (!categoryId) {
            errors.id = 'ID da categoria é obrigatório para exclusão';
            isValid = false;
            break;
          }

          // Check if category exists
          const categoryToDelete = await categoryModel.findById(categoryId);
          if (!categoryToDelete) {
            errors.id = 'Categoria não encontrada';
            isValid = false;
            break;
          }

          // Check if category has associated products
          const hasProducts = await this.checkCategoryHasProducts(categoryId);
          if (hasProducts) {
            errors.products = 'Categoria não pode ser removida pois possui produtos associados';
            isValid = false;
          }
          break;

        default:
          errors.operation = 'Operação inválida';
          isValid = false;
      }

      return {
        isValid,
        errors: isValid ? {} : errors,
        message: isValid ? 'Validação aprovada' : 'Falha na validação de regras de negócio'
      };

    } catch (error) {
      console.error('Error in business logic validation:', error);
      return {
        isValid: false,
        errors: { system: 'Erro interno na validação' },
        message: 'Erro interno do sistema',
        error: error.message
      };
    }
  }

  /**
   * Validate category order constraints
   * @param {number} order - Order value to validate
   * @param {string} excludeId - Category ID to exclude from check
   * @returns {Promise<Object>} - Validation result
   */
  async validateCategoryOrder(order, excludeId = null) {
    try {
      if (typeof order !== 'number' || order < 0) {
        return {
          isValid: false,
          errors: { order: 'Ordem deve ser um número maior ou igual a zero' }
        };
      }

      // Check if order is already taken
      const query = { order };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const existingCategory = await categoryModel.findOne(query);
      if (existingCategory) {
        return {
          isValid: false,
          errors: { order: 'Esta posição de ordem já está ocupada por outra categoria' }
        };
      }

      return {
        isValid: true,
        errors: {}
      };
    } catch (error) {
      console.error('Error validating category order:', error);
      return {
        isValid: false,
        errors: { system: 'Erro interno na validação da ordem' }
      };
    }
  }

  /**
   * Validate category slug uniqueness and format
   * @param {string} slug - Slug to validate
   * @param {string} excludeId - Category ID to exclude from check
   * @returns {Promise<Object>} - Validation result
   */
  async validateCategorySlug(slug, excludeId = null) {
    try {
      // Format validation
      if (!slug || typeof slug !== 'string') {
        return {
          isValid: false,
          errors: { slug: 'Slug é obrigatório' }
        };
      }

      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(slug)) {
        return {
          isValid: false,
          errors: { slug: 'Slug deve conter apenas letras minúsculas, números e hífens' }
        };
      }

      // Uniqueness validation
      const query = { slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const existingCategory = await categoryModel.findOne(query);
      if (existingCategory) {
        return {
          isValid: false,
          errors: { slug: 'Este slug já está em uso por outra categoria' }
        };
      }

      return {
        isValid: true,
        errors: {}
      };
    } catch (error) {
      console.error('Error validating category slug:', error);
      return {
        isValid: false,
        errors: { system: 'Erro interno na validação do slug' }
      };
    }
  }
}

export default CategoryService;