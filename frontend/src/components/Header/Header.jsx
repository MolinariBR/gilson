import React from "react";
import "./Header.css";
import { TRANSLATIONS } from "../../constants/translations";
import { assets } from "../../assets/frontend_assets/assets";

const Header = () => {
  // Force cache bust with timestamp
  const imageUrl = `${assets.header_img}?v=${Date.now()}`;
  
  return (
    <div className="header" style={{
      backgroundImage: `url(${imageUrl})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain'
    }}>
      <div className="header-contents">
        <h2>{TRANSLATIONS.header.mainTitle}</h2>
        <p>
          {TRANSLATIONS.header.description}
        </p>
        <button>{TRANSLATIONS.header.viewMenu}</button>
      </div>
    </div>
  );
};

export default Header;
