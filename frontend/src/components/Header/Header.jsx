import React from "react";
import "./Header.css";
import { TRANSLATIONS } from "../../constants/translations";

const Header = () => {
  return (
    <div className="header">
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
