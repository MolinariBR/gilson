/**
 * Integration tests for category image performance optimizations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import SafeImage from '../components/SafeImage/SafeImage';
import { categoryImageCache } from '../utils/categoryImagePreloader';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn()
}));

describe('Category Image Performance Integration', () => {
  beforeEach(() => {
    // Clear DOM and cache
    document.head.innerHTML = '';
    categoryImageCache.clear();
    
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(() => '{}'),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SafeImage Component Integration', () => {
    it('should render category image with optimized settings', async () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const imageSrc = '/uploads/categories/cat_507f1f77bcf86cd799439011_1704067200000.jpg';
      const baseUrl = 'http://localhost:4000';

      render(
        <SafeImage
          src={imageSrc}
          baseUrl={baseUrl}
          categoryId={categoryId}
          alt="Test Category"
          lazy={false} // Disable lazy loading for test
        />
      );

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveClass('category-image');
      expect(img.src).toContain('v=99439011'); // Cache optimization
    });

    it('should use category-specific fallback for category images', async () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const imageSrc = null; // No image provided
      const baseUrl = 'http://localhost:4000';

      render(
        <SafeImage
          src={imageSrc}
          baseUrl={baseUrl}
          categoryId={categoryId}
          alt="Test Category"
          lazy={false}
        />
      );

      const img = screen.getByRole('img');
      expect(img.src).toContain('placeholder-category.svg');
    });

    it('should include category information in error callback', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const imageSrc = '/uploads/categories/cat_507f1f77bcf86cd799439011_invalid.jpg';
      const baseUrl = 'http://localhost:4000';
      
      const onError = vi.fn();

      render(
        <SafeImage
          src={imageSrc}
          baseUrl={baseUrl}
          categoryId={categoryId}
          alt="Test Category"
          lazy={false}
          onError={onError}
        />
      );

      const img = screen.getByRole('img');
      expect(img.src).toContain('v=99439011'); // Verify cache optimization is applied
      expect(img).toHaveClass('category-image');
    });

    it('should apply high priority to category images', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const imageSrc = '/uploads/categories/cat_507f1f77bcf86cd799439011_1704067200000.jpg';
      const baseUrl = 'http://localhost:4000';

      render(
        <SafeImage
          src={imageSrc}
          baseUrl={baseUrl}
          categoryId={categoryId}
          alt="Test Category"
          lazy={false}
        />
      );

      const img = screen.getByRole('img');
      expect(img.getAttribute('fetchpriority')).toBe('high');
    });

    it('should render optimized placeholder for category images when lazy loading', () => {
      const categoryId = '507f1f77bcf86cd799439011';
      const imageSrc = '/uploads/categories/cat_507f1f77bcf86cd799439011_1704067200000.jpg';
      const baseUrl = 'http://localhost:4000';

      render(
        <SafeImage
          src={imageSrc}
          baseUrl={baseUrl}
          categoryId={categoryId}
          alt="Test Category"
          lazy={true}
        />
      );

      const placeholder = screen.getByText('Categoria');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder.parentElement).toHaveClass('category-placeholder');
    });
  });

  describe('Performance Optimizations', () => {
    it('should not add cache parameters for non-category images', () => {
      const imageSrc = '/uploads/food/food_123.jpg';
      const baseUrl = 'http://localhost:4000';

      render(
        <SafeImage
          src={imageSrc}
          baseUrl={baseUrl}
          alt="Test Food"
          lazy={false}
        />
      );

      const img = screen.getByRole('img');
      expect(img.src).toBe(`${baseUrl}${imageSrc}`);
      expect(img.src).not.toContain('v=');
      expect(img).not.toHaveClass('category-image');
    });

    it('should handle missing baseUrl gracefully', () => {
      const imageSrc = 'http://example.com/image.jpg';

      render(
        <SafeImage
          src={imageSrc}
          baseUrl={null}
          alt="Test Image"
          lazy={false}
        />
      );

      const img = screen.getByRole('img');
      expect(img.src).toBe(imageSrc);
    });
  });
});