import React, { useState, useEffect } from "react";
import "./CategoryForm.css";
import ImageUpload from "./ImageUpload";
import { getAdminTranslation } from "../../constants/adminTranslations";

const CategoryForm = ({ category, onSubmit, onCancel, isEditing }) => {
  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
    order: 0
  });
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when editing
  useEffect(() => {
    if (isEditing && category) {
      setFormData({
        name: category.name || "",
        isActive: category.isActive !== undefined ? category.isActive : true,
        order: category.order || 0
      });
    } else {
      // Reset form for new category
      setFormData({
        name: "",
        isActive: true,
        order: 0
      });
      setImage(null);
    }
    setErrors({});
  }, [isEditing, category]);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = getAdminTranslation('categories.nameRequired', 'Category name is required');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = getAdminTranslation('categories.nameMinLength', 'Category name must be at least 2 characters');
    } else if (formData.name.trim().length > 50) {
      newErrors.name = getAdminTranslation('categories.nameMaxLength', 'Category name must be less than 50 characters');
    }

    // Image validation (only required for new categories)
    if (!isEditing && !image) {
      newErrors.image = getAdminTranslation('categories.imageRequired', 'Category image is required');
    }

    // Order validation
    if (formData.order < 0) {
      newErrors.order = getAdminTranslation('categories.orderMinValue', 'Order must be a positive number');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (imageFile) => {
    setImage(imageFile);
    
    // Clear image error when user selects an image
    if (errors.image) {
      setErrors(prev => ({
        ...prev,
        image: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name.trim());
      submitData.append('originalName', formData.name.trim());
      
      // Generate slug from name (frontend preview - backend will also validate/regenerate)
      const slug = formData.name.trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
      
      submitData.append('slug', slug);
      submitData.append('isActive', formData.isActive.toString());
      submitData.append('order', formData.order.toString());
      
      if (image) {
        submitData.append('image', image);
      }

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      isActive: true,
      order: 0
    });
    setImage(null);
    setErrors({});
    onCancel();
  };

  return (
    <div className="category-form">
      <div className="form-header">
        <h3>
          {isEditing 
            ? getAdminTranslation('categories.editCategory', 'Edit Category')
            : getAdminTranslation('categories.addNewCategory', 'Add New Category')
          }
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="category-form-content">
        <div className="form-row">
          <div className="form-group image-upload-group">
            <label>{getAdminTranslation('categories.categoryImage', 'Category Image')}</label>
            <ImageUpload
              currentImage={isEditing ? category?.image : null}
              onImageChange={handleImageChange}
              error={errors.image}
            />
            {errors.image && <span className="error-message">{errors.image}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">
              {getAdminTranslation('categories.categoryName', 'Category Name')} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={getAdminTranslation('categories.enterCategoryName', 'Enter category name')}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="order">
              {getAdminTranslation('categories.displayOrder', 'Display Order')}
            </label>
            <input
              type="number"
              id="order"
              name="order"
              value={formData.order}
              onChange={handleInputChange}
              min="0"
              placeholder="0"
              className={errors.order ? 'error' : ''}
            />
            {errors.order && <span className="error-message">{errors.order}</span>}
            <small className="help-text">
              {getAdminTranslation('categories.orderHelpText', 'Lower numbers appear first in the menu')}
            </small>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
              />
              <span className="checkmark"></span>
              {getAdminTranslation('categories.activeCategory', 'Active Category')}
            </label>
            <small className="help-text">
              {getAdminTranslation('categories.activeHelpText', 'Only active categories will be displayed to users')}
            </small>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {getAdminTranslation('messages.cancel', 'Cancel')}
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? getAdminTranslation('messages.saving', 'Saving...')
              : isEditing 
                ? getAdminTranslation('messages.update', 'Update')
                : getAdminTranslation('messages.create', 'Create')
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryForm;