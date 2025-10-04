import React, { useState } from "react";
import "./CategoryCard.css";
import { getAdminTranslation } from "../../constants/adminTranslations";
import DeleteConfirmation from "./DeleteConfirmation";

const CategoryCard = ({ category, onEdit, onDelete, onToggleStatus }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const handleEdit = () => {
    onEdit(category);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(category._id);
    setShowDeleteModal(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  const handleToggleStatus = () => {
    onToggleStatus(category._id, category.isActive);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/placeholder-category.png';
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // If it starts with /, it's already a proper path
    if (imagePath.startsWith('/')) return imagePath;
    
    // Otherwise, assume it's a relative path from uploads
    return `/${imagePath}`;
  };

  return (
    <>
      <div className="category-card">
        <div className="list-table-format">
          <div className="category-image">
            <img 
              src={getImageUrl(category.image)} 
              alt={category.name}
              onError={(e) => {
                e.target.src = '/placeholder-category.png';
              }}
            />
          </div>
          
          <div className="category-info">
            <div className="category-name">{category.name}</div>
            <div className="category-slug">{category.slug}</div>
          </div>
          
          <div className="category-status">
            <button 
              className={`status-toggle ${category.isActive ? 'active' : 'inactive'}`}
              onClick={handleToggleStatus}
            >
              {category.isActive 
                ? getAdminTranslation('categories.active', 'Active')
                : getAdminTranslation('categories.inactive', 'Inactive')
              }
            </button>
          </div>
          
          <div className="category-order">
            {category.order || 0}
          </div>
          
          <div className="category-actions">
            <button 
              className="edit-btn"
              onClick={handleEdit}
              title={getAdminTranslation('messages.edit', 'Edit')}
            >
              {getAdminTranslation('messages.edit', 'Edit')}
            </button>
            <button 
              className="delete-btn"
              onClick={handleDeleteClick}
              title={getAdminTranslation('messages.delete', 'Delete')}
            >
              {getAdminTranslation('messages.delete', 'Delete')}
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteConfirmation
          categoryName={category.name}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </>
  );
};

export default CategoryCard;