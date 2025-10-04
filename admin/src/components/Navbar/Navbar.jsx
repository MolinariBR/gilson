import React, { useContext } from "react";
import "./Navbar.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";
import { toast } from "react-toastify";
import {useNavigate } from "react-router-dom";
import { getAdminTranslation } from "../../constants/adminTranslations";

const Navbar = () => {
  const navigate=useNavigate();
  const {token, admin, setAdmin, setToken } = useContext(StoreContext);
  const logout=()=>{
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    setToken("");
    setAdmin(false);
    toast.success(getAdminTranslation('authentication.logoutSuccessfully', 'Logout Successfully'))
    navigate("/");
  }
  return (
    <div className="navbar">
      <img className="logo" src={assets.logo} alt="" />
      {token && admin ? (
        <p className="login-conditon" onClick={logout}>{getAdminTranslation('authentication.logout', 'Logout')}</p>
      ) : (
        <p className="login-conditon" onClick={()=>navigate("/")}>{getAdminTranslation('authentication.login', 'Login')}</p>
      )}
      <img className="profile" src={assets.profile_image} alt="" />
    </div>
  );
};

export default Navbar;
