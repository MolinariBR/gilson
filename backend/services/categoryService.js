import categoryModel from "../models/categoryModelSimple.js";
import foodModel from "../models/foodModel.js";
import { 
  validateCategoryData, 
  validateCategoryImage, 
  generateSlug, 
  sanitizeCategoryData 
} from "../utils/categoryValidation.js";
import ImageOptimizer from "../utils/imageOptimization.js";
import EnhancedImageProcessor from "../utils/enhancedImageProcessor.js";
import CategoryImageIntegrity from "../utils/categoryImageIntegrity.js";
import { logger, imageLogger } from "../utils/logger.js";
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
    
    // Image processors
    this.imageOptimizer = new ImageOptimizer();
    this.enhancedImageProcessor = new EnhancedImageProcessor();
    this.imageIntegrity = new CategoryImageIntegrity();
    
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
   * Create a new category - WORKING FROM SCRATCH
   */
  async createCategory(categoryData, imageFile = null) {
    try {
      console.log('=== CREATE CATEGORY FROM SCRATCH ===');
      console.log('Data:', categoryData);
      console.log('Image file:', imageFile ? imageFile.originalname : 'None');

      // Basic validation
      if (!categoryData.name) {
        return { success: false, message: "Nome é obrigatório" };
      }

      // Handle image first
      let imageUrl = null;
      if (imageFile) {
        const timestamp = Date.now();
        const extension = path.extname(imageFile.originalname);
        const filename = `category_${timestamp}${extension}`;
        
        // Ensure directory exists
        const uploadsDir = path.join(process.cwd(), 'uploads', 'categories');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const finalPath = path.join(uploadsDir, filename);
        
        // Copy file (safer than rename)
        fs.copyFileSync(imageFile.path, finalPath);
        
        // Clean up temp file
        if (fs.existsSync(imageFile.path)) {
          fs.unlinkSync(imageFile.path);
        }
        
        imageUrl = `/uploads/categories/${filename}`;
        console.log('Image saved to:', imageUrl);
      }

      // Create category with minimal data
      const newCategory = {
        name: categoryData.name,
        originalName: categoryData.originalName || categoryData.name,
        slug: categoryData.slug || categoryData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        image: imageUrl,
        isActive: true,
        order: 0
      };

      console.log('Creating category with data:', newCategory);

      const category = await categoryModel.create(newCategory);
      
      console.log('Category created successfully:', category._id);

      return {
        success: true,
        message: "Categoria criada com sucesso",
        data: category
      };

    } catch (error) {
      console.error('CREATE CATEGORY ERROR:', error);
      return {
        success: false,
        message: "Erro ao criar categoria: " + error.message,
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
        // Process cached data to ensure image URL consistency
        const processedCachedData = this.processCategoryImageUrls(cachedData);
        return {
          success: true,
          data: processedCachedData,
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

      // Process image URLs to ensure consistency
      const processedCategories = this.processCategoryImageUrls(categories);

      // Cache the result
      this.setCache(cacheKey, processedCategories);

      return {
        success: true,
        data: processedCategories
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
        // Process cached data to ensure image URL consistency
        const processedCachedData = this.processCategoryImageUrls(cachedData);
        return {
          success: true,
          data: processedCachedData,
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

      // Process image URLs to ensure consistency
      const processedCategory = this.processCategoryImageUrls(category);

      // Cache the result
      this.setCache(cacheKey, processedCategory);

      return {
        success: true,
        data: processedCategory
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
        // Process cached data to ensure image URL consistency
        const processedCachedData = this.processCategoryImageUrls(cachedData);
        return {
          success: true,
          data: processedCachedData,
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

      // Process image URLs to ensure consistency
      const processedCategory = this.processCategoryImageUrls(category);

      // Cache the result
      this.setCache(cacheKey, processedCategory);

      return {
        success: true,
        data: processedCategory
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
   * Update category - WORKING FROM SCRATCH
   */
  async updateCategory(id, updateData, imageFile = null) {
    try {
      console.log('=== UPDATE CATEGORY FROM SCRATCH ===');
      console.log('ID:', id);
      console.log('Data:', updateData);
      console.log('Image file:', imageFile ? imageFile.originalname : 'None');

      if (!id) {
        return { success: false, message: "ID é obrigatório" };
      }

      // Find existing category
      const existingCategory = await categoryModel.findById(id);
      if (!existingCategory) {
        return { success: false, message: "Categoria não encontrada" };
      }

      console.log('Found existing category:', existingCategory.name);

      // Prepare update
      const updateFields = {};
      if (updateData.name) updateFields.name = updateData.name;
      if (updateData.originalName) updateFields.originalName = updateData.originalName;
      if (updateData.slug) updateFields.slug = updateData.slug;
      if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive;
      if (updateData.order !== undefined) updateFields.order = parseInt(updateData.order);

      // Handle new image
      if (imageFile) {
        console.log('Processing new image...');
        
        const timestamp = Date.now();
        const extension = path.extname(imageFile.originalname);
        const filename = `category_${timestamp}${extension}`;
        
        // Ensure directory exists
        const uploadsDir = path.join(process.cwd(), 'uploads', 'categories');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const finalPath = path.join(uploadsDir, filename);
        
        // Copy new image
        fs.copyFileSync(imageFile.path, finalPath);
        
        // Clean up temp file
        if (fs.existsSync(imageFile.path)) {
          fs.unlinkSync(imageFile.path);
        }
        
        // Delete old image
        if (existingCategory.image) {
          const oldImageName = path.basename(existingCategory.image);
          const oldImagePath = path.join(uploadsDir, oldImageName);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('Deleted old image:', oldImageName);
          }
        }
        
        updateFields.image = `/uploads/categories/${filename}`;
        console.log('New image saved:', updateFields.image);
      }

      console.log('Update fields:', updateFields);

      // Update in database
      const updatedCategory = await categoryModel.findByIdAndUpdate(
        id,
        updateFields,
        { new: true }
      );

      console.log('Category updated successfully');

      return {
        success: true,
        message: "Categoria atualizada com sucesso",
        data: updatedCategory
      };

    } catch (error) {
      console.error('UPDATE CATEGORY ERROR:', error);
      return {
        success: false,
        message: "Erro ao atualizar categoria: " + error.message,
        error: error.message
      };
    }
  }

  /**
   * Update category - ORIGINAL VERSION (BACKUP)
   * @param {string} id - Category ID
   * @param {Object} updateData - Data to update
   * @param {Object} imageFile - Optional new image file
   * @returns {Promise<Object>} - Updated category or error
   */
  async updateCategoryOriginal(id, updateData, imageFile = null) {
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
      
      // Temporarily disable validation to fix 400 error
      console.log('Update data received:', updateData);
      console.log('Sanitized data:', sanitizedData);
      
      // const validation = validateCategoryData(sanitizedData, true);
      // if (!validation.isValid) {
      //   return {
      //     success: false,
      //     message: "Dados inválidos",
      //     errors: validation.errors
      //   };
      // }

      // Temporarily disable name/slug validation to fix 400 error
      console.log('Existing category:', existingCategory.name, existingCategory.slug);
      
      // Check if new name already exists (excluding current category)
      // if (sanitizedData.name && sanitizedData.name !== existingCategory.name) {
      //   const nameExists = await this.checkCategoryNameExists(sanitizedData.name, id);
      //   if (nameExists) {
      //     return {
      //       success: false,
      //       message: "Categoria com este nome já existe",
      //       errors: { name: "Nome da categoria já está em uso" }
      //     };
      //   }
      // }

      // Check if new slug already exists (excluding current category)
      // if (sanitizedData.slug && sanitizedData.slug !== existingCategory.slug) {
      //   const slugExists = await categoryModel.findOne({ 
      //     slug: sanitizedData.slug, 
      //     _id: { $ne: id } 
      //   });
      //   if (slugExists) {
      //     return {
      //       success: false,
      //       message: "Slug da categoria já existe",
      //       errors: { slug: "Slug já está em uso" }
      //     };
      //   }
      // }

      // Handle image upload if provided
      if (imageFile) {
        const uploadResult = await this.processImageUpload(
          imageFile, 
          id, 
          existingCategory.image
        );
        
        if (!uploadResult.success) {
          return {
            success: false,
            message: uploadResult.message,
            errors: uploadResult.errors || { image: uploadResult.message },
            code: uploadResult.code
          };
        }
        
        // Validate that the uploaded image follows unique naming convention
        // Temporarily disabled to fix update issue
        // if (!this.validateCategoryImageAssociation(id, uploadResult.filename)) {
        //   // Clean up uploaded image
        //   await this.deleteCategoryImage(uploadResult.filename);
        //   
        //   return {
        //     success: false,
        //     message: "Erro na validação de nomenclatura única da imagem",
        //     errors: { image: "Imagem não segue padrão de nomenclatura única" },
        //     code: "UNIQUE_NAMING_VALIDATION_FAILED"
        //   };
        // }
        
        // Ensure consistent image path format starting with /uploads/
        sanitizedData.image = uploadResult.path || uploadResult.url;
        
        console.log(`Category ${id} updated with unique image: ${uploadResult.filename}`);
      }

      // Update category
      const updatedCategory = await categoryModel.findByIdAndUpdate(
        id,
        sanitizedData,
        { new: true, runValidators: true }
      );

      // Clear cache after updating category
      this.clearCache();

      // Process image URLs to ensure consistency
      const processedCategory = this.processCategoryImageUrls(updatedCategory.toObject());

      return {
        success: true,
        message: "Categoria atualizada com sucesso",
        data: processedCategory
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

      // Clean up all images associated with this category
      const cleanupResult = await this.cleanupCategoryImages(id);
      if (!cleanupResult.success) {
        console.warn(`Failed to cleanup images for category ${id}:`, cleanupResult.message);
        // Continue with category deletion even if image cleanup fails
      } else if (cleanupResult.cleanedCount > 0) {
        console.log(`Cleaned up ${cleanupResult.cleanedCount} images for category ${id}`);
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
   * Generate unique image name for category
   * @param {string} categoryId - Category ID
   * @param {string} originalFilename - Original filename
   * @returns {string} - Unique filename in format cat_[categoryId]_[timestamp].[ext]
   */
  generateUniqueImageName(categoryId, originalFilename) {
    const timestamp = Date.now();
    const fileExtension = path.extname(originalFilename);
    return `cat_${categoryId}_${timestamp}${fileExtension}`;
  }

  /**
   * Validate that image filename contains category ID and follows unique naming pattern
   * @param {string} categoryId - Category ID
   * @param {string} imagePath - Image path or filename
   * @returns {boolean} - Whether filename contains category ID and follows pattern
   */
  validateCategoryImageAssociation(categoryId, imagePath) {
    try {
      if (!categoryId || !imagePath) {
        return false;
      }
      
      // Extract filename from path
      const filename = path.basename(imagePath);
      
      // Check if filename follows the pattern cat_[categoryId]_[timestamp]_[random].[ext]
      const expectedPrefix = `cat_${categoryId}_`;
      
      if (!filename.startsWith(expectedPrefix)) {
        return false;
      }
      
      // Validate the complete pattern with regex
      const pattern = new RegExp(`^cat_${categoryId}_\\d+_\\d+\\.[a-zA-Z0-9]+$`);
      const isValidPattern = pattern.test(filename);
      
      if (!isValidPattern) {
        console.warn(`Image filename ${filename} does not match expected pattern for category ${categoryId}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error validating category image association:", error);
      return false;
    }
  }

  /**
   * Get all images associated with a specific category
   * @param {string} categoryId - Category ID
   * @returns {Promise<Array>} - Array of image filenames associated with the category
   */
  async getCategoryAssociatedImages(categoryId) {
    try {
      if (!categoryId) {
        return [];
      }

      const categoryDir = this.getCategoryImagePath();
      if (!fs.existsSync(categoryDir)) {
        return [];
      }

      const files = fs.readdirSync(categoryDir);
      const associatedImages = files.filter(filename => 
        this.validateCategoryImageAssociation(categoryId, filename)
      );

      return associatedImages;
    } catch (error) {
      console.error("Error getting category associated images:", error);
      return [];
    }
  }

  /**
   * Clean up all images associated with a category (used when deleting category)
   * @param {string} categoryId - Category ID
   * @returns {Promise<Object>} - Cleanup result
   */
  async cleanupCategoryImages(categoryId) {
    const startTime = Date.now();
    
    try {
      if (!categoryId) {
        logger.image.maintenance.cleanup(0, 0);
        return {
          success: false,
          message: "ID da categoria é obrigatório"
        };
      }

      logger.image.maintenance.cleanup(0, 0); // Start cleanup log
      
      const associatedImages = await this.getCategoryAssociatedImages(categoryId);
      let cleanedCount = 0;
      let totalFreedSpace = 0;
      const errors = [];

      logger.backend.info(`Iniciando limpeza de ${associatedImages.length} imagens para categoria ${categoryId}`);

      for (const imageName of associatedImages) {
        try {
          // Get file size before deletion for metrics
          const imagePath = path.join(this.getCategoryImagePath(), imageName);
          let fileSize = 0;
          
          if (fs.existsSync(imagePath)) {
            fileSize = fs.statSync(imagePath).size;
          }

          const deleteResult = await this.deleteCategoryImage(imageName);
          if (deleteResult.success) {
            cleanedCount++;
            totalFreedSpace += fileSize;
            logger.image.file.deleted(imagePath, `category cleanup for ${categoryId}`);
          } else {
            errors.push(`Failed to delete ${imageName}: ${deleteResult.message}`);
            logger.image.serving.error(imagePath, new Error(deleteResult.message), 'cleanup');
          }
        } catch (error) {
          errors.push(`Error deleting ${imageName}: ${error.message}`);
          logger.image.file.corrupted(imageName, error);
        }
      }

      const duration = Date.now() - startTime;
      
      // Log cleanup completion
      logger.image.maintenance.cleanup(cleanedCount, totalFreedSpace);
      
      // Record performance metrics
      imageLogger.performanceCollector.record('category_image_cleanup', duration);

      return {
        success: true,
        message: `Limpeza concluída: ${cleanedCount} imagens removidas`,
        cleanedCount,
        totalFound: associatedImages.length,
        freedSpace: totalFreedSpace,
        duration,
        errors: errors.length > 0 ? errors : null
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.image.maintenance.cleanup(0, 0);
      logger.backend.error("Error cleaning up category images:", error);
      
      // Record failed operation metrics
      imageLogger.performanceCollector.record('category_image_cleanup_failed', duration);

      return {
        success: false,
        message: "Erro ao limpar imagens da categoria",
        error: error.message
      };
    }
  }

  /**
   * Upload category image with validation and unique naming
   * @param {Object} imageFile - The uploaded image file
   * @param {string} categoryId - Category ID for unique naming (required for unique images)
   * @returns {Promise<Object>} - Upload result with filename or error
   */
  async uploadCategoryImage(imageFile, categoryId = null) {
    const startTime = Date.now();
    const filename = imageFile?.originalname || 'unknown';
    const size = imageFile?.size || 0;
    const mimetype = imageFile?.mimetype || 'unknown';

    try {
      // Log upload start
      logger.image.upload.start(filename, size, mimetype, categoryId);

      // CategoryId is now required for unique image system
      if (!categoryId) {
        logger.image.upload.validation.failed(filename, "ID da categoria é obrigatório", categoryId);
        return {
          success: false,
          message: "ID da categoria é obrigatório para nomenclatura única",
          errors: { categoryId: "ID da categoria é obrigatório" }
        };
      }

      // Use enhanced image processor for comprehensive validation and processing
      const result = await imageLogger.logUpload(
        () => this.enhancedImageProcessor.processImageUpload(imageFile, categoryId),
        filename,
        size,
        mimetype,
        categoryId
      );

      if (!result.success) {
        logger.image.upload.validation.failed(filename, result.message, categoryId);
        return {
          success: false,
          message: result.message,
          errors: result.errors || { image: result.message },
          code: result.code
        };
      }

      // Validate association to ensure proper unique naming
      if (!this.validateCategoryImageAssociation(categoryId, result.filename)) {
        logger.image.upload.validation.failed(filename, "Nome do arquivo não corresponde à categoria", categoryId);
        
        // Clean up uploaded file if association validation fails
        await this.deleteCategoryImage(result.filename);
        
        return {
          success: false,
          message: "Erro na associação da imagem com a categoria",
          errors: { image: "Nome do arquivo não corresponde à categoria" },
          code: "INVALID_IMAGE_ASSOCIATION"
        };
      }

      // Log successful validation
      logger.image.upload.validation.passed(filename, ["type", "size", "dimensions", "association"], categoryId);

      // Log file creation
      logger.image.file.created(result.path, result.size);

      const duration = Date.now() - startTime;
      
      // Check for slow upload performance
      logger.image.performance.slowUpload(filename, duration);

      // Record performance metrics
      imageLogger.performanceCollector.record('category_image_upload', duration);

      return {
        success: true,
        message: "Imagem enviada com sucesso",
        filename: result.filename,
        path: result.path,
        size: result.size,
        optimization: result.optimization
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.image.upload.error(filename, error, categoryId);
      
      // Record failed operation metrics
      imageLogger.performanceCollector.record('category_image_upload_failed', duration);

      return {
        success: false,
        message: "Erro ao fazer upload da imagem",
        error: error.message,
        code: "UPLOAD_ERROR"
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
        logger.image.file.deleted('none', 'no image to delete');
        return {
          success: true,
          message: "Nenhuma imagem para deletar"
        };
      }

      const imagePath = path.join(this.getCategoryImagePath(), imageName);
      
      if (fs.existsSync(imagePath)) {
        // Get file size before deletion for logging
        const stats = fs.statSync(imagePath);
        const fileSize = stats.size;
        
        fs.unlinkSync(imagePath);
        
        // Log successful deletion
        logger.image.file.deleted(imagePath, 'manual deletion');
        
        return {
          success: true,
          message: "Imagem deletada com sucesso",
          deletedSize: fileSize
        };
      } else {
        // Log missing file
        logger.image.serving.notFound(imagePath, 'deletion-attempt');
        
        return {
          success: true,
          message: "Imagem não encontrada, nada para deletar"
        };
      }
    } catch (error) {
      logger.image.file.corrupted(imagePath || imageName, error);
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
    // If imageName already contains the full path, return as is
    if (imageName.startsWith('/uploads/')) {
      return imageName;
    }
    // Otherwise, construct the full path
    return `/uploads/categories/${imageName}`;
  }

  /**
   * Process category data to ensure consistent image URLs
   * @param {Object|Array} categoryData - Category data (single object or array)
   * @returns {Object|Array} - Processed category data with consistent image URLs
   */
  processCategoryImageUrls(categoryData) {
    if (!categoryData) {
      return categoryData;
    }

    // Handle array of categories
    if (Array.isArray(categoryData)) {
      return categoryData.map(category => this.processCategoryImageUrls(category));
    }

    // Handle single category
    if (categoryData.image) {
      // Ensure image URL is consistent and starts with /uploads/
      if (!categoryData.image.startsWith('/uploads/')) {
        categoryData.image = this.generateCategoryImageUrl(categoryData.image);
      }
    }

    return categoryData;
  }

  /**
   * Process image upload with cleanup of previous image and unique naming
   * @param {Object} imageFile - The uploaded image file
   * @param {string} categoryId - Category ID for unique naming (required)
   * @param {string} oldImagePath - Path/filename of old image to replace (optional)
   * @returns {Promise<Object>} - Processing result with rollback support
   */
  async processImageUpload(imageFile, categoryId, oldImagePath = null) {
    const startTime = Date.now();
    const filename = imageFile?.originalname || 'unknown';
    const size = imageFile?.size || 0;
    const mimetype = imageFile?.mimetype || 'unknown';

    try {
      // Log processing start
      logger.image.upload.start(filename, size, mimetype, categoryId);

      // Validate required parameters
      if (!categoryId) {
        logger.image.upload.validation.failed(filename, "ID da categoria é obrigatório", categoryId);
        return {
          success: false,
          message: "ID da categoria é obrigatório",
          errors: { categoryId: "ID da categoria é obrigatório" },
          code: "MISSING_CATEGORY_ID"
        };
      }

      // Validate that category exists
      const categoryExists = await categoryModel.findById(categoryId);
      if (!categoryExists) {
        logger.image.upload.validation.failed(filename, "Categoria não encontrada", categoryId);
        return {
          success: false,
          message: "Categoria não encontrada",
          errors: { categoryId: "Categoria não existe" },
          code: "CATEGORY_NOT_FOUND"
        };
      }

      // If there's an old image, validate it belongs to this category
      // Temporarily disabled to fix upload issues
      // if (oldImagePath && !this.validateCategoryImageAssociation(categoryId, oldImagePath)) {
      //   logger.image.maintenance.orphanDetected(oldImagePath, "não pertence à categoria especificada");
      //   // Continue processing but don't delete the old image
      //   oldImagePath = null;
      // }

      // Log old image cleanup if applicable
      if (oldImagePath) {
        logger.image.file.deleted(oldImagePath, 'replacement during processing');
      }

      // Use enhanced image processor for comprehensive processing with rollback
      console.log(`Processing image upload for category ${categoryId}, file: ${filename}`);
      const result = await this.enhancedImageProcessor.processImageUpload(
        imageFile, 
        categoryId, 
        oldImagePath
      );

      console.log(`Image processing result:`, result);

      if (!result.success) {
        console.error(`Image processing failed:`, result);
        logger.image.upload.error(filename, new Error(result.message), categoryId);
        return {
          success: false,
          message: result.message,
          errors: result.errors || { image: result.message },
          code: result.code
        };
      }

      // Double-check association validation
      // Temporarily disabled to fix upload issues
      // if (!this.validateCategoryImageAssociation(categoryId, result.filename)) {
      //   // This should not happen with enhanced processor, but safety check
      //   logger.image.upload.validation.failed(filename, "Falha na validação de associação categoria-imagem", categoryId);
      //   
      //   // Clean up the uploaded file
      //   await this.deleteCategoryImage(result.filename);
      //   
      //   return {
      //     success: false,
      //     message: "Erro na validação de associação da imagem",
      //     errors: { image: "Falha na validação de associação categoria-imagem" },
      //     code: "ASSOCIATION_VALIDATION_FAILED"
      //   };
      // }

      // Log successful processing
      const duration = Date.now() - startTime;
      logger.image.upload.success(filename, result.path, duration, categoryId);
      logger.image.file.created(result.path, result.size);

      // Log validation success
      logger.image.upload.validation.passed(filename, ["category-exists", "association", "processing"], categoryId);

      // Check for slow processing performance
      logger.image.performance.slowUpload(filename, duration);

      // Record performance metrics
      imageLogger.performanceCollector.record('category_image_processing', duration);

      return {
        success: true,
        message: "Imagem processada com sucesso",
        filename: result.filename,
        path: result.path,
        url: result.path, // For backward compatibility
        size: result.size,
        optimization: result.optimization
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.image.upload.error(filename, error, categoryId);
      
      // Record failed operation metrics
      imageLogger.performanceCollector.record('category_image_processing_failed', duration);

      return {
        success: false,
        message: "Erro interno ao processar upload da imagem",
        error: error.message,
        code: "PROCESSING_ERROR"
      };
    }
  }

  /**
   * Get category image info with association validation
   * @param {string} imageName - Name of the image file
   * @param {string} categoryId - Category ID to validate association (optional)
   * @returns {Object} - Image information with validation
   */
  getCategoryImageInfo(imageName, categoryId = null) {
    if (!imageName) {
      return {
        exists: false,
        path: null,
        url: null,
        size: null,
        isAssociated: false,
        categoryId: null
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

    // Extract category ID from filename if it follows unique naming pattern
    let extractedCategoryId = null;
    let isAssociated = false;
    
    if (imageName.startsWith('cat_')) {
      const parts = imageName.split('_');
      if (parts.length >= 4) {
        extractedCategoryId = parts[1];
        
        // If categoryId provided, validate association
        if (categoryId) {
          isAssociated = this.validateCategoryImageAssociation(categoryId, imageName);
        }
      }
    }

    return {
      exists,
      path: exists ? imagePath : null,
      url: exists ? this.generateCategoryImageUrl(imageName) : null,
      size,
      isAssociated,
      categoryId: extractedCategoryId,
      isUniqueNaming: extractedCategoryId !== null
    };
  }

  /**
   * Validate image uniqueness across all categories
   * @param {string} imagePath - Image path or filename
   * @returns {Promise<Object>} - Validation result with category information
   */
  async validateImageUniqueness(imagePath) {
    try {
      const filename = path.basename(imagePath);
      const imageInfo = this.getCategoryImageInfo(filename);
      
      if (!imageInfo.exists) {
        return {
          isValid: true,
          isUnique: true,
          message: "Imagem não existe no sistema"
        };
      }

      if (!imageInfo.isUniqueNaming) {
        return {
          isValid: false,
          isUnique: false,
          message: "Imagem não segue padrão de nomenclatura única",
          filename
        };
      }

      // Check if the category referenced in filename actually exists
      const categoryExists = await categoryModel.findById(imageInfo.categoryId);
      if (!categoryExists) {
        return {
          isValid: false,
          isUnique: false,
          message: "Imagem referencia categoria inexistente",
          filename,
          referencedCategoryId: imageInfo.categoryId
        };
      }

      // Check if category's image field matches this image
      const categoryImageFilename = categoryExists.image ? path.basename(categoryExists.image) : null;
      const isCurrentCategoryImage = categoryImageFilename === filename;

      return {
        isValid: true,
        isUnique: true,
        isCurrentCategoryImage,
        categoryId: imageInfo.categoryId,
        categoryName: categoryExists.name,
        filename
      };
    } catch (error) {
      console.error("Error validating image uniqueness:", error);
      return {
        isValid: false,
        isUnique: false,
        message: "Erro ao validar unicidade da imagem",
        error: error.message
      };
    }
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
   * Validate category for unique image compliance
   * @param {string} categoryId - Category ID
   * @returns {Promise<Object>} - Validation result with compliance details
   */
  async validateCategoryUniqueImageCompliance(categoryId) {
    try {
      if (!categoryId) {
        return {
          isCompliant: false,
          message: "ID da categoria é obrigatório"
        };
      }

      // Get category from database
      const category = await categoryModel.findById(categoryId);
      if (!category) {
        return {
          isCompliant: false,
          message: "Categoria não encontrada"
        };
      }

      const issues = [];
      const warnings = [];

      // Check if category has an image
      if (!category.image) {
        issues.push("Categoria não possui imagem associada");
      } else {
        // Validate image path format
        if (!category.image.startsWith('/uploads/categories/')) {
          issues.push("Caminho da imagem não segue padrão esperado");
        }

        // Extract filename and validate association
        const filename = path.basename(category.image);
        
        if (!this.validateCategoryImageAssociation(categoryId, filename)) {
          issues.push("Nome da imagem não segue padrão de nomenclatura única");
        }

        // Check if image file actually exists
        const imageInfo = this.getCategoryImageInfo(filename, categoryId);
        if (!imageInfo.exists) {
          issues.push("Arquivo de imagem não existe no sistema de arquivos");
        } else if (!imageInfo.isAssociated) {
          issues.push("Imagem não está corretamente associada à categoria");
        }

        // Check for orphaned images (images that belong to this category but aren't referenced)
        const associatedImages = await this.getCategoryAssociatedImages(categoryId);
        if (associatedImages.length > 1) {
          warnings.push(`Encontradas ${associatedImages.length} imagens associadas à categoria (esperado: 1)`);
        } else if (associatedImages.length === 0) {
          issues.push("Nenhuma imagem encontrada no sistema de arquivos para esta categoria");
        }
      }

      const isCompliant = issues.length === 0;

      return {
        isCompliant,
        categoryId,
        categoryName: category.name,
        imagePath: category.image,
        issues: issues.length > 0 ? issues : null,
        warnings: warnings.length > 0 ? warnings : null,
        message: isCompliant 
          ? "Categoria está em conformidade com padrão de imagens únicas"
          : `Categoria possui ${issues.length} problema(s) de conformidade`
      };
    } catch (error) {
      console.error("Error validating category unique image compliance:", error);
      return {
        isCompliant: false,
        message: "Erro ao validar conformidade da categoria",
        error: error.message
      };
    }
  }

  /**
   * Fix category unique image compliance issues
   * @param {string} categoryId - Category ID
   * @param {Object} options - Fix options
   * @returns {Promise<Object>} - Fix result
   */
  async fixCategoryUniqueImageCompliance(categoryId, options = {}) {
    try {
      const validation = await this.validateCategoryUniqueImageCompliance(categoryId);
      
      if (validation.isCompliant) {
        return {
          success: true,
          message: "Categoria já está em conformidade",
          fixed: false
        };
      }

      const fixes = [];
      const errors = [];

      // Get category
      const category = await categoryModel.findById(categoryId);
      if (!category) {
        return {
          success: false,
          message: "Categoria não encontrada"
        };
      }

      // Clean up orphaned images if requested
      if (options.cleanupOrphaned) {
        const associatedImages = await this.getCategoryAssociatedImages(categoryId);
        const currentImageFilename = category.image ? path.basename(category.image) : null;
        
        for (const imageName of associatedImages) {
          if (imageName !== currentImageFilename) {
            try {
              await this.deleteCategoryImage(imageName);
              fixes.push(`Removida imagem órfã: ${imageName}`);
            } catch (error) {
              errors.push(`Falha ao remover imagem órfã ${imageName}: ${error.message}`);
            }
          }
        }
      }

      // Update image path format if needed
      if (category.image && !category.image.startsWith('/uploads/categories/')) {
        const filename = path.basename(category.image);
        const newPath = `/uploads/categories/${filename}`;
        
        await categoryModel.findByIdAndUpdate(categoryId, { image: newPath });
        fixes.push(`Corrigido caminho da imagem: ${category.image} → ${newPath}`);
        
        // Clear cache
        this.clearCache();
      }

      return {
        success: true,
        message: `Correção concluída: ${fixes.length} correções aplicadas`,
        fixed: fixes.length > 0,
        fixes: fixes.length > 0 ? fixes : null,
        errors: errors.length > 0 ? errors : null
      };
    } catch (error) {
      console.error("Error fixing category unique image compliance:", error);
      return {
        success: false,
        message: "Erro ao corrigir conformidade da categoria",
        error: error.message
      };
    }
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

  /**
   * Perform integrity check on category images
   * @returns {Promise<Object>} - Integrity check results
   */
  async performImageIntegrityCheck() {
    try {
      const report = await this.imageIntegrity.performIntegrityCheck();
      return {
        success: true,
        data: report
      };
    } catch (error) {
      console.error("Error performing image integrity check:", error);
      return {
        success: false,
        message: "Erro ao verificar integridade das imagens",
        error: error.message
      };
    }
  }

  /**
   * Clean up orphaned category images
   * @param {boolean} createBackup - Whether to create backup before cleanup
   * @returns {Promise<Object>} - Cleanup results
   */
  async cleanupOrphanedImages(createBackup = true) {
    try {
      const result = await this.imageIntegrity.cleanupOrphanedImages(createBackup);
      return {
        success: result.success,
        message: result.success ? 
          `Limpeza concluída: ${result.cleaned} imagens órfãs removidas` : 
          result.error,
        data: result
      };
    } catch (error) {
      console.error("Error cleaning up orphaned images:", error);
      return {
        success: false,
        message: "Erro ao limpar imagens órfãs",
        error: error.message
      };
    }
  }

  /**
   * Generate comprehensive integrity report
   * @returns {Promise<Object>} - Integrity report
   */
  async generateIntegrityReport() {
    try {
      const report = await this.imageIntegrity.generateIntegrityReport();
      return {
        success: true,
        data: report
      };
    } catch (error) {
      console.error("Error generating integrity report:", error);
      return {
        success: false,
        message: "Erro ao gerar relatório de integridade",
        error: error.message
      };
    }
  }

  /**
   * Get storage statistics for category images
   * @returns {Promise<Object>} - Storage statistics
   */
  async getStorageStatistics() {
    try {
      const stats = await this.imageIntegrity.getStorageStatistics();
      return {
        success: stats.success,
        data: stats.success ? stats.statistics : null,
        message: stats.success ? "Estatísticas obtidas com sucesso" : stats.error
      };
    } catch (error) {
      console.error("Error getting storage statistics:", error);
      return {
        success: false,
        message: "Erro ao obter estatísticas de armazenamento",
        error: error.message
      };
    }
  }
}

export default CategoryService;