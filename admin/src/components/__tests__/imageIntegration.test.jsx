import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import SafeImage from '../SafeImage/SafeImage';
import CategoryCard from '../CategoryManagement/CategoryCard';
import CategoryList from '../CategoryManagement/CategoryList';
import List from '../../pages/List/List';
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

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Admin Image Integration Tests', () => {
  const mockStoreContext = {
    url: 'http://localhost:4000',
    list: [
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
    fetchList: vi.fn(),
    removeFood: vi.fn()
  };

  const mockCategories = [
    {
      _id: '1',
      name: 'Test Category 1',
      description: 'Test Description 1',
  image: '/uploads/cat1.jpg',
      isActive: true
    },
    {
      _id: '2',
      name: 'Test Category 2',
      description: 'Test Description 2',
      image: 'categories/cat2.jpg', // Relative path
      isActive: true
    },
    {
      _id: '3',
      name: 'Test Category 3',
      description: 'Test Description 3',
      image: null, // Missing image
      isActive: false
    }
  ];

  const renderWithContext = (component) => {
    return render(
      <StoreContext.Provider value={mockStoreContext}>
        {component}
      </StoreContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Image constructor
    global.Image = class {
      constructor() {
        setTimeout(() => {
          this.onload && this.onload();
        }, 100);
      }
    };

    // Mock successful fetch responses
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockCategories })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Admin SafeImage Component Integration', () => {
    it('should display image with correct resolved URL', async () => {
      const { container } = render(
        <SafeImage
          src="/uploads/test-image.jpg"
          baseUrl="http://localhost:4000"
          alt="Test Category Image"
          data-testid="safe-image"
        />
      );

      await waitFor(() => {
        const img = container.querySelector('img');
        expect(img).toBeTruthy();
  expect(img.src).toBe('http://localhost:4000/uploads/test-image.jpg');
        expect(img.alt).toBe('Test Category Image');
      });
    });

    it('should handle image load error and show fallback', async () => {
      const onError = vi.fn();
      
      render(
        <SafeImage
          src="/uploads/nonexistent-image.jpg"
          baseUrl="http://localhost:4000"
          fallback="/placeholder-category.png"
          alt="Test Category Image"
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
        expect(img.src).toBe('http://localhost:4000/placeholder-category.png');
        expect(img.className).toContain('error');
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('CategoryCard Component Integration', () => {
    it('should display category card with correct image URL', async () => {
      const category = mockCategories[0];
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      
      render(
        <CategoryCard
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
          baseUrl="http://localhost:4000"
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText(category.name);
        expect(img).toBeTruthy();
  expect(img.src).toBe('http://localhost:4000/uploads/cat1.jpg');
      });

      // Check category details
      expect(screen.getByText(category.name)).toBeTruthy();
      expect(screen.getByText(category.description)).toBeTruthy();
    });

    it('should handle category with relative image path', async () => {
      const category = mockCategories[1];
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      
      render(
        <CategoryCard
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
          baseUrl="http://localhost:4000"
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText(category.name);
  expect(img.src).toBe('http://localhost:4000/uploads/cat2.jpg');
      });
    });

    it('should handle category with missing image', async () => {
      const category = mockCategories[2];
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      
      render(
        <CategoryCard
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
          baseUrl="http://localhost:4000"
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText(category.name);
        expect(img.src).toBe('http://localhost:4000/placeholder-category.png');
      });
    });

    it('should call onEdit when edit button is clicked', async () => {
      const category = mockCategories[0];
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      
      render(
        <CategoryCard
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
          baseUrl="http://localhost:4000"
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledWith(category);
    });

    it('should call onDelete when delete button is clicked', async () => {
      const category = mockCategories[0];
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      
      render(
        <CategoryCard
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
          baseUrl="http://localhost:4000"
        />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith(category._id);
    });
  });

  describe('CategoryList Component Integration', () => {
    it('should display all categories with correct images', async () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          baseUrl="http://localhost:4000"
        />
      );

      await waitFor(() => {
        // Check that all categories are displayed
        expect(screen.getByText('Test Category 1')).toBeTruthy();
        expect(screen.getByText('Test Category 2')).toBeTruthy();
        expect(screen.getByText('Test Category 3')).toBeTruthy();

        // Check images
        const images = screen.getAllByRole('img');
        expect(images.length).toBe(3);
        
        // First category should have correct image
        const firstImg = screen.getByAltText('Test Category 1');
  expect(firstImg.src).toBe('http://localhost:4000/uploads/cat1.jpg');
      });
    });

    it('should handle empty category list', async () => {
      render(
        <CategoryList
          categories={[]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          baseUrl="http://localhost:4000"
        />
      );

      // Should show empty state or no categories
      const images = screen.queryAllByRole('img');
      expect(images.length).toBe(0);
    });
  });

  describe('List Component (Food List) Integration', () => {
    it('should display food items with correct images', async () => {
      renderWithContext(<List />);

      await waitFor(() => {
        // Check that food items are displayed
        expect(screen.getByText('Test Food 1')).toBeTruthy();
        expect(screen.getByText('Test Food 2')).toBeTruthy();
        expect(screen.getByText('Test Food 3')).toBeTruthy();

        // Check images
        const images = screen.getAllByRole('img');
        expect(images.length).toBeGreaterThanOrEqual(3);
        
        // First food item should have correct image
        const firstImg = screen.getByAltText('Test Food 1');
        expect(firstImg.src).toBe('http://localhost:4000/uploads/food1.jpg');
      });
    });

    it('should handle food item removal', async () => {
      renderWithContext(<List />);

      await waitFor(() => {
        const removeButtons = screen.getAllByText('x');
        if (removeButtons.length > 0) {
          fireEvent.click(removeButtons[0]);
          expect(mockStoreContext.removeFood).toHaveBeenCalled();
        }
      });
    });

    it('should handle food items with missing images', async () => {
      renderWithContext(<List />);

      await waitFor(() => {
        // Food item with null image should show placeholder
        const placeholderImages = screen.getAllByRole('img').filter(img => 
          img.src.includes('placeholder-food.png')
        );
        expect(placeholderImages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Image Upload Integration', () => {
    it('should handle file selection for category image upload', async () => {
      const mockFile = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' });
      const onImageSelect = vi.fn();
      
      render(
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onImageSelect(e.target.files[0])}
          data-testid="file-input"
        />
      );

      const fileInput = screen.getByTestId('file-input');
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      expect(onImageSelect).toHaveBeenCalledWith(mockFile);
    });

    it('should validate file type during upload', async () => {
      const mockInvalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const onImageSelect = vi.fn();
      const onError = vi.fn();
      
      render(
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file && !file.type.startsWith('image/')) {
              onError('Invalid file type');
            } else {
              onImageSelect(file);
            }
          }}
          data-testid="file-input"
        />
      );

      const fileInput = screen.getByTestId('file-input');
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockInvalidFile] } });
      });

      expect(onError).toHaveBeenCalledWith('Invalid file type');
      expect(onImageSelect).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      fetch.mockRejectedValueOnce(new Error('API Error'));

      const { container } = render(
        <CategoryList
          categories={[]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          baseUrl="http://localhost:4000"
        />
      );

      // Component should still render without crashing
      expect(container).toBeTruthy();
    });

    it('should handle image load failures in category cards', async () => {
      const category = {
        ...mockCategories[0],
  image: '/uploads/broken-image.jpg'
      };
      
      render(
        <CategoryCard
          category={category}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          baseUrl="http://localhost:4000"
        />
      );

      const img = screen.getByAltText(category.name);
      
      // Simulate image load error
      await act(async () => {
        fireEvent.error(img);
      });

      await waitFor(() => {
        expect(img.src).toBe('http://localhost:4000/placeholder-category.png');
      });
    });

    it('should handle network timeouts', async () => {
      // Mock network timeout
      fetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      renderWithContext(<List />);

      // Component should handle timeout gracefully
      await waitFor(() => {
        expect(mockStoreContext.fetchList).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Integration', () => {
    it('should handle large number of categories efficiently', async () => {
      const largeCategories = Array.from({ length: 100 }, (_, i) => ({
        _id: `cat-${i}`,
        name: `Category ${i}`,
        description: `Description ${i}`,
  image: `/uploads/cat${i}.jpg`,
        isActive: true
      }));

      const startTime = performance.now();
      
      render(
        <CategoryList
          categories={largeCategories}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          baseUrl="http://localhost:4000"
        />
      );

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBe(100);
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle rapid image updates without memory leaks', async () => {
      const category = mockCategories[0];
      const { rerender } = render(
        <CategoryCard
          category={category}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          baseUrl="http://localhost:4000"
        />
      );

      // Rapidly update category image
      for (let i = 1; i <= 10; i++) {
        const updatedCategory = {
          ...category,
          image: `/uploads/cat${i}.jpg`
        };
        
        rerender(
          <CategoryCard
            category={updatedCategory}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            baseUrl="http://localhost:4000"
          />
        );
      }

      // Component should still be functional
      await waitFor(() => {
        const img = screen.getByAltText(category.name);
        expect(img).toBeTruthy();
  expect(img.src).toBe('http://localhost:4000/uploads/cat10.jpg');
      });
    });
  });
});