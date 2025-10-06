import CategoryService from "../services/categoryService.js";
import userModel from "../models/userModel.js";

const categoryService = new CategoryService();

// Create new category (Admin only)
const createCategory = async (req, res) => {
  try {
    // Admin authentication is handled by middleware
    console.log('=== CREATE CATEGORY DEBUG ===');
    console.log('Headers:', req.headers);
    console.log('Received category data:', req.body);
    console.log('Received file:', req.file);
    console.log('User from middleware:', req.user);
    
    const categoryData = {
      name: req.body.name,
      originalName: req.body.originalName || req.body.name,
      slug: req.body.slug,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      order: req.body.order || 0
    };

    console.log('Processed category data:', categoryData);

    const result = await categoryService.createCategory(categoryData, req.file);
    
    console.log('Service result:', result);
    
    if (result.success) {
      res.json(result);
    } else {
      console.log('Returning 400 error:', result);
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error in createCategory:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Get all categories (Admin only - includes inactive)
const getAllCategories = async (req, res) => {
  try {
    // Admin authentication is handled by middleware
    const includeInactive = req.query.includeInactive === 'true';
    const result = await categoryService.getAllCategories(includeInactive);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
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

// Update category (Admin only)
const updateCategory = async (req, res) => {
  try {
    // Admin authentication is handled by middleware
    const updateData = {};
    
    // Only include fields that are provided
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.originalName !== undefined) updateData.originalName = req.body.originalName;
    if (req.body.slug !== undefined) updateData.slug = req.body.slug;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    if (req.body.order !== undefined) updateData.order = parseInt(req.body.order);

    const result = await categoryService.updateCategory(req.params.id, updateData, req.file);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error in updateCategory:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor",
      error: error.message 
    });
  }
};

// Delete category (Admin only)
const deleteCategory = async (req, res) => {
  try {
    // Admin authentication is handled by middleware
    const result = await categoryService.deleteCategory(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      if (result.code === "CATEGORY_HAS_PRODUCTS") {
        res.status(409).json(result); // Conflict status
      } else {
        res.status(400).json(result);
      }
    }
  } catch (error) {
    console.error("Error in deleteCategory:", error);
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
  cleanupOptimizedImages
};