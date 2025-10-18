import React, { useState, useEffect, useRef } from 'react';
import { 
  resolveImageUrl, 
  isCategoryImage, 
  getCategoryLazyLoadConfig,
  getCacheOptimizedImageUrl 
} from '../../utils/imageUtils';

/**
 * SafeImage component with error handling, fallback support, and optimized lazy loading
 * @param {Object} props - Component props
 * @param {string} props.src - Image source path
 * @param {string} props.baseUrl - Base URL for resolving relative paths
 * @param {string} props.fallback - Fallback image path (default: '/placeholder-food.png')
 * @param {string} props.alt - Alt text for the image
 * @param {string} props.className - CSS class name
 * @param {Object} props.style - Inline styles
 * @param {boolean} props.lazy - Enable lazy loading (default: false for admin)
 * @param {string} props.rootMargin - Intersection observer root margin (auto-optimized for categories)
 * @param {number} props.threshold - Intersection observer threshold (auto-optimized for categories)
 * @param {string} props.categoryId - Category ID for cache optimization
 * @param {string} props.priority - Loading priority ('high', 'normal', 'low')
 * @param {Function} props.onLoad - Callback when image loads successfully
 * @param {Function} props.onError - Callback when image fails to load
 * @param {Function} props.onIntersect - Callback when image enters viewport
 * @param {Object} ...props - Additional props to pass to img element
 */
const SafeImage = ({ 
  src, 
  baseUrl, 
  fallback = '/placeholder-food.png', 
  alt = 'Image', 
  className = '', 
  style = {},
  lazy = false, // Default to false for admin interface
  rootMargin,
  threshold,
  categoryId,
  priority,
  onLoad,
  onError,
  onIntersect,
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isIntersecting, setIsIntersecting] = useState(!lazy);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Determine if this is a category image and get optimized config
  const isCategory = isCategoryImage(src);
  const lazyConfig = getCategoryLazyLoadConfig(isCategory);
  
  // Use optimized settings or provided props (admin interface gets less aggressive lazy loading)
  const effectiveRootMargin = rootMargin || (lazy ? lazyConfig.rootMargin : '10px');
  const effectiveThreshold = threshold || (lazy ? lazyConfig.threshold : 0.5);
  const effectivePriority = priority || (isCategory ? 'high' : 'normal');

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (onIntersect) {
            onIntersect(entry);
          }
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(imgRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy, rootMargin, threshold, onIntersect]);

  // Image source resolution with cache optimization
  useEffect(() => {
    if (!isIntersecting) return;

    setHasError(false);
    setIsLoading(true);
    setRetryCount(0);
    
    if (src && src.startsWith('http')) {
      // Handle absolute URLs - use directly without baseUrl
      setImageSrc(src);
    } else if (src && baseUrl) {
      // Handle relative URLs with cache optimization for categories
      const resolvedUrl = isCategory && categoryId 
        ? getCacheOptimizedImageUrl(src, baseUrl, categoryId)
        : resolveImageUrl(src, baseUrl);
      setImageSrc(resolvedUrl);
    } else {
      // No valid source, use category-specific fallback
      let categoryFallback = isCategory ? '/placeholder-category.svg' : fallback;
      // Garante que não haja barras duplicadas
      if (categoryFallback.startsWith('/')) {
        categoryFallback = (baseUrl ? baseUrl : '') + categoryFallback;
      }
      setImageSrc(categoryFallback);
      setIsLoading(false);
    }
  }, [src, baseUrl, fallback, isIntersecting, isCategory, categoryId]);

  const handleLoad = (event) => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) {
      onLoad(event);
    }
  };

  const handleError = (event) => {
    setIsLoading(false);
    
    if (!hasError) {
      setHasError(true);
      setImageSrc(fallback);
      
      if (onError) {
        onError(event);
      }
    }
  };

  // Render placeholder or image based on intersection and loading state
  if (!isIntersecting) {
    // Show placeholder while not in viewport
    return (
      <div
        ref={imgRef}
        className={`safe-image-placeholder ${className}`}
        style={{
          ...style,
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100px'
        }}
        {...props}
      >
        <span style={{ color: '#999', fontSize: '12px' }}>Loading...</span>
      </div>
    );
  }

  // Don't render anything if no image source is available
  if (!imageSrc) {
    return null;
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`safe-image ${isLoading ? 'loading' : ''} ${hasError ? 'error' : ''} ${className}`}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
      loading={lazy ? 'lazy' : 'eager'}
      {...props}
    />
  );
};

export default SafeImage;