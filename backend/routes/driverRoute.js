import express from "express";
import {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  getActiveDrivers
} from "../controllers/driverController.js";
import {
  adminAuthMiddleware,
  adminActionLogger,
  adminRateLimit
} from "../middleware/adminAuth.js";
import {
  sanitizeCategoryInput,
  setSecurityHeaders
} from "../middleware/inputSanitization.js";

const driverRouter = express.Router();

// Apply global middleware to all routes
driverRouter.use(setSecurityHeaders);

// Admin routes (require authentication and authorization)
driverRouter.post("/admin/drivers",
  adminAuthMiddleware,
  createDriver
);

driverRouter.get("/admin/drivers",
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('LIST_DRIVERS'),
  sanitizeCategoryInput,
  getAllDrivers
);

driverRouter.get("/admin/drivers/:id",
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('GET_DRIVER'),
  sanitizeCategoryInput,
  getDriverById
);

driverRouter.put("/admin/drivers/:id",
  adminAuthMiddleware,
  updateDriver
);

driverRouter.delete("/admin/drivers/:id",
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('DELETE_DRIVER'),
  sanitizeCategoryInput,
  deleteDriver
);

// Public routes (for frontend)
driverRouter.get("/drivers",
  sanitizeCategoryInput,
  getActiveDrivers
);

export default driverRouter;