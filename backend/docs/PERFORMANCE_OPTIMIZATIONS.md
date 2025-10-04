# Category Performance Optimizations

This document describes the performance optimizations implemented for the dynamic categories management system.

## Overview

The performance optimizations include:
1. **In-memory caching system** for frequently accessed categories
2. **Database indexes** for optimized query performance
3. **Image optimization** for category images
4. **Performance monitoring** and metrics collection
5. **Query optimization** with lean queries and field projection

## Caching System

### Features
- **In-memory cache** with configurable TTL (Time To Live)
- **LRU eviction** when cache reaches maximum size
- **Automatic cache invalidation** on data changes
- **Cache statistics** and monitoring

### Configuration
Environment variables for cache configuration:
```bash
CATEGORY_CACHE_TTL=3600000        # Cache TTL in milliseconds (1 hour)
CATEGORY_CACHE_MAX_SIZE=100       # Maximum cache entries
```

### Cache Keys
- `all_active_categories` - All active categories
- `all_categories` - All categories (including inactive)
- `category_by_id_{id}` - Individual category by ID
- `category_by_slug_{slug}` - Individual category by slug

### Usage
```javascript
const categoryService = new CategoryService();

// These calls will be cached automatically
const activeCategories = await categoryService.getAllCategories(false);
const category = await categoryService.getCategoryById(categoryId);
const categoryBySlug = await categoryService.getCategoryBySlug('pizza');

// Cache statistics
const stats = categoryService.getCacheStats();
console.log('Cache size:', stats.size);
console.log('Cache hit rate:', stats.hitRate);
```

## Database Indexes

### Implemented Indexes
1. **Single field indexes:**
   - `slug` (unique) - For slug-based lookups
   - `name` - For name searches
   - `originalName` - For original name searches
   - `isActive` - For filtering active/inactive categories
   - `order` - For sorting by display order
   - `createdAt` (descending) - For sorting by creation date
   - `updatedAt` (descending) - For sorting by update date

2. **Compound indexes:**
   - `{isActive: 1, order: 1}` - Active categories sorted by order
   - `{isActive: 1, createdAt: -1}` - Active categories by creation date
   - `{isActive: 1, name: 1}` - Active categories by name

3. **Text index:**
   - `{name: 'text', originalName: 'text'}` - Full-text search

### Setup
Run the index setup script:
```bash
node scripts/setupCategoryIndexes.js
```

## Image Optimization

### Features
- **Automatic image optimization** during upload
- **Format validation** (PNG, JPG, JPEG, WebP)
- **Size optimization** with configurable dimensions
- **Compression** with quality settings
- **WebP conversion** support (placeholder implementation)

### Configuration
```bash
CATEGORY_IMAGE_MAX_WIDTH=400      # Maximum image width
CATEGORY_IMAGE_MAX_HEIGHT=400     # Maximum image height
CATEGORY_IMAGE_QUALITY=85         # JPEG quality (0-100)
```

### Usage
```javascript
const categoryService = new CategoryService();

// Image optimization happens automatically during upload
const result = await categoryService.uploadCategoryImage(imageFile);
console.log('Optimization info:', result.optimization);
```

## Performance Monitoring

### Middleware
The system includes performance monitoring middleware:
- **Response time tracking**
- **Cache hit/miss tracking**
- **Slow query detection**
- **Rate limiting**
- **Security headers**

### Metrics Collection
```javascript
import { performanceMonitor } from '../middleware/categoryPerformance.js';

// Get performance statistics
const stats = performanceMonitor.getStats();
console.log('Total requests:', stats.totalRequests);
console.log('Cache hit rate:', stats.cacheHitRate);
console.log('Average response time:', stats.averageResponseTime);
console.log('Slow query rate:', stats.slowQueryRate);
```

### Performance Endpoints
Admin-only endpoints for performance management:
- `GET /api/admin/categories/performance/stats` - Get performance statistics
- `POST /api/admin/categories/performance/warmup` - Warm up cache
- `DELETE /api/admin/categories/performance/cache` - Clear cache
- `DELETE /api/admin/categories/performance/cleanup-images` - Clean up old optimized images

## Query Optimization

### Lean Queries
All read operations use `lean()` queries for better performance:
```javascript
const categories = await categoryModel
  .find(filter)
  .select('name originalName slug image isActive order createdAt updatedAt')
  .sort({ order: 1, createdAt: 1 })
  .lean(); // Returns plain objects instead of Mongoose documents
```

### Field Projection
Only necessary fields are selected to reduce data transfer:
```javascript
.select('name originalName slug image isActive order createdAt updatedAt')
```

## Cache Management

### Automatic Cache Invalidation
Cache is automatically cleared when:
- Creating a new category
- Updating an existing category
- Deleting a category

### Manual Cache Management
```javascript
const categoryService = new CategoryService();

// Clear all cache
categoryService.clearCache();

// Clear specific cache entry
categoryService.clearCache('specific_cache_key');

// Warm up cache
await categoryService.warmupCache();

// Get cache statistics
const stats = categoryService.getCacheStats();
```

## Performance Best Practices

### 1. Use Appropriate Cache TTL
- Set cache TTL based on data update frequency
- Shorter TTL for frequently changing data
- Longer TTL for stable reference data

### 2. Monitor Cache Hit Rates
- Aim for >80% cache hit rate for read operations
- Monitor cache size and eviction patterns
- Adjust cache size based on memory constraints

### 3. Database Query Optimization
- Use compound indexes for common query patterns
- Avoid full collection scans
- Use field projection to reduce data transfer

### 4. Image Optimization
- Optimize images during upload, not on-demand
- Use appropriate image formats (WebP for modern browsers)
- Implement progressive loading for large images

### 5. Performance Monitoring
- Monitor response times and set alerts for slow queries
- Track cache performance metrics
- Use performance middleware for all routes

## Testing

Run performance tests:
```bash
npm test categoryPerformance.test.js
```

The test suite covers:
- Cache functionality and TTL
- Database query optimization
- Performance monitoring
- Memory management (LRU eviction)
- Cache invalidation

## Troubleshooting

### High Memory Usage
- Check cache size and reduce `CATEGORY_CACHE_MAX_SIZE`
- Monitor for memory leaks in cache implementation
- Consider using external cache (Redis) for high-traffic applications

### Slow Queries
- Check database indexes are properly created
- Monitor query execution plans
- Use the slow query logging middleware

### Low Cache Hit Rate
- Increase cache TTL if data doesn't change frequently
- Check cache invalidation patterns
- Monitor cache eviction due to size limits

### Image Upload Issues
- Check file permissions on upload directory
- Monitor disk space for image storage
- Verify image optimization settings

## Future Enhancements

1. **Redis Integration** - External cache for distributed systems
2. **CDN Integration** - Content delivery network for images
3. **Advanced Image Processing** - Sharp library integration for better optimization
4. **Query Result Pagination** - For large category lists
5. **Background Cache Warming** - Scheduled cache preloading
6. **Performance Analytics** - Detailed performance dashboards