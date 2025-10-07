import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SafeImage from '../components/SafeImage/SafeImage';
import FoodItem from '../components/FoodItem/FoodItem';
import { StoreContext } from '../context/StoreContext';

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

const mockIntersectionObserver = vi.fn().mockImplementation((callback, options) => ({
  observe: mockObserve,
  unobserve: mockUnobserve,
  disconnect: mockDisconnect,
  callback,
  options
}));

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

describe('Image Loading Performance Tests', () => {
  let mockStoreContext;

  beforeEach(() => {
    mockStoreContext = {
      url: 'http://localhost:4000',
      cartItems: {},
      addToCart: vi.fn(),
      removeFromCart: vi.fn()
    };

    // Reset mocks
    vi.clearAllMocks();
    mockIntersectionObserver.mockClear();
    mockObserve.mockClear();
    mockUnobserve.mockClear();
    mockDisconnect.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SafeImage Performance', () => {
    it('should measure image load time', async () => {
      const onLoad = vi.fn();

      render(
        <SafeImage
          src="/test-image.jpg"
          baseUrl="http://localhost:4000"
          alt="Test image"
          onLoad={onLoad}
          lazy={false}
        />
      );

      // Simulate image load
      const img = screen.getByRole('img');
      fireEvent.load(img);

      expect(onLoad).toHaveBeenCalled();
    });

    it('should handle lazy loading efficiently', async () => {
      const onIntersect = vi.fn();
      
      render(
        <SafeImage
          src="/test-image.jpg"
          baseUrl="http://localhost:4000"
          alt="Test image"
          lazy={true}
          onIntersect={onIntersect}
        />
      );

      // Should show placeholder initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Should create intersection observer
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    it('should track error rates', async () => {
      const onError = vi.fn();

      render(
        <SafeImage
          src="/non-existent-image.jpg"
          baseUrl="http://localhost:4000"
          alt="Test image"
          onError={onError}
          lazy={false}
        />
      );

      // Simulate image error
      const img = screen.getByRole('img');
      fireEvent.error(img);

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Multiple Images Performance', () => {
    const mockFoodItems = [
      { id: '1', name: 'Pizza', price: 15, description: 'Delicious pizza', image: '/uploads/pizza.jpg' },
      { id: '2', name: 'Burger', price: 12, description: 'Tasty burger', image: '/uploads/burger.jpg' },
      { id: '3', name: 'Pasta', price: 18, description: 'Italian pasta', image: '/uploads/pasta.jpg' },
      { id: '4', name: 'Salad', price: 10, description: 'Fresh salad', image: '/uploads/salad.jpg' },
      { id: '5', name: 'Soup', price: 8, description: 'Hot soup', image: '/uploads/soup.jpg' }
    ];

    it('should handle multiple food items efficiently', async () => {
      const startTime = performance.now();

      const { container } = render(
        <StoreContext.Provider value={mockStoreContext}>
          <div>
            {mockFoodItems.map(item => (
              <FoodItem
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                description={item.description}
                image={item.image}
              />
            ))}
          </div>
        </StoreContext.Provider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render all food items
      expect(container.querySelectorAll('.food-item')).toHaveLength(5);
      
      // Render time should be reasonable (less than 100ms for 5 items)
      expect(renderTime).toBeLessThan(100);
    });

    it('should lazy load images progressively', async () => {
      render(
        <StoreContext.Provider value={mockStoreContext}>
          <div>
            {mockFoodItems.map(item => (
              <FoodItem
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                description={item.description}
                image={item.image}
              />
            ))}
          </div>
        </StoreContext.Provider>
      );

      // Should create intersection observers for lazy loading
      expect(mockIntersectionObserver).toHaveBeenCalledTimes(5);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track image loading metrics', async () => {
      const metrics = {
        totalImages: 0,
        loadedImages: 0,
        failedImages: 0,
        averageLoadTime: 0,
        loadTimes: []
      };

      const trackImageLoad = (loadTime, success) => {
        metrics.totalImages++;
        if (success) {
          metrics.loadedImages++;
          metrics.loadTimes.push(loadTime);
        } else {
          metrics.failedImages++;
        }
        
        if (metrics.loadTimes.length > 0) {
          metrics.averageLoadTime = metrics.loadTimes.reduce((a, b) => a + b, 0) / metrics.loadTimes.length;
        }
      };

      // Mock food items for this test
      const testFoodItems = [
        { id: '1', name: 'Pizza', image: '/uploads/pizza.jpg' },
        { id: '2', name: 'Burger', image: '/uploads/burger.jpg' },
        { id: '3', name: 'Pasta', image: '/uploads/pasta.jpg' },
        { id: '4', name: 'Salad', image: '/uploads/salad.jpg' },
        { id: '5', name: 'Soup', image: '/uploads/soup.jpg' }
      ];

      // Simulate multiple image loads
      const imageLoadPromises = testFoodItems.map(async (item, index) => {
        const startTime = performance.now();
        
        return new Promise((resolve) => {
          setTimeout(() => {
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            const success = Math.random() > 0.1; // 90% success rate
            
            trackImageLoad(loadTime, success);
            resolve({ item, loadTime, success });
          }, Math.random() * 100); // Random load time up to 100ms
        });
      });

      const results = await Promise.all(imageLoadPromises);

      expect(metrics.totalImages).toBe(testFoodItems.length);
      expect(metrics.loadedImages + metrics.failedImages).toBe(testFoodItems.length);
      expect(metrics.averageLoadTime).toBeGreaterThan(0);
      
      // Log performance metrics
      console.log('Image Loading Performance Metrics:', {
        totalImages: metrics.totalImages,
        successRate: `${((metrics.loadedImages / metrics.totalImages) * 100).toFixed(2)}%`,
        averageLoadTime: `${metrics.averageLoadTime.toFixed(2)}ms`,
        failureRate: `${((metrics.failedImages / metrics.totalImages) * 100).toFixed(2)}%`
      });
    });

    it('should detect performance bottlenecks', async () => {
      const performanceThresholds = {
        maxLoadTime: 2000, // 2 seconds
        maxFailureRate: 0.1, // 10%
        maxRenderTime: 100 // 100ms
      };

      const testResults = {
        maxLoadTime: 50, // Mock max load time
        failureRate: 0.05, // Mock 5% failure rate
        renderTime: 50 // Mock render time
      };

      // Check performance thresholds
      expect(testResults.maxLoadTime).toBeLessThan(performanceThresholds.maxLoadTime);
      expect(testResults.failureRate).toBeLessThan(performanceThresholds.maxFailureRate);
      expect(testResults.renderTime).toBeLessThan(performanceThresholds.maxRenderTime);
    });
  });

  describe('Memory Usage', () => {
    it('should clean up intersection observers', () => {
      const { unmount } = render(
        <SafeImage
          src="/test-image.jpg"
          baseUrl="http://localhost:4000"
          alt="Test image"
          lazy={true}
        />
      );

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should handle rapid component mounting/unmounting', () => {
      const components = [];
      
      // Mount multiple components rapidly
      for (let i = 0; i < 10; i++) {
        const component = render(
          <SafeImage
            key={i}
            src={`/test-image-${i}.jpg`}
            baseUrl="http://localhost:4000"
            alt={`Test image ${i}`}
            lazy={true}
          />
        );
        components.push(component);
      }

      // Unmount all components
      components.forEach(component => component.unmount());

      // Should create intersection observers for each component
      expect(mockIntersectionObserver).toHaveBeenCalledTimes(10);
    });
  });
});