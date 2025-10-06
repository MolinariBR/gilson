import React, { useContext, useState } from "react";
import "./LoginPopup.css";
import { assets } from "../../assets/frontend_assets/assets";
import { StoreContext } from "../../context/StoreContext";
import { TRANSLATIONS, getWelcomeMessage } from "../../constants/translations";
import axios from "axios";
import { toast } from "react-toastify";

const LoginPopup = ({ setShowLogin }) => {
  // IGNORAR CONTEXTO - USAR URL LOCAL DIRETA
  const { setToken, setUser } = useContext(StoreContext);
  const [data, setData] = useState({
    name: "",
  });

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData((data) => ({ ...data, [name]: value }));
  };

  const onLogin = async (event) => {
    event.preventDefault();
    if (!data.name || data.name.trim() === "") {
      toast.error(TRANSLATIONS.authentication.pleaseEnterName);
      return;
    }
    
    // FORÇAR URL LOCAL DIRETAMENTE - TESTE DEFINITIVO
    const localUrl = "http://localhost:4000";
    console.log("🚀 TESTE DEFINITIVO - URL:", localUrl);
    console.log("🚀 TESTE DEFINITIVO - Data:", data);
    alert("TESTE: Tentando conectar em " + localUrl);
    
    const response = await axios.post(localUrl + "/api/user/login", data);
    if (response.data.success) {
      setToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      toast.success(getWelcomeMessage(data.name));
      setShowLogin(false);
    } else {
      toast.error(response.data.message);
    }
  };
  return (
    <div className="login-popup">
      <form onSubmit={onLogin} className="login-popup-container">
        <div className="login-popup-title">
          <h2>{TRANSLATIONS.authentication.enterYourName}</h2>
          <img
            onClick={() => setShowLogin(false)}
            src={assets.cross_icon}
            alt=""
          />
        </div>
        <div className="login-popup-inputs">
          <input
            name="name"
            onChange={onChangeHandler}
            value={data.name}
            type="text"
            placeholder={TRANSLATIONS.authentication.yourName}
            required
          />
        </div>
        <button type="submit">{TRANSLATIONS.authentication.enter}</button>
        <div className="login-popup-condition">
          <input type="checkbox" required />
          <p>{TRANSLATIONS.authentication.termsCondition}</p>
        </div>
      </form>
    </div>
  );
};

export default LoginPopup;
