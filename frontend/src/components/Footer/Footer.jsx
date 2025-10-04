import React from "react";
import "./Footer.css";
import { assets } from "../../assets/frontend_assets/assets";
import { TRANSLATIONS } from "../../constants/translations";

const Footer = () => {
  return (
    <div className="footer" id="footer">
      <div className="footer-content">
        <div className="footer-content-left">
          <img src={assets.logo} alt="" />
          <p>
            {TRANSLATIONS.footer.description}
          </p>
          <div className="footer-social-icons">
            <img src={assets.facebook_icon} alt="" />
            <img src={assets.twitter_icon} alt="" />
            <img src={assets.linkedin_icon} alt="" />
          </div>
        </div>
        <div className="footer-content-center">
          <h2>{TRANSLATIONS.footer.company}</h2>
          <ul>
            <li>{TRANSLATIONS.footer.home}</li>
            <li>{TRANSLATIONS.footer.aboutUs}</li>
            <li>{TRANSLATIONS.footer.delivery}</li>
            <li>{TRANSLATIONS.footer.privacyPolicy}</li>
          </ul>
        </div>
        <div className="footer-content-right">
          <h2>{TRANSLATIONS.footer.getInTouch}</h2>
          <ul>
            <li>+92-308-4900522</li>
            <li>contact@tomato.com</li>
          </ul>
        </div>
      </div>
      <hr />
      <p className="footer-copyright">
        {TRANSLATIONS.footer.copyright}
      </p>
    </div>
  );
};

export default Footer;
