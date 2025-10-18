import express from "express";
import authMiddleware from "../middleware/auth.js";
import { listOrders, placeOrder, updateStatus, userOrders, verifyOrder, assignDriver, mercadoPagoWebhook, testMercadoPago } from "../controllers/orderController.js";

const orderRouter = express.Router();

// Test MercadoPago configuration (no auth required for testing)
orderRouter.get("/test-mercadopago", testMercadoPago);

// Order placement with authentication and address validation
orderRouter.post("/place", authMiddleware, placeOrder);

// Order verification (used by frontend after payment redirect)
orderRouter.post("/verify", verifyOrder);

// MercadoPago webhook endpoint (no auth middleware - external service)
orderRouter.post("/webhook", mercadoPagoWebhook);

// Admin routes with authentication
orderRouter.post("/status", authMiddleware, updateStatus);
orderRouter.post("/assign-driver", authMiddleware, assignDriver);
orderRouter.get("/list", authMiddleware, listOrders);

// User-specific routes with authentication
orderRouter.post("/userorders", authMiddleware, userOrders);

export default orderRouter;