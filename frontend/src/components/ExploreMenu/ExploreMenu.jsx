import React, { useContext, useEffect } from "react";
import "./ExploreMenu.css";
import { TRANSLATIONS } from "../../constants/translations";
import { getCategoryEnglish } from "../../constants/categories";
import { useCategories } from "../../hooks/useCategories";
import SafeImage from "../SafeImage/SafeImage";
import { StoreContext } from "../../context/StoreContext";
import { 
  preloadCriticalCategoryImages, 
  getConnectionOptimizedConfig,
  categoryImageCache 
} from "../../utils/categoryImagePreloader";

const ExploreMenu = ({category, setCategory}) => {
  const { categories, loading, error, useFallback, retryFetch } = useCategories();
  const { url } = useContext(StoreContext);

  // Get connection-optimized configuration
  const connectionConfig = getConnectionOptimizedConfig();

  // Preload critical category images when categories are loaded
  useEffect(() => {
    if (categories && categories.length > 0 && url) {
      preloadCriticalCategoryImages(categories, url, connectionConfig.preloadCount);
      
      // Cleanup expired cache entries
      categoryImageCache.cleanup();
    }
  }, [categories, url, connectionConfig.preloadCount]);

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
  // Log para depuração: exibir todos os nomes das categorias recebidas
  console.log('Categorias para renderizar:', categoriesToRender.map(c => c.menu_name));

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
                categoryId={item._id}
                lazy={connectionConfig.lazy}
                rootMargin={connectionConfig.rootMargin}
                priority={index < 3 ? "high" : "normal"} // First 3 categories get high priority
                onError={(e, details) => {
                  // Error handled by SafeImage fallback - no logging needed
                }}
                onLoad={() => {
                  // Cache successful load
                  categoryImageCache.set(item._id, {
                    imagePath: item.menu_image,
                    loadTime: Date.now(),
                    category: item.menu_name
                  });
                  
                  console.log(`✅ Successfully loaded category image:`, {
                    category: item.menu_name,
                    categoryId: item._id,
                    imageSrc: item.menu_image,
                    fullUrl: item.menu_image && item.menu_image.startsWith('http') 
                      ? item.menu_image 
                      : item.menu_image ? `${url}${item.menu_image}` : 'No image',
                    connectionType: connectionConfig.quality
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
