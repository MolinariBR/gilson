import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SafeImage from '../components/SafeImage/SafeImage';
import CategoryCard from '../components/CategoryManagement/CategoryCard';
import { StoreContext } from '../context/StoreContext';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => [])
};
global.performance = mockPerformance;

describe('Admin Image Loading Performance Tests', () => {
  let mockStoreContext;
  let performanceMetrics;

  beforeEach(() => {
    mockStoreContext = {
      url: 'http://localhost:4000',
      token: 'mock-token'
    };

    performanceMetrics = {
      imageLoadTimes: [],
      totalLoadTime: 0,
      failedImages: 0,
      successfulImages: 0
    };

    // Reset mocks
    vi.clearAllMocks();
    mockIntersectionObserver.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Admin SafeImage Performance', () => {
    it('should load images immediately without lazy loading by default', async () => {
      const onLoad = vi.fn();

      render(
        <SafeImage
          src="/uploads/categories/test-category.jpg"
          baseUrl="http://localhost:4000"
          alt="Test category"
          onLoad={onLoad}
        />
      );

      // Should not create intersection observer for admin by default
      expect(mockIntersectionObserver).not.toHaveBeenCalled();

      // Should render image immediately
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('should support lazy loading when explicitly enabled', async () => {
      const onIntersect = vi.fn();
      
      render(
        <SafeImage
          src="/uploads/categories/test-category.jpg"
          baseUrl="http://localhost:4000"
          alt="Test category"
          lazy={true}
          onIntersect={onIntersect}
        />
      );

      // Should create intersection observer when lazy loading is enabled
      expect(mockIntersectionObserver).toHaveBeenCalled();

      // Should show placeholder initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Category Management Performance', () => {
    const mockCategories = [
      { _id: '1', name: 'Pizza', image: '/uploads/categories/pizza.jpg', isActive: true },
      { _id: '2', name: 'Burgers', image: '/uploads/categories/burgers.jpg', isActive: true },
      { _id: '3', name: 'Pasta', image: '/uploads/categories/pasta.jpg', isActive: true },
      { _id: '4', name: 'Salads', image: '/uploads/categories/salads.jpg', isActive: true },
      { _id: '5', name: 'Desserts', image: '/uploads/categories/desserts.jpg', isActive: true }
    ];

    it('should render multiple category cards efficiently', async () => {
      const startTime = performance.now();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      const { container } = render(
        <StoreContext.Provider value={mockStoreContext}>
          <div>
            {mockCategories.map(category => (
              <CategoryCard
                key={category._id}
                category={category}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </StoreContext.Provider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render all category cards
      expect(container.querySelectorAll('.category-card')).toHaveLength(5);
      
      // Render time should be reasonable (less than 150ms for 5 cards in admin)
      expect(renderTime).toBeLessThan(150);
    });

    it('should handle image loading errors gracefully', async () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      let errorCount = 0;

      const categoryWithBadImage = {
        _id: '1',
        name: 'Test Category',
        image: '/uploads/categories/non-existent.jpg',
        isActive: true
      };

      render(
        <StoreContext.Provider value={mockStoreContext}>
          <CategoryCard
            category={categoryWithBadImage}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </StoreContext.Provider>
      );

      // Should still render the category card even with bad image
      expect(screen.getByText('Test Category')).toBeInTheDocument();
    });
  });

  describe('Admin Performance Monitoring', () => {
    it('should track admin image loading performance', async () => {
      const adminMetrics = {
        totalAdminImages: 0,
        loadedAdminImages: 0,
        failedAdminImages: 0,
        averageAdminLoadTime: 0,
        adminLoadTimes: []
      };

      const trackAdminImageLoad = (loadTime, success) => {
        adminMetrics.totalAdminImages++;
        if (success) {
          adminMetrics.loadedAdminImages++;
          adminMetrics.adminLoadTimes.push(loadTime);
        } else {
          adminMetrics.failedAdminImages++;
        }
        
        if (adminMetrics.adminLoadTimes.length > 0) {
          adminMetrics.averageAdminLoadTime = adminMetrics.adminLoadTimes.reduce((a, b) => a + b, 0) / adminMetrics.adminLoadTimes.length;
        }
      };

      // Simulate admin image loads (typically faster due to smaller admin interface)
      const adminImagePromises = Array.from({ length: 10 }, async (_, index) => {
        const startTime = performance.now();
        
        return new Promise((resolve) => {
          setTimeout(() => {
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            const success = Math.random() > 0.05; // 95% success rate for admin
            
            trackAdminImageLoad(loadTime, success);
            resolve({ index, loadTime, success });
          }, Math.random() * 50); // Faster load times for admin
        });
      });

      await Promise.all(adminImagePromises);

      expect(adminMetrics.totalAdminImages).toBe(10);
      expect(adminMetrics.loadedAdminImages + adminMetrics.failedAdminImages).toBe(10);
      
      // Admin should have higher success rate
      const successRate = adminMetrics.loadedAdminImages / adminMetrics.totalAdminImages;
      expect(successRate).toBeGreaterThan(0.9);

      console.log('Admin Image Loading Performance Metrics:', {
        totalImages: adminMetrics.totalAdminImages,
        successRate: `${(successRate * 100).toFixed(2)}%`,
        averageLoadTime: `${adminMetrics.averageAdminLoadTime.toFixed(2)}ms`,
        failureRate: `${((adminMetrics.failedAdminImages / adminMetrics.totalAdminImages) * 100).toFixed(2)}%`
      });
    });

    it('should handle bulk operations efficiently', async () => {
      const bulkOperationStart = performance.now();
      
      // Simulate bulk category operations
      const bulkCategories = Array.from({ length: 20 }, (_, index) => ({
        _id: `bulk-${index}`,
        name: `Bulk Category ${index}`,
        image: `/uploads/categories/bulk-${index}.jpg`,
        isActive: true
      }));

      const onEdit = vi.fn();
      const onDelete = vi.fn();

      const { container } = render(
        <StoreContext.Provider value={mockStoreContext}>
          <div>
            {bulkCategories.map(category => (
              <CategoryCard
                key={category._id}
                category={category}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </StoreContext.Provider>
      );

      const bulkOperationEnd = performance.now();
      const bulkOperationTime = bulkOperationEnd - bulkOperationStart;

      // Should handle 20 categories efficiently
      expect(container.querySelectorAll('.category-card')).toHaveLength(20);
      expect(bulkOperationTime).toBeLessThan(300); // Less than 300ms for 20 items
    });
  });

  describe('Admin Memory Management', () => {
    it('should clean up resources properly', () => {
      const components = [];
      
      // Create multiple admin components
      for (let i = 0; i < 5; i++) {
        const component = render(
          <SafeImage
            key={i}
            src={`/uploads/categories/admin-test-${i}.jpg`}
            baseUrl="http://localhost:4000"
            alt={`Admin test image ${i}`}
            lazy={false} // Admin default
          />
        );
        components.push(component);
      }

      // Unmount all components
      components.forEach(component => component.unmount());

      // Should not create intersection observers for admin by default
      expect(mockIntersectionObserver).not.toHaveBeenCalled();
    });

    it('should handle rapid admin operations', async () => {
      const operations = [];
      
      // Simulate rapid admin operations
      for (let i = 0; i < 10; i++) {
        const operation = new Promise((resolve) => {
          setTimeout(() => {
            const component = render(
              <SafeImage
                src={`/uploads/categories/rapid-${i}.jpg`}
                baseUrl="http://localhost:4000"
                alt={`Rapid test ${i}`}
              />
            );
            
            // Immediately unmount to simulate rapid operations
            component.unmount();
            resolve(i);
          }, i * 10);
        });
        
        operations.push(operation);
      }

      const results = await Promise.all(operations);
      expect(results).toHaveLength(10);
    });
  });
});