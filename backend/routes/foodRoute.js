import express from "express";
import { addFood, listFood, removeFood, updateFood } from "../controllers/foodController.js";
import authMiddleware from "../middleware/auth.js";
import { createImageValidationMiddleware, handleMulterError } from "../middleware/imageValidation.js";
import imageCompressionMiddleware from "../middleware/imageCompression.js";

const foodRouter = express.Router();

// Create image validation middleware for food images
const foodImageValidation = createImageValidationMiddleware('image', 'uploads');

foodRouter.post("/add", foodImageValidation, handleMulterError, imageCompressionMiddleware.compressUploadedImages, imageCompressionMiddleware.logCompressionResults, authMiddleware, addFood);
foodRouter.get("/list", listFood);
foodRouter.put("/update", foodImageValidation, handleMulterError, imageCompressionMiddleware.compressUploadedImages, imageCompressionMiddleware.logCompressionResults, authMiddleware, updateFood);
foodRouter.post("/remove", authMiddleware, removeFood);

export default foodRouter;
