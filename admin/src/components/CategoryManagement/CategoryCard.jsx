import React, { useState, useContext } from "react";
import "./CategoryCard.css";
import { getAdminTranslation } from "../../constants/adminTranslations";
import DeleteConfirmation from "./DeleteConfirmation";
import SafeImage from "../SafeImage/SafeImage";
import { StoreContext } from "../../context/StoreContext";

const CategoryCard = ({ category, onEdit, onDelete, onToggleStatus }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { url } = useContext(StoreContext);
  
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



  return (
    <>
      <div className="category-card">
        <div className="list-table-format">
          <div className="category-image">
            <SafeImage 
              src={category.image}
              baseUrl={url}
              fallback="/placeholder-category.svg"
              alt={category.name}
              categoryId={category._id}
              priority="high"
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