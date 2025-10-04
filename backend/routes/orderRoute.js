import express from "express";
import authMiddleware from "../middleware/auth.js";
import { listOrders, placeOrder, updateStatus, userOrders, verifyOrder, mercadoPagoWebhook } from "../controllers/orderController.js";

const orderRouter = express.Router();

// Order placement with authentication and address validation
orderRouter.post("/place", authMiddleware, placeOrder);

// Order verification (used by frontend after payment redirect)
orderRouter.post("/verify", verifyOrder);

// MercadoPago webhook endpoint (no auth middleware - external service)
orderRouter.post("/webhook", mercadoPagoWebhook);

// Admin routes with authentication
orderRouter.post("/status", authMiddleware, updateStatus);
orderRouter.get("/list", authMiddleware, listOrders);

// User-specific routes with authentication
orderRouter.post("/userorders", authMiddleware, userOrders);

export default orderRouter;