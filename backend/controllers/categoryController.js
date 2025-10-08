import CategoryService from "../services/categoryService.js";
import userModel from "../models/userModel.js";
import categoryModel from "../models/categoryModel.js";
import { logger, imageLogger } from "../utils/logger.js";
import imageLoggingIntegration from "../utils/imageLoggingIntegration.js";

const categoryService = new CategoryService();

// Create new category (Admin only) - SIMPLE LIKE FOOD
const createCategory = async (req, res) => {
  let image_filename = `${req.file.filename}`;
  
  try {
    // Check admin (simple like food)
    let userData = await userModel.findById(req.body.userId);
    if (!userData || userData.role !== "admin") {
      return res.json({ success: false, message: "You are not admin" });
    }

    const categoryData = {
      name: req.body.name,
      originalName: req.body.originalName || req.body.name,
      slug: req.body.slug || req.body.name.toLowerCase().replace(/\s+/g, '-'),
      image: `/uploads/${image_filename}`,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      order: parseInt(req.body.order) || 0
    };

    const category = new categoryModel(categoryData);
    await category.save();
    res.json({ success: true, message: "Category Added" });
    
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// Get all categories (Admin only - includes inactive)
const getAllCategories = async (req, res) => {
  try {
    // Set timeout for this operation
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: "Request timeout - categories taking too long to load"
        });
      }
    }, 25000); // 25 seconds timeout
    
    // Admin authentication is handled by middleware
    const includeInactive = req.query.includeInactive === 'true';
    const result = await categoryService.getAllCategories(includeInactive);
    
    // Clear timeout if operation completed
    clearTimeout(timeoutId);
    
    if (!res.headersSent) {
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    }
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: "Erro interno do servidor",
        error: error.message 
      });
    }
  }
};

