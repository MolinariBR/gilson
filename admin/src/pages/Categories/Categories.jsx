import React, { useState, useEffect, useContext, useCallback } from "react";
import "./Categories.css";
import CategoryList from "../../components/CategoryManagement/CategoryList";
import CategoryForm from "../../components/CategoryManagement/CategoryForm";
import { StoreContext } from "../../context/StoreContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { getAdminTranslation } from "../../constants/adminTranslations";
import axios from "axios";

const Categories = ({ url }) => {
  const navigate = useNavigate();
  const { token, admin } = useContext(StoreContext);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Check authentication
  useEffect(() => {
    if (!admin && !token) {
      toast.error(getAdminTranslation('authentication.pleaseLoginFirst', 'Please Login First'));
      navigate("/");
    }
  }, [admin, token, navigate]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url}/api/admin/categories`, {
        headers: { token }
      });
      
      if (response.data.success) {
        setCategories(response.data.data);
      } else {
        toast.error(getAdminTranslation('categories.errorFetchingCategories', 'Error fetching categories'));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error(getAdminTranslation('categories.errorFetchingCategories', 'Error fetching categories'));
    } finally {
      setLoading(false);
    }
  }, [url, token]);

  useEffect(() => {
    if (token && admin) {
      fetchCategories();
    }
  }, [token, admin, fetchCategories]);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      const response = await axios.delete(`${url}/api/admin/categories/${categoryId}`, {
        headers: { token }
      });

      if (response.data.success) {
        toast.success(getAdminTranslation('categories.categoryDeleted', 'Category deleted successfully'));
        fetchCategories(); // Refresh the list
      } else {
        toast.error(response.data.message || getAdminTranslation('categories.errorDeletingCategory', 'Error deleting category'));
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(getAdminTranslation('categories.errorDeletingCategory', 'Error deleting category'));
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      let response;
      
      if (editingCategory) {
        // Update existing category
        response = await axios.put(`${url}/api/admin/categories/${editingCategory._id}`, formData, {
          headers: { 
            token,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // Create new category
        response = await axios.post(`${url}/api/admin/categories`, formData, {
          headers: { 
            token,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      if (response.data.success) {
        const successMessage = editingCategory 
          ? getAdminTranslation('categories.categoryUpdated', 'Category updated successfully')
          : getAdminTranslation('categories.categoryCreated', 'Category created successfully');
        
        toast.success(successMessage);
        setShowForm(false);
        setEditingCategory(null);
        fetchCategories(); // Refresh the list
      } else {
        toast.error(response.data.message || getAdminTranslation('categories.errorSavingCategory', 'Error saving category'));
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(getAdminTranslation('categories.errorSavingCategory', 'Error saving category'));
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
  };

  const handleToggleStatus = async (categoryId, currentStatus) => {
    try {
      const response = await axios.put(`${url}/api/admin/categories/${categoryId}`, 
        { isActive: !currentStatus },
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success(getAdminTranslation('categories.statusUpdated', 'Category status updated successfully'));
        fetchCategories(); // Refresh the list
      } else {
        toast.error(response.data.message || getAdminTranslation('categories.errorUpdatingStatus', 'Error updating category status'));
      }
    } catch (error) {
      console.error('Error updating category status:', error);
      toast.error(getAdminTranslation('categories.errorUpdatingStatus', 'Error updating category status'));
    }
  };

  if (loading) {
    return (
      <div className="categories-loading">
        <p>{getAdminTranslation('messages.loading', 'Loading...')}</p>
      </div>
    );
  }

  return (
    <div className="categories">
      <div className="categories-header">
        <h2>{getAdminTranslation('categories.categoryManagement', 'Category Management')}</h2>
        <button 
          className="add-category-btn"
          onClick={handleAddCategory}
        >
          {getAdminTranslation('categories.addNewCategory', 'Add New Category')}
        </button>
      </div>

      {showForm ? (
        <CategoryForm
          category={editingCategory}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isEditing={!!editingCategory}
        />
      ) : (
        <CategoryList
          categories={categories}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </div>
  );
};

export default Categories;