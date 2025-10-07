import React, { useState, useEffect, useRef } from 'react';
import { resolveImageUrl } from '../../utils/imageUtils';

/**
 * SafeImage component with error handling, fallback support, and lazy loading
 * @param {Object} props - Component props
 * @param {string} props.src - Image source path
 * @param {string} props.baseUrl - Base URL for resolving relative paths
 * @param {string} props.fallback - Fallback image path (default: '/placeholder-food.png')
 * @param {string} props.alt - Alt text for the image
 * @param {string} props.className - CSS class name
 * @param {Object} props.style - Inline styles
 * @param {boolean} props.lazy - Enable lazy loading (default: false for admin)
 * @param {string} props.rootMargin - Intersection observer root margin (default: '50px')
 * @param {number} props.threshold - Intersection observer threshold (default: 0.1)
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
  rootMargin = '50px',
  threshold = 0.1,
  onLoad,
  onError,
  onIntersect,
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isIntersecting, setIsIntersecting] = useState(!lazy);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

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

  // Image source resolution
  useEffect(() => {
    if (!isIntersecting) return;

    setHasError(false);
    setIsLoading(true);
    
    if (src && baseUrl) {
      const resolvedUrl = resolveImageUrl(src, baseUrl);
      setImageSrc(resolvedUrl);
    } else if (src && src.startsWith('http')) {
      // Handle absolute URLs
      setImageSrc(src);
    } else {
      // No valid source, use fallback
      setImageSrc(fallback);
      setIsLoading(false);
    }
  }, [src, baseUrl, fallback, isIntersecting]);

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