import React from "react";
import "./CategoryList.css";
import CategoryCard from "./CategoryCard";
import { getAdminTranslation } from "../../constants/adminTranslations";

const CategoryList = ({ categories, onEdit, onDelete, onToggleStatus }) => {
  if (!categories || categories.length === 0) {
    return (
      <div className="category-list-empty">
        <div className="empty-state">
          <h3>{getAdminTranslation('categories.noCategoriesFound', 'No categories found')}</h3>
          <p>{getAdminTranslation('categories.createFirstCategory', 'Create your first category to get started!')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="category-list">
      <div className="category-list-header">
        <div className="list-table-format title">
          <b>{getAdminTranslation('categories.image', 'Image')}</b>
          <b>{getAdminTranslation('categories.name', 'Name')}</b>
          <b>{getAdminTranslation('categories.status', 'Status')}</b>
          <b>{getAdminTranslation('categories.order', 'Order')}</b>
          <b>{getAdminTranslation('categories.actions', 'Actions')}</b>
        </div>
      </div>
      
      <div className="category-list-content">
        {categories.map((category) => (
          <CategoryCard
            key={category._id}
            category={category}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoryList;