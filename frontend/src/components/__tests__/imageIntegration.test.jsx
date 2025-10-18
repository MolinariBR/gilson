import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import SafeImage from '../SafeImage/SafeImage';
import FoodItem from '../FoodItem/FoodItem';
import ExploreMenu from '../ExploreMenu/ExploreMenu';
import { StoreContext } from '../../context/StoreContext';

// Mock the image utils
vi.mock('../../utils/imageUtils', () => ({
  resolveImageUrl: vi.fn((imagePath, baseUrl) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return baseUrl + imagePath;
    return baseUrl + '/uploads/' + imagePath;
  }),
  getImageWithFallback: vi.fn((imagePath, baseUrl, fallback = '/placeholder-food.png') => {
    if (!imagePath) return baseUrl + fallback;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return baseUrl + imagePath;
    return baseUrl + '/uploads/' + imagePath;
  })
}));

describe('Frontend Image Integration Tests', () => {
  const mockStoreContext = {
    url: 'http://localhost:4000',
    cartItems: {},
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    getTotalCartAmount: vi.fn(() => 0),
    food_list: [
      {
        _id: '1',
        name: 'Test Food 1',
        price: 10.99,
        description: 'Test Description 1',
        category: 'Test Category',
        image: '/uploads/food1.jpg'
      },
      {
        _id: '2',
        name: 'Test Food 2',
        price: 15.99,
        description: 'Test Description 2',
        category: 'Test Category',
        image: 'food2.jpg' // Relative path
      },
      {
        _id: '3',
        name: 'Test Food 3',
        price: 20.99,
        description: 'Test Description 3',
        category: 'Test Category',
        image: null // Missing image
      }
    ],
    category_list: [
      {
        _id: '1',
        name: 'Test Category 1',
  image: '/uploads/cat1.jpg'
      },
      {
        _id: '2',
        name: 'Test Category 2',
        image: 'categories/cat2.jpg' // Relative path
      },
      {
        _id: '3',
        name: 'Test Category 3',
        image: null // Missing image
      }
    ]
  };

  const renderWithContext = (component) => {
    return render(
      <StoreContext.Provider value={mockStoreContext}>
        {component}
      </StoreContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Image constructor to simulate image loading
    global.Image = class {
      constructor() {
        setTimeout(() => {
          this.onload && this.onload();
        }, 100);
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SafeImage Component Integration', () => {
    it('should display image with correct resolved URL', async () => {
      const { container } = render(
        <SafeImage
          src="/uploads/test-image.jpg"
          baseUrl="http://localhost:4000"
          alt="Test Image"
          data-testid="safe-image"
        />
      );

      await waitFor(() => {
        const img = container.querySelector('img');
        expect(img).toBeTruthy();
        expect(img.src).toBe('http://localhost:4000/uploads/test-image.jpg');
        expect(img.alt).toBe('Test Image');
      });
    });

    it('should handle image load error and show fallback', async () => {
      const onError = vi.fn();
      
      render(
        <SafeImage
          src="/uploads/nonexistent-image.jpg"
          baseUrl="http://localhost:4000"
          fallback="/placeholder-food.png"
          alt="Test Image"
          onError={onError}
          data-testid="safe-image"
        />
      );

      const img = screen.getByTestId('safe-image');
      
      // Simulate image load error
      await act(async () => {
        fireEvent.error(img);
      });

      await waitFor(() => {
        expect(img.src).toBe('http://localhost:4000/placeholder-food.png');
        expect(img.className).toContain('error');
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should handle relative image paths correctly', async () => {
      const { container } = render(
        <SafeImage
          src="food/test-image.jpg"
          baseUrl="http://localhost:4000"
          alt="Test Image"
        />
      );

      await waitFor(() => {
        const img = container.querySelector('img');
        expect(img.src).toBe('http://localhost:4000/uploads/food/test-image.jpg');
      });
    });

    it('should handle absolute URLs correctly', async () => {
      const { container } = render(
        <SafeImage
          src="https://example.com/image.jpg"
          baseUrl="http://localhost:4000"
          alt="Test Image"
        />
      );

      await waitFor(() => {
        const img = container.querySelector('img');
        expect(img.src).toBe('https://example.com/image.jpg');
      });
    });

    it('should show fallback for null/empty src', async () => {
      const { container } = render(
        <SafeImage
          src={null}
          baseUrl="http://localhost:4000"
          fallback="/placeholder-food.png"
          alt="Test Image"
        />
      );

      await waitFor(() => {
        const img = container.querySelector('img');
        expect(img.src).toBe('http://localhost:4000/placeholder-food.png');
      });
    });
  });

  describe('FoodItem Component Integration', () => {
    it('should display food item with correct image URL', async () => {
      const foodItem = mockStoreContext.food_list[0];
      
      renderWithContext(
        <FoodItem
          id={foodItem._id}
          name={foodItem.name}
          price={foodItem.price}
          description={foodItem.description}
          image={foodItem.image}
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText(foodItem.name);
        expect(img).toBeTruthy();
        expect(img.src).toBe('http://localhost:4000/uploads/food1.jpg');
      });
    });

    it('should handle food item with relative image path', async () => {
      const foodItem = mockStoreContext.food_list[1];
      
      renderWithContext(
        <FoodItem
          id={foodItem._id}
          name={foodItem.name}
          price={foodItem.price}
          description={foodItem.description}
          image={foodItem.image}
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText(foodItem.name);
        expect(img.src).toBe('http://localhost:4000/uploads/food2.jpg');
      });
    });

    it('should handle food item with missing image', async () => {
      const foodItem = mockStoreContext.food_list[2];
      
      renderWithContext(
        <FoodItem
          id={foodItem._id}
          name={foodItem.name}
          price={foodItem.price}
          description={foodItem.description}
          image={foodItem.image}
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText(foodItem.name);
        expect(img.src).toBe('http://localhost:4000/placeholder-food.png');
      });
    });

    it('should handle image load error in food item', async () => {
      const foodItem = mockStoreContext.food_list[0];
      
      renderWithContext(
        <FoodItem
          id={foodItem._id}
          name={foodItem.name}
          price={foodItem.price}
          description={foodItem.description}
          image={foodItem.image}
        />
      );

      const img = screen.getByAltText(foodItem.name);
      
      // Simulate image load error
      await act(async () => {
        fireEvent.error(img);
      });

      await waitFor(() => {
        expect(img.src).toBe('http://localhost:4000/placeholder-food.png');
      });
    });

    it('should add item to cart when add button is clicked', async () => {
      const foodItem = mockStoreContext.food_list[0];
      
      renderWithContext(
        <FoodItem
          id={foodItem._id}
          name={foodItem.name}
          price={foodItem.price}
          description={foodItem.description}
          image={foodItem.image}
        />
      );

      const addButton = screen.getByRole('button');
      fireEvent.click(addButton);

      expect(mockStoreContext.addToCart).toHaveBeenCalledWith(foodItem._id);
    });
  });

  describe('ExploreMenu Component Integration', () => {
    it('should display category images correctly', async () => {
      renderWithContext(
        <ExploreMenu category="All" setCategory={vi.fn()} />
      );

      await waitFor(() => {
        const categoryImages = screen.getAllByRole('img');
        expect(categoryImages.length).toBeGreaterThan(0);
        
        // Check first category image
        const firstCategoryImg = categoryImages.find(img => 
          img.src.includes('cat1.jpg')
        );
        expect(firstCategoryImg).toBeTruthy();
  expect(firstCategoryImg.src).toBe('http://localhost:4000/uploads/cat1.jpg');
      });
    });

    it('should handle category with relative image path', async () => {
      renderWithContext(
        <ExploreMenu category="All" setCategory={vi.fn()} />
      );

      await waitFor(() => {
        const categoryImages = screen.getAllByRole('img');
        const secondCategoryImg = categoryImages.find(img => 
          img.src.includes('cat2.jpg')
        );
        expect(secondCategoryImg).toBeTruthy();
  expect(secondCategoryImg.src).toBe('http://localhost:4000/uploads/cat2.jpg');
      });
    });

    it('should handle category with missing image', async () => {
      renderWithContext(
        <ExploreMenu category="All" setCategory={vi.fn()} />
      );

      await waitFor(() => {
        const placeholderImages = screen.getAllByRole('img').filter(img => 
          img.src.includes('placeholder-category.png')
        );
        expect(placeholderImages.length).toBeGreaterThan(0);
      });
    });

    it('should update category selection when category is clicked', async () => {
      const setCategory = vi.fn();
      
      renderWithContext(
        <ExploreMenu category="All" setCategory={setCategory} />
      );

      await waitFor(() => {
        const categoryItems = screen.getAllByRole('button');
        if (categoryItems.length > 0) {
          fireEvent.click(categoryItems[0]);
          expect(setCategory).toHaveBeenCalled();
        }
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      // Mock fetch to simulate network error
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      render(
        <SafeImage
          src="/uploads/test-image.jpg"
          baseUrl="http://localhost:4000"
          fallback="/placeholder-food.png"
          alt="Test Image"
        />
      );

      // The component should still render with fallback
      await waitFor(() => {
        const img = screen.getByAltText('Test Image');
        expect(img).toBeTruthy();
      });
    });

    it('should handle corrupted image data', async () => {
      render(
        <SafeImage
          src="/uploads/corrupted-image.jpg"
          baseUrl="http://localhost:4000"
          fallback="/placeholder-food.png"
          alt="Test Image"
        />
      );

      const img = screen.getByAltText('Test Image');
      
      // Simulate corrupted image error
      await act(async () => {
        fireEvent.error(img);
      });

      await waitFor(() => {
        expect(img.src).toBe('http://localhost:4000/placeholder-food.png');
      });
    });

    it('should handle multiple consecutive errors', async () => {
      const onError = vi.fn();
      
      render(
        <SafeImage
          src="/uploads/test-image.jpg"
          baseUrl="http://localhost:4000"
          fallback="/placeholder-food.png"
          alt="Test Image"
          onError={onError}
        />
      );

      const img = screen.getByAltText('Test Image');
      
      // Simulate multiple errors
      await act(async () => {
        fireEvent.error(img);
        fireEvent.error(img);
        fireEvent.error(img);
      });

      // Should only call onError once to prevent infinite loops
      expect(onError).toHaveBeenCalledTimes(1);
      expect(img.src).toBe('http://localhost:4000/placeholder-food.png');
    });
  });

  describe('Performance Integration', () => {
    it('should not cause memory leaks with rapid image changes', async () => {
      const { rerender } = render(
        <SafeImage
          src="/uploads/image1.jpg"
          baseUrl="http://localhost:4000"
          alt="Test Image"
        />
      );

      // Rapidly change image sources
      for (let i = 2; i <= 10; i++) {
        rerender(
          <SafeImage
            src={`/uploads/image${i}.jpg`}
            baseUrl="http://localhost:4000"
            alt="Test Image"
          />
        );
      }

      // Component should still be functional
      await waitFor(() => {
        const img = screen.getByAltText('Test Image');
        expect(img).toBeTruthy();
        expect(img.src).toBe('http://localhost:4000/uploads/image10.jpg');
      });
    });

    it('should handle lazy loading behavior', async () => {
      const onLoad = vi.fn();
      
      render(
        <SafeImage
          src="/uploads/test-image.jpg"
          baseUrl="http://localhost:4000"
          alt="Test Image"
          onLoad={onLoad}
          loading="lazy"
        />
      );

      const img = screen.getByAltText('Test Image');
      expect(img.loading).toBe('lazy');

      // Simulate image load
      await act(async () => {
        fireEvent.load(img);
      });

      expect(onLoad).toHaveBeenCalled();
    });
  });
});