// Get category by ID (Admin only)
const getCategoryById = async (req, res) => {
  try {
    // Admin authentication is handled by middleware
    const result = await categoryService.getCategoryById(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error in getCategoryById:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Update category (Admin only) - SIMPLE LIKE FOOD
const updateCategory = async (req, res) => {
  try {
    // Check admin (simple like food)
    let userData = await userModel.findById(req.body.userId);
    if (!userData || userData.role !== "admin") {
      return res.json({ success: false, message: "You are not admin" });
    }

    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.originalName) updateData.originalName = req.body.originalName;
    if (req.body.slug) updateData.slug = req.body.slug;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    if (req.body.order !== undefined) updateData.order = parseInt(req.body.order);

    // Handle image like food system
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    // Update category
    const updatedCategory = await categoryModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedCategory) {
      return res.json({ success: false, message: "Category not found" });
    }

    res.json({ success: true, message: "Category Updated" });
    
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// Delete category (Admin only)
const deleteCategory = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?.id || 'unknown';
  const categoryId = req.params.id;
  
  try {
    // Log API request
    logger.api.request('DELETE', `/api/admin/categories/${categoryId}`, req.ip);
    logger.backend.info(`Admin ${userId} deleting category: ${categoryId}`);
    
    const result = await categoryService.deleteCategory(categoryId);
    
    const duration = Date.now() - startTime;
    
    if (result.success) {
      logger.backend.info(`Category deleted successfully: ${categoryId} (${duration}ms)`);
      
      // Log image cleanup if any images were removed
      if (result.cleanedCount > 0) {
        logger.image.maintenance.cleanup(result.cleanedCount, result.freedSpace || 0);
      }
      
      // Record performance metrics
      imageLogger.performanceCollector.record('category_deletion', duration);
      
      res.json(result);
    } else {
      logger.backend.warn(`Category deletion failed: ${categoryId} - ${result.message}`);
      
      if (result.code === "CATEGORY_HAS_PRODUCTS") {
        res.status(409).json(result); // Conflict status
      } else {
        res.status(400).json(result);
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api.error(`Error in deleteCategory for ${categoryId}:`, error);
    
    // Record failed operation metrics
    imageLogger.performanceCollector.record('category_deletion_failed', duration);
    
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Upload category image (Admin only)
const uploadCategoryImage = async (req, res) => {
  try {
    // Admin authentication and file validation are handled by middleware
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "Nenhuma imagem foi enviada" 
      });
    }

    const result = await categoryService.uploadCategoryImage(req.file);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error in uploadCategoryImage:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Get active categories (Public endpoint for frontend)
const getActiveCategories = async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🔄 getActiveCategories: Iniciando busca de categorias ativas...');
    console.log('🔍 Request headers:', {
      'user-agent': req.headers['user-agent'],
      'origin': req.headers.origin,
      'referer': req.headers.referer
    });
    
    const result = await categoryService.getAllCategories(false); // Only active categories
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ getActiveCategories: Busca completada em ${duration}ms`);
    
    if (result.success) {
      console.log(`✅ getActiveCategories: ${result.data.length} categorias encontradas`);
      console.log('📊 Categorias:', result.data.map(cat => ({ name: cat.name, slug: cat.slug, active: cat.isActive })));
      
      // Add caching headers for better performance
      res.set({
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'ETag': `"categories-${Date.now()}"`,
        'Last-Modified': new Date().toUTCString(),
        'X-Response-Time': `${duration}ms`,
        'X-Categories-Count': result.data.length.toString()
      });
      
      res.json(result);
    } else {
      console.error('❌ getActiveCategories: Falha no serviço:', result);
      res.status(500).json(result);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ getActiveCategories: Erro após ${duration}ms:`, error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message,
      duration: `${duration}ms`
    });
  }
};

// Get category by slug (Public endpoint for frontend)
const getCategoryBySlug = async (req, res) => {
  try {
    const result = await categoryService.getCategoryBySlug(req.params.slug);
    
    if (result.success) {
      // Add caching headers for individual category
      res.set({
        'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
        'ETag': `"category-${req.params.slug}-${Date.now()}"`,
        'Last-Modified': new Date().toUTCString()
      });
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error in getCategoryBySlug:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Get performance statistics (Admin only)
const getPerformanceStats = async (req, res) => {
  try {
    const result = await categoryService.getPerformanceStats();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error in getPerformanceStats:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Warm up cache (Admin only)
const warmupCache = async (req, res) => {
  try {
    const result = await categoryService.warmupCache();
    res.json(result);
  } catch (error) {
    console.error("Error in warmupCache:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Clear cache (Admin only)
const clearCache = async (req, res) => {
  try {
    categoryService.clearCache();
    res.json({
      success: true,
      message: "Cache limpo com sucesso"
    });
  } catch (error) {
    console.error("Error in clearCache:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Clean up optimized images (Admin only)
const cleanupOptimizedImages = async (req, res) => {
  try {
    const result = await categoryService.cleanupOptimizedImages();
    res.json(result);
  } catch (error) {
    console.error("Error in cleanupOptimizedImages:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Perform image integrity check (Admin only)
const performImageIntegrityCheck = async (req, res) => {
  try {
    const result = await categoryService.performImageIntegrityCheck();
    res.json(result);
  } catch (error) {
    console.error("Error in performImageIntegrityCheck:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Clean up orphaned images (Admin only)
const cleanupOrphanedImages = async (req, res) => {
  try {
    const createBackup = req.query.backup !== 'false'; // Default to true
    const result = await categoryService.cleanupOrphanedImages(createBackup);
    res.json(result);
  } catch (error) {
    console.error("Error in cleanupOrphanedImages:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Generate integrity report (Admin only)
const generateIntegrityReport = async (req, res) => {
  try {
    const result = await categoryService.generateIntegrityReport();
    res.json(result);
  } catch (error) {
    console.error("Error in generateIntegrityReport:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Get storage statistics (Admin only)
const getStorageStatistics = async (req, res) => {
  try {
    const result = await categoryService.getStorageStatistics();
    res.json(result);
  } catch (error) {
    console.error("Error in getStorageStatistics:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Get image system monitoring status (Admin only)
const getImageMonitoringStatus = async (req, res) => {
  try {
    logger.api.request('GET', '/api/admin/categories/monitoring/status', req.ip);
    
    const status = imageLoggingIntegration.getSystemStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.api.error("Error in getImageMonitoringStatus:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Get image performance metrics (Admin only)
const getImagePerformanceMetrics = async (req, res) => {
  try {
    logger.api.request('GET', '/api/admin/categories/monitoring/metrics', req.ip);
    
    const timeframe = req.query.timeframe || 'hour';
    const report = imageLoggingIntegration.generatePerformanceReport(timeframe);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.api.error("Error in getImagePerformanceMetrics:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Get image system alerts (Admin only)
const getImageSystemAlerts = async (req, res) => {
  try {
    logger.api.request('GET', '/api/admin/categories/monitoring/alerts', req.ip);
    
    const limit = parseInt(req.query.limit) || 50;
    const severity = req.query.severity; // 'critical', 'warning', 'info'
    
    let alerts = imageLogger.getAlerts();
    
    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    // Limit results
    alerts = alerts.slice(-limit);
    
    res.json({
      success: true,
      data: {
        alerts,
        total: alerts.length,
        filters: { limit, severity }
      }
    });
  } catch (error) {
    logger.api.error("Error in getImageSystemAlerts:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Reset image monitoring metrics (Admin only)
const resetImageMonitoringMetrics = async (req, res) => {
  try {
    logger.api.request('POST', '/api/admin/categories/monitoring/reset', req.ip);
    logger.backend.info(`Admin ${req.user?.id} resetting image monitoring metrics`);
    
    imageLogger.resetMetrics();
    
    res.json({
      success: true,
      message: "Métricas de monitoramento resetadas com sucesso"
    });
  } catch (error) {
    logger.api.error("Error in resetImageMonitoringMetrics:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

export { 
  createCategory, 
  getAllCategories, 
  getCategoryById, 
  updateCategory, 
  deleteCategory, 
  uploadCategoryImage,
  getActiveCategories,
  getCategoryBySlug,
  getPerformanceStats,
  warmupCache,
  clearCache,
  cleanupOptimizedImages,
  performImageIntegrityCheck,
  cleanupOrphanedImages,
  generateIntegrityReport,
  getStorageStatistics,
  getImageMonitoringStatus,
  getImagePerformanceMetrics,
  getImageSystemAlerts,
  resetImageMonitoringMetrics
};