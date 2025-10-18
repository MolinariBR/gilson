import React, { useContext, useEffect, useState } from "react";
import "./MyOrders.css";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import { assets } from "../../assets/frontend_assets/assets";
import { TRANSLATIONS, getOrderStatusTranslation } from "../../constants/translations";

const MyOrders = () => {
  const { url, token } = useContext(StoreContext);
  const [data, setData] = useState([]);

  const fetchOrders = async () => {
    const response = await axios.post(
      url + "/api/order/userorders",
      {},
      { headers: { token } }
    );
    if (response.data.success) {
      setData(response.data.data);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);
  return (
    <div className="my-orders">
      <h2>{TRANSLATIONS.order.orders}</h2>
      <div className="container">
        {data.map((order, index) => {
          return (
            <div key={index} className="my-orders-order">
              <img src={assets.parcel_icon} alt="" />
              <p>
                {order.items.map((item, index) => {
                  if (index === order.items.length - 1) {
                    return item.name + " X " + item.quantity;
                  } else {
                    return item.name + " X " + item.quantity + ",";
                  }
                })}
              </p>
              <p>${order.amount}.00</p>
              <p>{TRANSLATIONS.order.items}: {order.items.length}</p>
              <p>
                <span>&#x25cf;</span>
                <b> {getOrderStatusTranslation(order.status)}</b>
              </p>
              {order.driver ? (
                <div className="driver-info">
                  <p className="driver-name">{TRANSLATIONS.order.driver}: {order.driver.name}</p>
                  <a
                    href={`https://wa.me/${order.driver.whatsapp}?text=${encodeURIComponent(
                      `Olá ${order.driver.name}, estou acompanhando meu pedido #${order._id.slice(-6)}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="track-button whatsapp"
                  >
                    {TRANSLATIONS.order.contactDriver}
                  </a>
                </div>
              ) : (
                <button className="track-button disabled" disabled>
                  {TRANSLATIONS.order.driverNotAssigned}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyOrders;
