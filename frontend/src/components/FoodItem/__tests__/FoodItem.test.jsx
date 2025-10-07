import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FoodItem from '../FoodItem';
import { StoreContext } from '../../../context/StoreContext';

// Mock SafeImage component
vi.mock('../../SafeImage/SafeImage', () => ({
  default: ({ src, baseUrl, fallback, alt, className }) => (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      data-testid="safe-image"
      data-base-url={baseUrl}
      data-fallback={fallback}
    />
  )
}));

const mockStoreContext = {
  cartItems: {},
  addToCart: vi.fn(),
  removeFromCart: vi.fn(),
  url: 'http://localhost:4000'
};

const renderFoodItem = (props = {}) => {
  const defaultProps = {
    id: '1',
    name: 'Test Food',
    price: 10,
    description: 'Test Description',
    image: '/uploads/food/test.jpg'
  };

  return render(
    <StoreContext.Provider value={mockStoreContext}>
      <FoodItem {...defaultProps} {...props} />
    </StoreContext.Provider>
  );
};

describe('FoodItem', () => {
  it('should render with SafeImage component', () => {
    renderFoodItem();
    
    const safeImage = screen.getByTestId('safe-image');
    expect(safeImage).toBeInTheDocument();
    expect(safeImage).toHaveAttribute('data-base-url', 'http://localhost:4000');
    expect(safeImage).toHaveAttribute('data-fallback', '/placeholder-food.svg');
  });

  it('should pass correct props to SafeImage for standard image path', () => {
    renderFoodItem({ 
      image: '/uploads/food/test.jpg',
      name: 'Pizza'
    });
    
    const safeImage = screen.getByTestId('safe-image');
    expect(safeImage).toHaveAttribute('src', '/uploads/food/test.jpg');
    expect(safeImage).toHaveAttribute('alt', 'Pizza');
    expect(safeImage).toHaveClass('food-item-image');
  });

  it('should handle relative image paths', () => {
    renderFoodItem({ 
      image: 'food/burger.jpg',
      name: 'Burger'
    });
    
    const safeImage = screen.getByTestId('safe-image');
    expect(safeImage).toHaveAttribute('src', 'food/burger.jpg');
    expect(safeImage).toHaveAttribute('alt', 'Burger');
  });

  it('should handle full URL image paths', () => {
    renderFoodItem({ 
      image: 'https://example.com/image.jpg',
      name: 'External Image'
    });
    
    const safeImage = screen.getByTestId('safe-image');
    expect(safeImage).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(safeImage).toHaveAttribute('alt', 'External Image');
  });

  it('should handle empty image path', () => {
    renderFoodItem({ 
      image: '',
      name: 'No Image Food'
    });
    
    const safeImage = screen.getByTestId('safe-image');
    expect(safeImage).toHaveAttribute('src', '');
    expect(safeImage).toHaveAttribute('alt', 'No Image Food');
  });

  it('should use food name as alt text', () => {
    renderFoodItem({ 
      name: 'Delicious Pizza',
      image: '/uploads/food/pizza.jpg'
    });
    
    const safeImage = screen.getByTestId('safe-image');
    expect(safeImage).toHaveAttribute('alt', 'Delicious Pizza');
  });

  it('should fallback to "Food item" when name is not provided', () => {
    renderFoodItem({ 
      name: undefined,
      image: '/uploads/food/test.jpg'
    });
    
    const safeImage = screen.getByTestId('safe-image');
    expect(safeImage).toHaveAttribute('alt', 'Food item');
  });

  it('should display food information correctly', () => {
    renderFoodItem({
      name: 'Test Pizza',
      price: 15,
      description: 'Delicious pizza with cheese'
    });

    expect(screen.getByText('Test Pizza')).toBeInTheDocument();
    expect(screen.getByText('$15')).toBeInTheDocument();
    expect(screen.getByText('Delicious pizza with cheese')).toBeInTheDocument();
  });
});