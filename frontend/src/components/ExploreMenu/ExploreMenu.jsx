import React from "react";
import "./ExploreMenu.css";
import { TRANSLATIONS } from "../../constants/translations";
import { getCategoryEnglish } from "../../constants/categories";
import { useCategories } from "../../hooks/useCategories";

const ExploreMenu = ({category, setCategory}) => {
  const { categories, loading, error, useFallback, retryFetch } = useCategories();

  // Loading state
  if (loading) {
    return (
      <div className="explore-menu" id="explore-menu">
        <h1>{TRANSLATIONS.menu.exploreTitle}</h1>
        <p className="explore-menu-text">
          {TRANSLATIONS.menu.exploreDescription}
        </p>
        <div className="explore-menu-list">
          <div className="explore-menu-loading">
            <p>{TRANSLATIONS.general.loading}</p>
          </div>
        </div>
        <hr/>
      </div>
    );
  }

  // Error state with retry option
  if (error && !useFallback) {
    return (
      <div className="explore-menu" id="explore-menu">
        <h1>{TRANSLATIONS.menu.exploreTitle}</h1>
        <p className="explore-menu-text">
          {TRANSLATIONS.menu.exploreDescription}
        </p>
        <div className="explore-menu-list">
          <div className="explore-menu-error">
            <p>{TRANSLATIONS.messages.errorFetchingCategories}</p>
            <button onClick={retryFetch} className="retry-button">
              Tentar Novamente
            </button>
          </div>
        </div>
        <hr/>
      </div>
    );
  }

  // Use dynamic categories
  const categoriesToRender = categories;

  return (
    <div className="explore-menu" id="explore-menu">
      <h1>{TRANSLATIONS.menu.exploreTitle}</h1>
      <p className="explore-menu-text">
        {TRANSLATIONS.menu.exploreDescription}
      </p>
      {useFallback && (
        <div className="fallback-notice">
          <p style={{fontSize: '12px', color: '#666', textAlign: 'center', marginBottom: '10px'}}>
            {TRANSLATIONS.messages.errorFetchingCategories}
          </p>
        </div>
      )}
      <div className="explore-menu-list">
        {categoriesToRender.map((item, index) => {
          return (
            <div 
              onClick={() => setCategory(prev => prev === item.original_name ? "All" : item.original_name)} 
              key={item._id || index} 
              className={`explore-menu-list-item ${category === item.original_name ? "active" : ""}`}
            >
              {item.menu_image && (
                <img 
                  src={item.menu_image} 
                  alt={item.menu_name}
                  onLoad={() => console.log('✅ Categoria carregada:', item.menu_image)}
                  onError={(e) => {
                    console.log('❌ Erro categoria:', item.menu_image);
                    console.log('Item completo:', item);
                    // Hide image if it fails to load
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <p>{item.menu_name}</p>
            </div>
          );
        })}
      </div>
      <hr/>
    </div>
  );
};

export default ExploreMenu;
