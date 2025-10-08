import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Initialize MercadoPago client only if token is available
let client = null;
if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
  });
}

// placing user order for frontend
const placeOrder = async (req, res) => {
  const frontend_url = process.env.FRONTEND_URL || "http://localhost:5173";
  try {
    console.log('=== PLACE ORDER DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Address received:', req.body.address);
    console.log('Customer name in address:', req.body.address?.customerName);
    
    // Validate address structure
    const { address } = req.body;
    if (!address.street || !address.number || !address.neighborhood || !address.zone) {
      return res.json({ 
        success: false, 
        message: "Complete address information is required" 
      });
    }

    const newOrder = new orderModel({
      userId: req.body.userId,
      items: req.body.items,
      amount: req.body.amount,
      address: req.body.address,
      phone: req.body.phone || req.body.address?.phone || "11999999999", // Fallback phone
    });
    await newOrder.save();
    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    // Check if MercadoPago is configured
    if (!client) {
      return res.json({ 
        success: false, 
        message: "Payment system not configured. Please contact support." 
      });
    }

    // Create MercadoPago preference
    const preference = new Preference(client);
    
    const items = req.body.items.map((item) => ({
      title: item.name,
      unit_price: item.price,
      quantity: item.quantity,
    }));

    // Add delivery charges
    items.push({
      title: "Delivery Charges",
      unit_price: 2,
      quantity: 1,
    });

    console.log('Creating MercadoPago preference with URLs:');
    console.log('Frontend URL:', frontend_url);
    console.log('Backend URL:', process.env.BACKEND_URL);
    console.log('Order ID:', newOrder._id);

    const preferenceData = {
      items: items,
      back_urls: {
        success: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
        failure: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
        pending: `${frontend_url}/verify?success=pending&orderId=${newOrder._id}`
      },
      external_reference: newOrder._id.toString(),
      notification_url: `${process.env.BACKEND_URL}/api/order/webhook`,
      statement_descriptor: "DELIVERY FOOD"
    };

    const result = await preference.create({ body: preferenceData });
    
    // Store MercadoPago ID for tracking
    await orderModel.findByIdAndUpdate(newOrder._id, { 
      mercadoPagoId: result.id 
    });

    res.json({ success: true, payment_url: result.init_point });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error creating payment preference" });
  }
};

const verifyOrder = async (req, res) => {
  const { orderId, success } = req.body;
  try {
    if (success == "true") {
      await orderModel.findByIdAndUpdate(orderId, { 
        payment: true,
        status: "Paid"
      });
      res.json({ success: true, message: "Paid" });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      res.json({ success: false, message: "Not Paid" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// MercadoPago webhook handler
const mercadoPagoWebhook = async (req, res) => {
  try {
    const { type, data, action } = req.body;
    
    // Log webhook received for debugging
    console.log('MercadoPago webhook received:', { type, action, data });
    
    // Only process payment notifications
    if (type === "payment") {
      const paymentId = data.id;
      
      if (!paymentId) {
        console.log('No payment ID in webhook data');
        return res.status(400).send("Invalid webhook data");
      }
      
      try {
        // Check if MercadoPago is configured
        if (!client) {
          console.log('MercadoPago not configured, ignoring webhook');
          return res.status(200).send("OK");
        }

        // Create Payment instance for API verification
        const payment = new Payment(client);
        
        // Verify payment with MercadoPago API
        const paymentInfo = await payment.get({ id: paymentId });
        
        if (!paymentInfo) {
          console.log(`Payment ${paymentId} not found in MercadoPago`);
          return res.status(404).send("Payment not found");
        }
        
        // Find order by external_reference (order ID)
        const orderId = paymentInfo.external_reference;
        const order = await orderModel.findById(orderId);
        
        if (!order) {
          console.log(`Order ${orderId} not found for payment ${paymentId}`);
          return res.status(404).send("Order not found");
        }
        
        // Update order based on payment status
        let orderStatus = "Pending";
        let paymentStatus = false;
        
        switch (paymentInfo.status) {
          case "approved":
            orderStatus = "Paid";
            paymentStatus = true;
            console.log(`Payment ${paymentId} approved for order ${orderId}`);
            break;
          case "rejected":
          case "cancelled":
            orderStatus = "Failed";
            paymentStatus = false;
            console.log(`Payment ${paymentId} failed for order ${orderId}: ${paymentInfo.status}`);
            break;
          case "pending":
          case "in_process":
            orderStatus = "Pending";
            paymentStatus = false;
            console.log(`Payment ${paymentId} still pending for order ${orderId}`);
            break;
          default:
            console.log(`Unknown payment status ${paymentInfo.status} for payment ${paymentId}`);
            return res.status(200).send("OK"); // Don't update order for unknown status
        }
        
        // Update order with payment information
        await orderModel.findByIdAndUpdate(orderId, {
          payment: paymentStatus,
          status: orderStatus,
          mercadoPagoId: paymentId
        });
        
        console.log(`Order ${orderId} updated: status=${orderStatus}, payment=${paymentStatus}`);
        
      } catch (apiError) {
        console.error('Error verifying payment with MercadoPago API:', apiError);
        // Don't update order if we can't verify payment
        return res.status(500).send("Error verifying payment");
      }
    } else {
      console.log(`Ignoring webhook type: ${type}`);
    }
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Error processing webhook");
  }
};

// user orders for frontend
const userOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({ userId: req.body.userId });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// Listing orders for admin pannel
const listOrders = async (req, res) => {
  try {
    let userData = await userModel.findById(req.body.userId);
    if (userData && userData.role === "admin") {
      const orders = await orderModel.find({});
      
      // Enrich orders with customer names if missing
      const enrichedOrders = await Promise.all(orders.map(async (order) => {
        const orderObj = order.toObject();
        
        // If customerName is missing in address, get it from user
        if (!orderObj.address.customerName) {
          try {
            const customer = await userModel.findById(orderObj.userId);
            if (customer) {
              orderObj.address.customerName = customer.name;
            }
          } catch (error) {
            console.error('Error fetching customer name:', error);
          }
        }
        
        return orderObj;
      }));
      
      res.json({ success: true, data: enrichedOrders });
    } else {
      res.json({ success: false, message: "You are not admin" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// api for updating status
const updateStatus = async (req, res) => {
  try {
    let userData = await userModel.findById(req.body.userId);
    if (userData && userData.role === "admin") {
      await orderModel.findByIdAndUpdate(req.body.orderId, {
        status: req.body.status,
      });
      res.json({ success: true, message: "Status Updated Successfully" });
    }else{
      res.json({ success: false, message: "You are not an admin" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus, mercadoPagoWebhook };
