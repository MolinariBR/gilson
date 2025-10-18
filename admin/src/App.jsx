import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { StoreContext } from "./context/StoreContext";
import Navbar from "./components/Navbar/Navbar";
import Sidebar from "./components/Sidebar/Sidebar";
import Login from "./components/Login/Login";
import Add from "./pages/Add/Add";
import List from "./pages/List/List";
import Orders from "./pages/Orders/Orders";
import Drivers from "./pages/Drivers/Drivers";
import Zones from "./pages/Zones/Zones";
import Categories from "./pages/Categories/Categories";
import "./App.css";

const App = () => {
 const { admin, token, url } = useContext(StoreContext);

 return (
   <div className="app">
     {admin && token ? (
       <>
         <Navbar />
         <hr />
         <div className="app-content">
           <Sidebar />
           <Routes>
             <Route path="/" element={<Navigate to="/list" replace />} />
             <Route path="/add" element={<Add url={url} />} />
             <Route path="/list" element={<List url={url} />} />
             <Route path="/orders" element={<Orders url={url} />} />
             <Route path="/drivers" element={<Drivers url={url} />} />
             <Route path="/zones" element={<Zones url={url} />} />
             <Route path="/categories" element={<Categories url={url} />} />
           </Routes>
         </div>
       </>
     ) : (
       <Login url={url} />
     )}
   </div>
 );
};

export default App;
