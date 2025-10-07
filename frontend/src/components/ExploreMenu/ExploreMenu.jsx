import React, { useContext } from "react";
import "./ExploreMenu.css";
import { TRANSLATIONS } from "../../constants/translations";
import { getCategoryEnglish } from "../../constants/categories";
import { useCategories } from "../../hooks/useCategories";
import SafeImage from "../SafeImage/SafeImage";
import { StoreContext } from "../../context/StoreContext";

const ExploreMenu = ({category, setCategory}) => {
  const { categories, loading, error, useFallback, retryFetch } = useCategories();
  const { url } = useContext(StoreContext);

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
              <SafeImage
                src={item.menu_image}
                baseUrl={url}
                fallback="/placeholder-category.svg"
                alt={item.menu_name}
                lazy={true}
                rootMargin="150px"
                onError={(e) => {
                  console.error(`❌ Failed to load category image:`, {
                    category: item.menu_name,
                    imageSrc: item.menu_image,
                    baseUrl: url,
                    fullUrl: item.menu_image ? `${url}${item.menu_image}` : 'No image',
                    error: e
                  });
                }}
                onLoad={() => {
                  console.log(`✅ Successfully loaded category image:`, {
                    category: item.menu_name,
                    imageSrc: item.menu_image,
                    fullUrl: item.menu_image ? `${url}${item.menu_image}` : 'No image'
                  });
                }}
              />
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
