import express from "express";
import { 
  getAllZones, 
  getZoneById, 
  createZone, 
  updateZone, 
  deleteZone, 
  getAllNeighborhoods,
  getNeighborhoodsByZone 
} from "../controllers/zoneController.js";
import { adminAuthMiddleware } from "../middleware/adminAuth.js";

const zoneRouter = express.Router();

// Public neighborhood routes (for frontend use)
zoneRouter.get("/neighborhoods/all", getAllNeighborhoods);
zoneRouter.get("/:zoneId/neighborhoods", getNeighborhoodsByZone);

// Admin-only Zone CRUD routes
zoneRouter.get("/", adminAuthMiddleware, getAllZones);
zoneRouter.get("/:id", adminAuthMiddleware, getZoneById);
zoneRouter.post("/", adminAuthMiddleware, createZone);
zoneRouter.put("/:id", adminAuthMiddleware, updateZone);
zoneRouter.delete("/:id", adminAuthMiddleware, deleteZone);

export default zoneRouter;