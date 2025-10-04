import React, { useContext, useEffect, useState } from "react";
import "./PlaceOrder.css";
import { StoreContext } from "../../context/StoreContext";
import { TRANSLATIONS } from "../../constants/translations";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom'

const PlaceOrder = () => {
  const navigate= useNavigate();

  const { getTotalCartAmount, token, food_list, cartItems, url, user } =
    useContext(StoreContext);
  const [data, setData] = useState({
    street: "",
    number: "",
    neighborhood: "",
    cep: "",
  });

  const [neighborhoods, setNeighborhoods] = useState([]);
  const [selectedZone, setSelectedZone] = useState("");

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData((data) => ({ ...data, [name]: value }));
  };

  const onNeighborhoodChange = (event) => {
    const selectedNeighborhood = event.target.value;
    const neighborhoodData = neighborhoods.find(n => n.neighborhood === selectedNeighborhood);
    
    setData(prev => ({ 
      ...prev, 
      neighborhood: selectedNeighborhood 
    }));
    
    if (neighborhoodData) {
      setSelectedZone(neighborhoodData.zone);
    }
  };

  // Fetch neighborhoods on component mount
  useEffect(() => {
    const fetchNeighborhoods = async () => {
      try {
        const response = await axios.get(url + "/api/zone/neighborhoods/all");
        if (response.data.success) {
          setNeighborhoods(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching neighborhoods:", error);
        toast.error(TRANSLATIONS.validation.failedToLoadNeighborhoods);
      }
    };
    
    fetchNeighborhoods();
  }, [url]);

  const placeOrder = async (event) => {
    event.preventDefault();
    
    console.log('=== PLACE ORDER FRONTEND DEBUG ===');
    console.log('User from context:', user);
    console.log('User name:', user?.name);
    
    let orderItems = [];
    food_list.map((item) => {
      if (cartItems[item._id] > 0) {
        let itemInfo = item;
        itemInfo["quantity"] = cartItems[item._id];
        orderItems.push(itemInfo);
      }
    });
    // Validate required fields
    if (!data.street || !data.number || !data.neighborhood) {
      toast.error(TRANSLATIONS.validation.fillRequiredFields);
      return;
    }

    let orderData = {
      address: {
        street: data.street,
        number: data.number,
        neighborhood: data.neighborhood,
        zone: selectedZone,
        cep: data.cep || "",
        customerName: user?.name || "Cliente"
      },
      items: orderItems,
      amount: getTotalCartAmount() + 2,
    };
    
    console.log('Order data being sent:', JSON.stringify(orderData, null, 2));
    
    let response = await axios.post(url + "/api/order/place", orderData, {headers: {token}});
    if (response.data.success) {
      const {payment_url} = response.data;
      window.location.replace(payment_url);
    } else {
      toast.error(response.data.message || TRANSLATIONS.validation.errorPlacingOrder);
    }
  };

  useEffect(()=>{
    if(!token){
      toast.error(TRANSLATIONS.authentication.pleaseLoginFirst)
      navigate("/cart")
    }
    else if(getTotalCartAmount()===0){
      toast.error(TRANSLATIONS.cart.pleaseAddItems);
      navigate("/cart")
    }
  },[token])
  return (
    <form className="place-order" onSubmit={placeOrder}>
      <div className="place-order-left">
        <p className="title">{TRANSLATIONS.order.deliveryInformation}</p>
        <div className="multi-fields">
          <input
            required
            name="street"
            value={data.street}
            onChange={onChangeHandler}
            type="text"
            placeholder={TRANSLATIONS.order.street}
          />
          <input
            required
            name="number"
            value={data.number}
            onChange={onChangeHandler}
            type="text"
            placeholder={TRANSLATIONS.order.number}
          />
        </div>
        <select
          required
          name="neighborhood"
          value={data.neighborhood}
          onChange={onNeighborhoodChange}
        >
          <option value="">{TRANSLATIONS.order.selectNeighborhood}</option>
          {neighborhoods.map((item, index) => (
            <option key={index} value={item.neighborhood}>
              {item.neighborhood} ({item.zone})
            </option>
          ))}
        </select>
        <input
          name="cep"
          value={data.cep}
          onChange={onChangeHandler}
          type="text"
          placeholder={TRANSLATIONS.order.cep}
        />
        {selectedZone && (
          <div className="zone-info">
            <p><strong>{TRANSLATIONS.order.deliveryZone}:</strong> {selectedZone}</p>
          </div>
        )}
      </div>
      <div className="place-order-right">
        <div className="cart-total">
          <h2>{TRANSLATIONS.cart.cartTotals}</h2>
          <div>
            <div className="cart-total-details">
              <p>{TRANSLATIONS.cart.subtotal}</p>
              <p>${getTotalCartAmount()}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>{TRANSLATIONS.cart.deliveryFee}</p>
              <p>${getTotalCartAmount() === 0 ? 0 : 2}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <b>{TRANSLATIONS.cart.total}</b>
              <b>
                ${getTotalCartAmount() === 0 ? 0 : getTotalCartAmount() + 2}
              </b>
            </div>
          </div>
          <button type="submit">{TRANSLATIONS.order.proceedToPayment}</button>
        </div>
      </div>
    </form>
  );
};

export default PlaceOrder;
