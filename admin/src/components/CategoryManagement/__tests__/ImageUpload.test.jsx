import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = vi.fn();

// Mock FileReader
class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.result = null;
  }

  readAsDataURL(file) {
    setTimeout(() => {
      this.result = `data:image/jpeg;base64,mock-base64-data`;
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 100);
  }
}

global.FileReader = MockFileReader;

// Mock Image constructor for dimension validation
class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.naturalWidth = 500;
    this.naturalHeight = 400;
  }

  set src(value) {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 50);
  }
}

global.Image = MockImage;

describe('ImageUpload Component', () => {
  const mockOnImageChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockFile = (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
    return new File(['mock content'], name, { type, size });
  };

  it('renders upload placeholder when no image is provided', () => {
    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    expect(screen.getByText('Drag & drop an image here')).toBeInTheDocument();
    expect(screen.getByText('or click to select')).toBeInTheDocument();
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

  it('validates file type correctly', async () => {
    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    const invalidFile = createMockFile('test.txt', 'text/plain');

    // Simulate file selection
    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/Please select a valid image file/)).toBeInTheDocument();
    });
  });

  it('validates file size correctly', async () => {
    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    const largeFile = createMockFile('large.jpg', 'image/jpeg', 3 * 1024 * 1024); // 3MB

    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      // Check for validation error in the validation error component
      expect(screen.getByText(/Image size must be less than 2MB/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('validates image dimensions correctly', async () => {
    // Mock Image with small dimensions
    global.Image = class extends MockImage {
      constructor() {
        super();
        this.naturalWidth = 50;
        this.naturalHeight = 50;
      }
    };

    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    const validFile = createMockFile('small.jpg', 'image/jpeg', 1024);

    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/Image dimensions too small/)).toBeInTheDocument();
    });
  });

  it('shows progress indicator during upload', async () => {
    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    const validFile = createMockFile('test.jpg', 'image/jpeg', 1024);

    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    // Should show progress indicator
    await waitFor(() => {
      expect(screen.getByText('Validating image...')).toBeInTheDocument();
    });
  });

  it('creates preview for valid image', async () => {
    // Reset Image mock to have valid dimensions
    global.Image = class extends MockImage {
      constructor() {
        super();
        this.naturalWidth = 500;
        this.naturalHeight = 400;
      }
    };

    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    const validFile = createMockFile('test.jpg', 'image/jpeg', 1024);

    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockOnImageChange).toHaveBeenCalledWith(validFile);
    }, { timeout: 2000 });
  });

  it('handles drag and drop correctly', async () => {
    // Reset Image mock to have valid dimensions
    global.Image = class extends MockImage {
      constructor() {
        super();
        this.naturalWidth = 500;
        this.naturalHeight = 400;
      }
    };

    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    const uploadArea = screen.getByText('Drag & drop an image here').closest('.upload-area');
    const validFile = createMockFile('test.jpg', 'image/jpeg', 1024);

    // Simulate drag over
    fireEvent.dragOver(uploadArea);
    expect(uploadArea).toHaveClass('drag-over');

    // Simulate drop
    fireEvent.drop(uploadArea, {
      dataTransfer: {
        files: [validFile]
      }
    });

    await waitFor(() => {
      expect(mockOnImageChange).toHaveBeenCalledWith(validFile);
    }, { timeout: 2000 });
  });

  it('removes image when remove button is clicked', async () => {
    render(
      <ImageUpload
        currentImage="/uploads/categories/test.jpg"
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    const imagePreview = screen.getByAltText('Category preview').closest('.image-preview');
    
    // Hover to show overlay
    fireEvent.mouseEnter(imagePreview);
    
    const removeButton = screen.getByText('×');
    fireEvent.click(removeButton);

    expect(mockOnImageChange).toHaveBeenCalledWith(null);
  });

  it('displays validation error when provided', () => {
    const errorMessage = 'Test error message';
    
    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={errorMessage}
      />
    );

    // The error prop is passed to the upload area, but internal validation errors are displayed differently
    expect(screen.getByText('Drag & drop an image here')).toBeInTheDocument();
    // The error class should be applied to the upload area
    const uploadArea = screen.getByText('Drag & drop an image here').closest('.upload-area');
    expect(uploadArea).toHaveClass('error');
  });

  it('validates aspect ratio correctly', async () => {
    // Mock Image with extreme aspect ratio
    global.Image = class extends MockImage {
      constructor() {
        super();
        this.naturalWidth = 1000;
        this.naturalHeight = 200; // 5:1 aspect ratio (too wide)
      }
    };

    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    const validFile = createMockFile('wide.jpg', 'image/jpeg', 1024);

    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/Image aspect ratio should be between 1:2 and 3:1/)).toBeInTheDocument();
    });
  });

  it('disables input during upload', async () => {
    render(
      <ImageUpload
        currentImage={null}
        onImageChange={mockOnImageChange}
        error={null}
      />
    );

    const validFile = createMockFile('test.jpg', 'image/jpeg', 1024);
    const fileInput = document.querySelector('input[type="file"]');

    Object.defineProperty(fileInput, 'files', {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    // During upload, input should be disabled
    expect(fileInput).toBeDisabled();
  });
});