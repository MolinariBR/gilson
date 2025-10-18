import React from "react";
import "./Orders.css";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useEffect } from "react";
import { assets } from "../../assets/assets";
import { useContext } from "react";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";
import { getAdminTranslation, getOrderStatusTranslation } from "../../constants/adminTranslations";

const Orders = ({ url }) => {
  const navigate = useNavigate();
  const { token, admin } = useContext(StoreContext);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const fetchAllOrder = async () => {
    const response = await axios.get(url + "/api/order/list", {
      headers: { token },
    });
    if (response.data.success) {
      setOrders(response.data.data);
    }
  };

  const fetchAllDrivers = async () => {
    try {
      const response = await axios.get(url + "/api/drivers", {
        headers: { token },
      });
      if (response.data.success) {
        setDrivers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const statusHandler = async (event, orderId) => {
    const response = await axios.post(
      url + "/api/order/status",
      {
        orderId,
        status: event.target.value,
      },
      { headers: { token } }
    );
    if (response.data.success) {
      toast.success(getAdminTranslation('orders.statusUpdated', 'Order status updated successfully'));
      await fetchAllOrder();
    } else {
      toast.error(getAdminTranslation('orders.errorUpdatingStatus', 'Error updating order status'));
    }
  };

  const driverHandler = async (event, orderId) => {
    const driverId = event.target.value;
    try {
      const response = await axios.post(
        url + "/api/order/assign-driver",
        {
          orderId,
          driverId: driverId === 'none' ? null : driverId,
        },
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success(response.data.message);
        await fetchAllOrder();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error(getAdminTranslation('orders.errorUpdatingStatus', 'Error updating order'));
    }
  };
  useEffect(() => {
    if (!admin && !token) {
      toast.error(getAdminTranslation('authentication.pleaseLoginFirst', 'Please Login First'));
      navigate("/");
    }
    fetchAllOrder();
    fetchAllDrivers();
  }, []);

  return (
    <div className="order add">
      <h3>{getAdminTranslation('orders.orderPage', 'Order Page')}</h3>
      <div className="order-list">
        {orders.map((order, index) => (
          <div key={index} className="order-item">
            <img src={assets.parcel_icon} alt="" />
            <div>
              <p className="order-item-food">
                {order.items.map((item, index) => {
                  if (index === order.items.length - 1) {
                    return item.name + " x " + item.quantity;
                  } else {
                    return item.name + " x " + item.quantity + ", ";
                  }
                })}
              </p>
              <p className="order-item-name">
                {order.address.customerName || getAdminTranslation('orders.customer', 'Customer')}
              </p>
              <div className="order-item-address">
                {order.address.street && order.address.number ? (
                  <>
                    <p>{order.address.street + ", " + order.address.number}</p>
                    <p>
                      {order.address.neighborhood && order.address.zone
                        ? order.address.neighborhood + ", " + order.address.zone
                        : order.address.city + ", " + order.address.state + ", " + order.address.country}
                    </p>
                    {order.address.cep && <p>CEP: {order.address.cep}</p>}
                  </>
                ) : (
                  <>
                    <p>{order.address.street + ","}</p>
                    <p>
                      {order.address.city +
                        ", " +
                        order.address.state +
                        ", " +
                        order.address.country +
                        ", " +
                        order.address.zipcode}
                    </p>
                  </>
                )}
              </div>
              {order.address.phone && <p className="order-item-phone">{order.address.phone}</p>}
            </div>
            <p>{getAdminTranslation('orders.items', 'Items')}: {order.items.length}</p>
            <p>${order.amount}</p>
            <div className="order-controls">
              <div className="control-group">
                <label>{getAdminTranslation('orders.status', 'Status')}:</label>
                <select
                  onChange={(event) => statusHandler(event, order._id)}
                  value={order.status}
                >
                  <option value="Food Processing">{getAdminTranslation('orders.foodProcessing', 'Food Processing')}</option>
                  <option value="Out for delivery">{getAdminTranslation('orders.outForDelivery', 'Out for delivery')}</option>
                  <option value="Delivered">{getAdminTranslation('orders.delivered', 'Delivered')}</option>
                </select>
              </div>
              <div className="control-group">
                <label>{getAdminTranslation('drivers.driver', 'Driver')}:</label>
                <select
                  onChange={(event) => driverHandler(event, order._id)}
                  value={order.driver ? order.driver._id : 'none'}
                >
                  <option value="none">{getAdminTranslation('drivers.none', 'None')}</option>
                  {drivers.map((driver) => (
                    <option key={driver._id} value={driver._id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders;
