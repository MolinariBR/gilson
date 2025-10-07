import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react';
import SafeImage from '../SafeImage/SafeImage';

// Mock the image utils
vi.mock('../../utils/imageUtils', () => ({
  resolveImageUrl: vi.fn((imagePath, baseUrl) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return baseUrl + imagePath;
    return baseUrl + '/uploads/' + imagePath;
  })
}));

describe('Simple SafeImage Integration Tests', () => {
  const baseUrl = 'http://localhost:4000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Image Display', () => {
    it('should display image with correct resolved URL', async () => {
      render(
        <SafeImage
          src="/uploads/test-image.jpg"
          baseUrl={baseUrl}
          alt="Test Image"
          data-testid="safe-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('safe-image');
        expect(img).toBeTruthy();
        expect(img.src).toBe('http://localhost:4000/uploads/test-image.jpg');
        expect(img.alt).toBe('Test Image');
      });
    });

    it('should handle relative image paths correctly', async () => {
      render(
        <SafeImage
          src="food/test-image.jpg"
          baseUrl={baseUrl}
          alt="Test Image"
          data-testid="safe-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('safe-image');
        expect(img.src).toBe('http://localhost:4000/uploads/food/test-image.jpg');
      });
    });

    it('should handle absolute URLs correctly', async () => {
      render(
        <SafeImage
          src="https://example.com/image.jpg"
          baseUrl={baseUrl}
          alt="Test Image"
          data-testid="safe-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('safe-image');
        expect(img.src).toBe('https://example.com/image.jpg');
      });
    });
  });

  describe('Fallback Behavior', () => {
    it('should show fallback for null src', async () => {
      render(
        <SafeImage
          src={null}
          baseUrl={baseUrl}
          fallback="/placeholder-food.png"
          alt="Test Image"
          data-testid="safe-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('safe-image');
        expect(img.src).toContain('placeholder-food.png');
      });
    });

    it('should show fallback for empty src', async () => {
      render(
        <SafeImage
          src=""
          baseUrl={baseUrl}
          fallback="/placeholder-category.png"
          alt="Test Image"
          data-testid="safe-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('safe-image');
        expect(img.src).toContain('placeholder-category.png');
      });
    });

    it('should use custom fallback when provided', async () => {
      render(
        <SafeImage
          src={null}
          baseUrl={baseUrl}
          fallback="/custom-placeholder.png"
          alt="Test Image"
          data-testid="safe-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('safe-image');
        expect(img.src).toContain('custom-placeholder.png');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle image load error and show fallback', async () => {
      const onError = vi.fn();
      
      render(
        <SafeImage
          src="/uploads/nonexistent-image.jpg"
          baseUrl={baseUrl}
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
        expect(img.src).toContain('placeholder-food.png');
        expect(img.className).toContain('error');
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should call onLoad when image loads successfully', async () => {
      const onLoad = vi.fn();
      
      render(
        <SafeImage
          src="/uploads/test-image.jpg"
          baseUrl={baseUrl}
          alt="Test Image"
          onLoad={onLoad}
          data-testid="safe-image"
        />
      );

      const img = screen.getByTestId('safe-image');
      
      // Simulate image load success
      await act(async () => {
        fireEvent.load(img);
      });

      expect(onLoad).toHaveBeenCalled();
    });
  });

  describe('CSS Classes and States', () => {
    it('should apply correct CSS classes', async () => {
      render(
        <SafeImage
          src="/uploads/test-image.jpg"
          baseUrl={baseUrl}
          alt="Test Image"
          className="custom-class"
          data-testid="safe-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('safe-image');
        expect(img.className).toContain('safe-image');
        expect(img.className).toContain('custom-class');
      });
    });

    it('should show loading state initially', async () => {
      render(
        <SafeImage
          src="/uploads/test-image.jpg"
          baseUrl={baseUrl}
          alt="Test Image"
          data-testid="safe-image"
        />
      );

      const img = screen.getByTestId('safe-image');
      expect(img.className).toContain('loading');
    });

    it('should show error state after error', async () => {
      render(
        <SafeImage
          src="/uploads/nonexistent-image.jpg"
          baseUrl={baseUrl}
          fallback="/placeholder-food.png"
          alt="Test Image"
          data-testid="safe-image"
        />
      );

      const img = screen.getByTestId('safe-image');
      
      await act(async () => {
        fireEvent.error(img);
      });

      await waitFor(() => {
        expect(img.className).toContain('error');
      });
    });
  });

  describe('Props Handling', () => {
    it('should pass through additional props', async () => {
      render(
        <SafeImage
          src="/uploads/test-image.jpg"
          baseUrl={baseUrl}
          alt="Test Image"
          title="Test Title"
          width="100"
          height="100"
          data-testid="safe-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('safe-image');
        expect(img.title).toBe('Test Title');
        expect(img.width).toBe(100);
        expect(img.height).toBe(100);
      });
    });

    it('should apply inline styles', async () => {
      const style = { border: '1px solid red', borderRadius: '5px' };
      
      render(
        <SafeImage
          src="/uploads/test-image.jpg"
          baseUrl={baseUrl}
          alt="Test Image"
          style={style}
          data-testid="safe-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('safe-image');
        expect(img.style.border).toBe('1px solid red');
        expect(img.style.borderRadius).toBe('5px');
      });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle food item image scenario', async () => {
      render(
        <SafeImage
          src="/uploads/pizza-margherita.jpg"
          baseUrl={baseUrl}
          fallback="/placeholder-food.png"
          alt="Pizza Margherita"
          className="food-item-image"
          data-testid="food-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('food-image');
        expect(img.src).toBe('http://localhost:4000/uploads/pizza-margherita.jpg');
        expect(img.alt).toBe('Pizza Margherita');
        expect(img.className).toContain('food-item-image');
      });
    });

    it('should handle category image scenario', async () => {
      render(
        <SafeImage
          src="/uploads/categories/italian-food.png"
          baseUrl={baseUrl}
          fallback="/placeholder-category.png"
          alt="Italian Food"
          className="category-image"
          data-testid="category-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('category-image');
        expect(img.src).toBe('http://localhost:4000/uploads/categories/italian-food.png');
        expect(img.alt).toBe('Italian Food');
        expect(img.className).toContain('category-image');
      });
    });

    it('should handle missing image with appropriate fallback', async () => {
      render(
        <SafeImage
          src={null}
          baseUrl={baseUrl}
          fallback="/placeholder-food.svg"
          alt="Missing Food Image"
          data-testid="missing-image"
        />
      );

      await waitFor(() => {
        const img = screen.getByTestId('missing-image');
        expect(img.src).toContain('placeholder-food.svg');
        expect(img.alt).toBe('Missing Food Image');
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should handle rapid prop changes without memory leaks', async () => {
      const { rerender } = render(
        <SafeImage
          src="/uploads/image1.jpg"
          baseUrl={baseUrl}
          alt="Test Image"
          data-testid="safe-image"
        />
      );

      // Rapidly change image sources
      for (let i = 2; i <= 10; i++) {
        rerender(
          <SafeImage
            src={`/uploads/image${i}.jpg`}
            baseUrl={baseUrl}
            alt="Test Image"
            data-testid="safe-image"
          />
        );
      }

      // Component should still be functional
      await waitFor(() => {
        const img = screen.getByTestId('safe-image');
        expect(img).toBeTruthy();
        expect(img.src).toBe('http://localhost:4000/uploads/image10.jpg');
      });
    });

    it('should render fallback when no image source is available', () => {
      const { container } = render(
        <SafeImage
          src={null}
          baseUrl=""
          alt="Test Image"
        />
      );

      // Should render fallback image when no valid source
      const img = container.querySelector('img');
      expect(img).toBeTruthy();
      expect(img.src).toContain('placeholder-food.png');
    });
  });
});