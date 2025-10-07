# Implementation Plan

- [x] 1. Create image utility functions and SafeImage component
  - Create `frontend/src/utils/imageUtils.js` with URL resolution functions
  - Create `admin/src/utils/imageUtils.js` with the same utility functions
  - Create `frontend/src/components/SafeImage/SafeImage.jsx` component with error handling
  - Create `admin/src/components/SafeImage/SafeImage.jsx` component with error handling
  - Write unit tests for image utility functions
  - _Requirements: 5.1, 5.2, 6.2_

- [x] 2. Standardize backend image serving configuration
  - Remove duplicate `/images` static serving route from `backend/server.js`
  - Ensure `/uploads` route serves images with correct MIME types and headers
  - Add image existence validation middleware for serving static files
  - Update image serving to return 404 for missing files instead of empty responses
  - _Requirements: 5.1, 5.3, 6.4_

- [x] 3. Fix food controller image URL generation
  - Update `backend/controllers/foodController.js` addFood function to save consistent image paths
  - Ensure all image paths saved to database start with `/uploads/`
  - Update listFood function to return consistent image URLs
  - Update updateFood function to handle image path consistency
  - _Requirements: 5.1, 5.2_

- [x] 4. Fix category controller image URL generation
  - Update `backend/controllers/categoryController.js` createCategory function to save consistent image paths
  - Update updateCategory function to handle image path consistency
  - Ensure category image paths in database start with `/uploads/`
  - Update category service to return consistent image URLs
  - _Requirements: 5.1, 5.2_

- [x] 5. Update frontend FoodItem component to use standardized image URLs
  - Modify `frontend/src/components/FoodItem/FoodItem.jsx` to use SafeImage component
  - Replace current image URL logic with imageUtils.resolveImageUrl function
  - Add proper fallback image for food items
  - Test image loading with various URL formats
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6. Update frontend ExploreMenu component for category images
  - Modify `frontend/src/components/ExploreMenu/ExploreMenu.jsx` to use SafeImage component
  - Update category image URL resolution using imageUtils
  - Add proper fallback image for categories
  - Improve error handling for missing category images
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. Update admin List component for food images
  - Modify `admin/src/pages/List/List.jsx` to use SafeImage component
  - Replace hardcoded `/images/` path with standardized URL resolution
  - Add proper fallback image for food items in admin
  - Test image display in admin food list
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 8. Update admin CategoryCard component for category images
  - Modify `admin/src/components/CategoryManagement/CategoryCard.jsx` to use SafeImage component
  - Replace getImageUrl function with standardized imageUtils.resolveImageUrl
  - Add proper fallback image for categories in admin
  - Test image display in admin category management
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Add placeholder images to public directories
  - Add `frontend/public/placeholder-food.png` for food item fallbacks
  - Add `frontend/public/placeholder-category.png` for category fallbacks
  - Add `admin/public/placeholder-food.png` for admin food item fallbacks
  - Add `admin/public/placeholder-category.png` for admin category fallbacks
  - _Requirements: 1.3, 3.3, 6.2_

- [x] 10. Create database migration script for existing image URLs
  - Create `backend/scripts/migrateImageUrls.js` to fix existing image paths in database
  - Update all food items with inconsistent image paths to use `/uploads/` prefix
  - Update all categories with inconsistent image paths to use `/uploads/` prefix
  - Verify all migrated URLs point to existing files
  - _Requirements: 5.1, 5.2_

- [x] 11. Add image validation middleware
  - Create `backend/middleware/imageValidation.js` for upload validation
  - Add file type validation (jpg, png, gif, webp)
  - Add file size validation (max 5MB)
  - Add image dimension validation if needed
  - Integrate validation middleware into food and category routes
  - _Requirements: 5.2, 6.4_

- [x] 12. Update food and category routes to use image validation
  - Modify `backend/routes/foodRoute.js` to include image validation middleware
  - Modify `backend/routes/categoryRoute.js` to include image validation middleware
  - Test image upload with valid and invalid files
  - Ensure proper error messages for validation failures
  - _Requirements: 5.2, 6.4_

- [x] 13. Add comprehensive error logging for image operations
  - Update `backend/utils/logger.js` to include image-specific logging
  - Add logging for image upload, serving, and validation operations
  - Log missing image file requests for debugging
  - Add performance metrics for image operations
  - _Requirements: 6.4_

- [x] 14. Create integration tests for image functionality
  - Write tests for image upload workflow (frontend → backend → storage)
  - Write tests for image display in all components
  - Write tests for error handling with missing/corrupted images
  - Write tests for URL resolution utility functions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

- [x] 15. Optimize image serving performance
  - Add proper caching headers for image responses in backend
  - Implement image compression for uploaded files
  - Add lazy loading for images in frontend components
  - Test image loading performance with multiple images
  - _Requirements: 6.1, 6.3_