import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import List from '../List';
import { StoreContext } from '../../../context/StoreContext';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock admin translations
vi.mock('../../../constants/adminTranslations', () => ({
  getAdminTranslation: (key, fallback) => fallback || key,
  getCategoryTranslation: (key, fallback) => fallback || key,
}));

const mockContextValue = {
  token: 'mock-token',
  admin: true,
};

const mockFoodList = [
  {
    _id: '1',
    name: 'Test Food 1',
    category: 'Test Category',
    price: 10.99,
    image: '/uploads/food1.jpg',
  },
  {
    _id: '2',
    name: 'Test Food 2',
    category: 'Test Category',
    price: 15.99,
    image: 'food2.jpg', // Test without /uploads/ prefix
  },
];

const renderWithContext = (component) => {
  return render(
    <BrowserRouter>
      <StoreContext.Provider value={mockContextValue}>
        {component}
      </StoreContext.Provider>
    </BrowserRouter>
  );
};

describe('List Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockFoodList,
      },
    });
  });

  it('renders food list with SafeImage components', async () => {
    renderWithContext(<List url="http://localhost:4000" />);

    // Wait for the API call to complete
    await waitFor(() => {
      expect(screen.getByText('Test Food 1')).toBeInTheDocument();
    });

    // Check that food items are rendered
    expect(screen.getByText('Test Food 1')).toBeInTheDocument();
    expect(screen.getByText('Test Food 2')).toBeInTheDocument();
    expect(screen.getAllByText('Test Category')).toHaveLength(2);

    // Check that SafeImage components are rendered (they should have the safe-image class)
    const images = document.querySelectorAll('.safe-image');
    expect(images).toHaveLength(2);
  });

  it('displays proper fallback images when image fails to load', async () => {
    renderWithContext(<List url="http://localhost:4000" />);

    await waitFor(() => {
      expect(screen.getByText('Test Food 1')).toBeInTheDocument();
    });

    // Get all images
    const images = document.querySelectorAll('img');
    
    // Simulate image load error on first image
    const firstImage = images[0];
    if (firstImage) {
      // Trigger error event
      firstImage.dispatchEvent(new Event('error'));
      
      // Check that fallback image is used
      await waitFor(() => {
        expect(firstImage.src).toContain('placeholder-food.svg');
      });
    }
  });

  it('makes API call to fetch food list', async () => {
    renderWithContext(<List url="http://localhost:4000" />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4000/api/food/list');
    });
  });

  it('handles different image path formats correctly', async () => {
    renderWithContext(<List url="http://localhost:4000" />);

    await waitFor(() => {
      expect(screen.getByText('Test Food 1')).toBeInTheDocument();
    });

    const images = document.querySelectorAll('img');
    
    // First image should have /uploads/ prefix resolved correctly
    expect(images[0].src).toContain('/uploads/food1.jpg');
    
    // Second image should have /uploads/ prefix added
    expect(images[1].src).toContain('/uploads/food2.jpg');
  });
});