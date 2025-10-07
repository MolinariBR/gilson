import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ImageUpload from '../ImageUpload';

// Mock the assets
vi.mock('../../../assets/assets', () => ({
  assets: {
    upload_area: '/mock-upload-area.png'
  }
}));

// Mock the admin translations
vi.mock('../../../constants/adminTranslations', () => ({
  getAdminTranslation: (key, fallback) => fallback || key
}));

describe('ImageUpload Component - Basic Functionality', () => {
  const mockOnImageChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload placeholder correctly', () => {
    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    expect(screen.getByText('Drag & drop an image here')).toBeInTheDocument();
    expect(screen.getByText('or click to select')).toBeInTheDocument();
    expect(screen.getByText(/JPG, PNG, WEBP/)).toBeInTheDocument();
  });

  it('displays current image when provided', () => {
    render(
      <ImageUpload
        currentImage="/uploads/categories/test.jpg"
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    const image = screen.getByAltText('Category preview');
    expect(image).toBeInTheDocument();
    expect(image.src).toContain('/uploads/categories/test.jpg');
  });

  it('applies error class when error prop is provided', () => {
    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error="Test error"
      />
    );

    const uploadArea = screen.getByText('Drag & drop an image here').closest('.upload-area');
    expect(uploadArea).toHaveClass('error');
  });

  it('has proper file input attributes', () => {
    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toBe('image/jpeg,image/jpg,image/png,image/webp');
    expect(fileInput.style.display).toBe('none');
  });

  it('shows enhanced format information', () => {
    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    // Check for enhanced format information
    expect(screen.getByText(/100x100px to 2000x2000px/)).toBeInTheDocument();
    expect(screen.getByText(/Max 2MB/)).toBeInTheDocument();
  });
});