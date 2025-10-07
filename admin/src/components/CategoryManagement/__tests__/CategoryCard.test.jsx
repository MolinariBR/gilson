import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CategoryCard from '../CategoryCard';
import { StoreContext } from '../../../context/StoreContext';

// Mock the StoreContext
const mockContextValue = {
  url: 'http://localhost:4000',
  token: 'test-token',
  admin: true,
  setToken: vi.fn(),
  setAdmin: vi.fn()
};

const MockStoreProvider = ({ children }) => (
  <StoreContext.Provider value={mockContextValue}>
    {children}
  </StoreContext.Provider>
);

describe('CategoryCard Component', () => {
  const mockCategory = {
    _id: '1',
    name: 'Test Category',
    slug: 'test-category',
    image: '/uploads/categories/test-image.jpg',
    isActive: true,
    order: 1
  };

  const mockProps = {
    category: mockCategory,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleStatus: vi.fn()
  };

  it('renders category information correctly', () => {
    render(
      <MockStoreProvider>
        <CategoryCard {...mockProps} />
      </MockStoreProvider>
    );

    expect(screen.getByText('Test Category')).toBeInTheDocument();
    expect(screen.getByText('test-category')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('uses SafeImage component for category image', () => {
    render(
      <MockStoreProvider>
        <CategoryCard {...mockProps} />
      </MockStoreProvider>
    );

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('alt', 'Test Category');
  });

  it('handles category without image', () => {
    const categoryWithoutImage = {
      ...mockCategory,
      image: null
    };

    render(
      <MockStoreProvider>
        <CategoryCard {...mockProps} category={categoryWithoutImage} />
      </MockStoreProvider>
    );

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    // SafeImage should handle null image and show fallback
  });

  it('displays active status correctly', () => {
    render(
      <MockStoreProvider>
        <CategoryCard {...mockProps} />
      </MockStoreProvider>
    );

    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('displays inactive status correctly', () => {
    const inactiveCategory = {
      ...mockCategory,
      isActive: false
    };

    render(
      <MockStoreProvider>
        <CategoryCard {...mockProps} category={inactiveCategory} />
      </MockStoreProvider>
    );

    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });
});