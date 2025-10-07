import express from "express";
import { 
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
} from "../controllers/categoryController.js";
import { 
  adminAuthMiddleware, 
  adminActionLogger, 
  adminRateLimit 
} from "../middleware/adminAuth.js";
import { 
  secureImageUpload, 
  handleUploadErrors, 
  validateUploadedFile, 
  cleanupOnError 
} from "../middleware/fileUploadSecurity.js";
import { createImageValidationMiddleware, handleMulterError } from "../middleware/imageValidation.js";
import imageCompressionMiddleware from "../middleware/imageCompression.js";
import { 
  sanitizeCategoryInput, 
  validateSpecificFields, 
  setSecurityHeaders 
} from "../middleware/inputSanitization.js";
import {
  trackPerformance,
  setCacheHeaders,
  handleConditionalRequests,
  rateLimitCategories,
  logSlowQueries,
  addSecurityHeaders,
  recordMetrics
} from "../middleware/categoryPerformance.js";

const categoryRouter = express.Router();

// Create image validation middleware for category images
const categoryImageValidation = createImageValidationMiddleware('image', 'uploads/categories');

// Apply global middleware to all routes
categoryRouter.use(setSecurityHeaders);
categoryRouter.use(addSecurityHeaders);
categoryRouter.use(trackPerformance);
categoryRouter.use(recordMetrics);
categoryRouter.use(logSlowQueries(500)); // Log queries taking more than 500ms

// Admin routes (require authentication and authorization)
categoryRouter.post("/admin/categories", 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('CREATE_CATEGORY'),
  categoryImageValidation,
  handleMulterError,
  imageCompressionMiddleware.compressUploadedImages,
  imageCompressionMiddleware.logCompressionResults,
  sanitizeCategoryInput,
  validateSpecificFields(['name']),
  createCategory
);

categoryRouter.get("/admin/categories", 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('LIST_CATEGORIES'),
  sanitizeCategoryInput,
  getAllCategories
);

categoryRouter.get("/admin/categories/:id", 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('GET_CATEGORY'),
  sanitizeCategoryInput,
  getCategoryById
);

categoryRouter.put("/admin/categories/:id", 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('UPDATE_CATEGORY'),
  sanitizeCategoryInput,
  categoryImageValidation,
  handleMulterError,
  imageCompressionMiddleware.compressUploadedImages,
  imageCompressionMiddleware.logCompressionResults,
  updateCategory
);

categoryRouter.delete("/admin/categories/:id", 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('DELETE_CATEGORY'),
  sanitizeCategoryInput,
  deleteCategory
);

categoryRouter.post("/admin/categories/upload", 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('UPLOAD_CATEGORY_IMAGE'),
  categoryImageValidation,
  handleMulterError,
  imageCompressionMiddleware.compressUploadedImages,
  imageCompressionMiddleware.logCompressionResults,
  uploadCategoryImage
);

// Performance and maintenance routes (Admin only)
categoryRouter.get("/admin/categories/performance/stats", 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('GET_PERFORMANCE_STATS'),
  getPerformanceStats
);

categoryRouter.post("/admin/categories/performance/warmup", 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('WARMUP_CACHE'),
  warmupCache
);

categoryRouter.delete("/admin/categories/performance/cache", 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('CLEAR_CACHE'),
  clearCache
);

categoryRouter.delete("/admin/categories/performance/cleanup-images", 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('CLEANUP_OPTIMIZED_IMAGES'),
  cleanupOptimizedImages
);

// Public routes (for frontend) - with caching and performance optimizations
categoryRouter.get("/categories", 
  rateLimitCategories(60000, 200), // 200 requests per minute for public endpoint
  setCacheHeaders(300), // Cache for 5 minutes
  handleConditionalRequests,
  sanitizeCategoryInput,
  getActiveCategories
);

categoryRouter.get("/categories/:slug", 
  rateLimitCategories(60000, 100), // 100 requests per minute for individual category
  setCacheHeaders(600), // Cache for 10 minutes
  handleConditionalRequests,
  sanitizeCategoryInput,
  getCategoryBySlug
);

export default categoryRouter;