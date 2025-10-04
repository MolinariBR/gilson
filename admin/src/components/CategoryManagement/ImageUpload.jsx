import React, { useState, useRef } from "react";
import "./ImageUpload.css";
import { assets } from "../../assets/assets";
import { getAdminTranslation } from "../../constants/adminTranslations";

const ImageUpload = ({ currentImage, onImageChange, error }) => {
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const validateImage = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!validTypes.includes(file.type)) {
      return getAdminTranslation('categories.invalidImageType', 'Please select a valid image file (JPG, PNG, WEBP)');
    }

    if (file.size > maxSize) {
      return getAdminTranslation('categories.imageTooLarge', 'Image size must be less than 2MB');
    }

    return null;
  };

  const handleImageSelect = (file) => {
    const validationError = validateImage(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Pass file to parent
    onImageChange(file);
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
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      <div 
        className={`upload-area ${dragOver ? 'drag-over' : ''} ${error ? 'error' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {displayImage ? (
          <div className="image-preview">
            <img 
              src={displayImage} 
              alt="Category preview"
              onError={(e) => {
                e.target.src = assets.upload_area;
              }}
            />
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
                {getAdminTranslation('categories.supportedFormats', 'Supported: JPG, PNG, WEBP (max 2MB)')}
              </small>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ImageUpload;