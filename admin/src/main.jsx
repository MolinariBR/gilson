import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import App from "./App.jsx";
import StoreContextProvider from "./context/StoreContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
 <React.StrictMode>
   <BrowserRouter
     future={{
       v7_startTransition: true,
       v7_relativeSplatPath: true,
     }}
   >
     <StoreContextProvider>
       <App />
       <ToastContainer />
     </StoreContextProvider>
   </BrowserRouter>
 </React.StrictMode>
);
