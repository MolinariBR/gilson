import React from "react";
import "./DeleteConfirmation.css";
import { getAdminTranslation } from "../../constants/adminTranslations";

const DeleteConfirmation = ({ categoryName, onConfirm, onCancel }) => {
  return (
    <div className="delete-confirmation-overlay">
      <div className="delete-confirmation-modal">
        <div className="modal-header">
          <h3>{getAdminTranslation('categories.confirmDelete', 'Confirm Delete')}</h3>
        </div>
        
        <div className="modal-body">
          <p>
            {getAdminTranslation('categories.deleteConfirmMessage', 'Are you sure you want to delete the category')} 
            <strong> "{categoryName}"</strong>?
          </p>
          <p className="warning-text">
            {getAdminTranslation('categories.deleteWarning', 'This action cannot be undone. Make sure no products are associated with this category.')}
          </p>
        </div>
        
        <div className="modal-actions">
          <button 
            className="cancel-btn"
            onClick={onCancel}
          >
            {getAdminTranslation('messages.cancel', 'Cancel')}
          </button>
          <button 
            className="confirm-btn"
            onClick={onConfirm}
          >
            {getAdminTranslation('messages.delete', 'Delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmation;