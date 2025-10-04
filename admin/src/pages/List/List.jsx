import React, { useEffect, useState } from "react";
import "./List.css";
import axios from "axios";
import { toast } from "react-toastify";
import { useContext } from "react";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";
import { getAdminTranslation, getCategoryTranslation } from "../../constants/adminTranslations";

const List = ({ url }) => {
  const navigate = useNavigate();
  const { token,admin } = useContext(StoreContext);
  const [list, setList] = useState([]);

  const fetchList = async () => {
    const response = await axios.get(`${url}/api/food/list`);
    if (response.data.success) {
      setList(response.data.data);
    } else {
      toast.error(getAdminTranslation('messages.error', 'Error'));
    }
  };

  const removeFood = async (foodId) => {
    const response = await axios.post(
      `${url}/api/food/remove`,
      { id: foodId },
      { headers: { token } }
    );
    await fetchList();
    if (response.data.success) {
      toast.success(getAdminTranslation('products.productRemoved', response.data.message));
    } else {
      toast.error(getAdminTranslation('products.errorRemovingProduct', 'Error'));
    }
  };
  useEffect(() => {
    if (!admin && !token) {
      toast.error(getAdminTranslation('authentication.pleaseLoginFirst', 'Please Login First'));
      navigate("/");
    }
    fetchList();
  }, []);

  return (
    <div className="list add flex-col">
      <p>{getAdminTranslation('products.allFoodList', 'All Food List')}</p>
      <div className="list-table">
        <div className="list-table-format title">
          <b>{getAdminTranslation('products.image', 'Image')}</b>
          <b>{getAdminTranslation('products.name', 'Name')}</b>
          <b>{getAdminTranslation('products.category', 'Category')}</b>
          <b>{getAdminTranslation('products.price', 'Price')}</b>
          <b>{getAdminTranslation('products.action', 'Action')}</b>
        </div>
        {list.map((item, index) => {
          return (
            <div key={index} className="list-table-format">
              <img src={`${url}/images/` + item.image} alt="" />
              <p>{item.name}</p>
              <p>{item.category}</p>
              <p>R${item.price}</p>
              <p onClick={() => removeFood(item._id)} className="cursor">
                X
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default List;
