import React, { useState, useRef } from "react";
import "./ImageUpload.css";
import { assets } from "../../assets/assets";
import { getAdminTranslation } from "../../constants/adminTranslations";

const ImageUpload = ({ currentImage, onImageChange, error, categoryId }) => {
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef(null);

  const validateImage = async (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB
    const minDimensions = { width: 100, height: 100 };
    const maxDimensions = { width: 2000, height: 2000 };

    // Basic file validation
    if (!validTypes.includes(file.type)) {
      return getAdminTranslation('categories.invalidImageType', 'Please select a valid image file (JPG, PNG, WEBP)');
    }

    if (file.size > maxSize) {
      return getAdminTranslation('categories.imageTooLarge', 'Image size must be less than 2MB');
    }

    // Validate image dimensions
    try {
      const dimensions = await getImageDimensions(file);
      
      if (dimensions.width < minDimensions.width || dimensions.height < minDimensions.height) {
        return getAdminTranslation('categories.imageTooSmall', 
          `Image dimensions too small. Minimum ${minDimensions.width}x${minDimensions.height}px`);
      }

      if (dimensions.width > maxDimensions.width || dimensions.height > maxDimensions.height) {
        return getAdminTranslation('categories.imageTooBig', 
          `Image dimensions too large. Maximum ${maxDimensions.width}x${maxDimensions.height}px`);
      }

      // Validate aspect ratio (optional - reasonable range)
      const aspectRatio = dimensions.width / dimensions.height;
      if (aspectRatio < 0.5 || aspectRatio > 3) {
        return getAdminTranslation('categories.invalidAspectRatio', 
          'Image aspect ratio should be between 1:2 and 3:1');
      }

    } catch (error) {
      return getAdminTranslation('categories.corruptedImage', 'Image file appears to be corrupted');
    }

    return null;
  };

  const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  };

  const handleImageSelect = async (file) => {
    setValidationError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for validation
      setUploadProgress(20);
      
      const validationError = await validateImage(file);
      if (validationError) {
        setValidationError(validationError);
        setIsUploading(false);
        return;
      }

      setUploadProgress(50);

      // Create preview with error handling
      const preview = await createImagePreview(file);
      setPreview(preview);
      setUploadProgress(80);

      // Pass file to parent
      onImageChange(file);
      setUploadProgress(100);
      
      // Reset progress after a short delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      setValidationError(getAdminTranslation('categories.processingError', 'Error processing image'));
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const createImagePreview = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        // Validate that the result is a valid data URL
        const result = e.target.result;
        if (result && result.startsWith('data:image/')) {
          resolve(result);
        } else {
          reject(new Error('Invalid image data'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
      
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setValidationError(null);
    setIsUploading(false);
    setUploadProgress(0);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = (e) => {
    setImageLoading(false);
    e.target.src = assets.upload_area;
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // If it starts with /, it's already a proper path
    if (imagePath.startsWith('/')) return imagePath;
    
    // Otherwise, assume it's a relative path from uploads
    return `/${imagePath}`;
  };

  const displayImage = preview || getImageUrl(currentImage);

  return (
    <div className="image-upload">
      {/* Progress indicator */}
      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {uploadProgress < 50 ? 
              getAdminTranslation('categories.validating', 'Validating image...') :
              uploadProgress < 100 ?
              getAdminTranslation('categories.processing', 'Processing image...') :
              getAdminTranslation('categories.complete', 'Complete!')
            }
          </div>
        </div>
      )}

      {/* Validation error display */}
      {validationError && (
        <div className="validation-error">
          <span className="error-icon">⚠</span>
          <span className="error-message">{validationError}</span>
          <button 
            className="error-dismiss"
            onClick={() => setValidationError(null)}
          >
            ×
          </button>
        </div>
      )}

      <div 
        className={`upload-area ${dragOver ? 'drag-over' : ''} ${error || validationError ? 'error' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isUploading ? handleClick : undefined}
      >
        {displayImage ? (
          <div className="image-preview">
            {imageLoading && (
              <div className="image-loading">
                <div className="loading-spinner"></div>
                <span>{getAdminTranslation('categories.loadingImage', 'Loading image...')}</span>
              </div>
            )}
            <img 
              src={displayImage} 
              alt="Category preview"
              onLoad={handleImageLoad}
              onError={handleImageError}
              onLoadStart={() => setImageLoading(true)}
              style={{ display: imageLoading ? 'none' : 'block' }}
            />
            {!isUploading && (
              <div className="image-overlay">
                <button 
                  type="button"
                  className="remove-image-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                >
                  ×
                </button>
                <div className="overlay-text">
                  {getAdminTranslation('categories.clickToChange', 'Click to change')}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="upload-placeholder">
            <img src={assets.upload_area} alt="Upload" />
            <div className="upload-text">
              <p>{getAdminTranslation('categories.dragDropImage', 'Drag & drop an image here')}</p>
              <p className="upload-subtext">
                {getAdminTranslation('categories.orClickToSelect', 'or click to select')}
              </p>
              <small>
                {getAdminTranslation('categories.supportedFormats', 'JPG, PNG, WEBP • 100x100px to 2000x2000px • Max 2MB')}
              </small>
            </div>
          </div>
        )}

        {/* Upload overlay when uploading */}
        {isUploading && (
          <div className="upload-overlay">
            <div className="upload-spinner"></div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={isUploading}
      />
    </div>
  );
};

export default ImageUpload;