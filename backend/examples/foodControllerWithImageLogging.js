// Example: Food Controller with Image Logging Integration
// This shows how to integrate the new image logging system into existing controllers

import foodModel from "../models/foodModel.js";
import fs from "fs";
import { logger, imageLogger } from "../utils/logger.js";

// Add food with comprehensive image logging
const addFood = async (req, res) => {
  const userId = req.user?.id || 'anonymous';
  
  try {
    let imagePath = null;
    
    // Handle image upload with logging
    if (req.file) {
      try {
        // Use the imageLogger wrapper for complete logging
        const uploadResult = await imageLogger.logUpload(
          async () => {
            // Validate image
            const validationChecks = [];
            
            // Check file type
            if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(req.file.mimetype)) {
              throw new Error('Invalid file type');
            }
            validationChecks.push('mimetype');
            
            // Check file size (5MB limit)
            if (req.file.size > 5 * 1024 * 1024) {
              throw new Error('File too large');
            }
            validationChecks.push('size');
            
            // Log successful validation
            logger.image.upload.validation.passed(req.file.originalname, validationChecks, userId);
            
            // Normalize image path
            const normalizedPath = `/uploads/${req.file.filename}`;
            
            // Log file creation
            logger.image.file.created(normalizedPath, req.file.size);
            
            return { path: normalizedPath };
          },
          req.file.originalname,
          req.file.size,
          req.file.mimetype,
          userId
        );
        
        imagePath = uploadResult.path;
        
      } catch (uploadError) {
        // Error already logged by imageLogger.logUpload
        return res.status(400).json({
          success: false,
          message: `Image upload failed: ${uploadError.message}`
        });
      }
    }
    
    // Create food item
    const food = new foodModel({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      image: imagePath,
      category: req.body.category
    });
    
    await food.save();
    
    // Log successful food creation
    logger.backend.info(`Food item created: ${food.name} (ID: ${food._id}) by user ${userId}`);
    
    res.json({
      success: true,
      message: "Food Added",
      data: food
    });
    
  } catch (error) {
    logger.backend.error(`Failed to add food: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: "Error adding food"
    });
  }
};

// Remove food with image cleanup logging
const removeFood = async (req, res) => {
  const userId = req.user?.id || 'anonymous';
  
  try {
    const food = await foodModel.findById(req.body.id);
    
    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found"
      });
    }
    
    // Remove image file if exists
    if (food.image) {
      try {
        const fileSystemPath = food.image.startsWith('/') ? food.image.substring(1) : food.image;
        
        if (fs.existsSync(fileSystemPath)) {
          const stats = fs.statSync(fileSystemPath);
          fs.unlinkSync(fileSystemPath);
          
          // Log file deletion
          logger.image.file.deleted(food.image, `food deletion by user ${userId}`);
          
          logger.backend.info(`Deleted image file: ${food.image} (${stats.size} bytes)`);
        } else {
          // Log missing file (orphaned database reference)
          logger.image.maintenance.orphanDetected(food.image, 'referenced in database but file not found');
        }
      } catch (fileError) {
        // Log file operation error
        logger.image.file.corrupted(food.image, fileError);
        logger.backend.warn(`Failed to delete image file: ${food.image} - ${fileError.message}`);
      }
    }
    
    // Remove from database
    await foodModel.findByIdAndDelete(req.body.id);
    
    logger.backend.info(`Food item removed: ${food.name} (ID: ${food._id}) by user ${userId}`);
    
    res.json({
      success: true,
      message: "Food Removed"
    });
    
  } catch (error) {
    logger.backend.error(`Failed to remove food: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: "Error removing food"
    });
  }
};

// List foods with image serving metrics
const listFood = async (req, res) => {
  try {
    const foods = await foodModel.find({}).populate('category');
    
    // Log performance metrics for large datasets
    if (foods.length > 100) {
      logger.image.performance.metrics('list_foods', 1, 0, 0, 0);
      logger.backend.info(`Listed ${foods.length} food items (large dataset)`);
    }
    
    // Check for orphaned image references
    let orphanedCount = 0;
    for (const food of foods) {
      if (food.image) {
        const fileSystemPath = food.image.startsWith('/') ? food.image.substring(1) : food.image;
        if (!fs.existsSync(fileSystemPath)) {
          logger.image.maintenance.orphanDetected(food.image, `referenced by food ${food._id} but file not found`);
          orphanedCount++;
        }
      }
    }
    
    if (orphanedCount > 0) {
      logger.backend.warn(`Found ${orphanedCount} orphaned image references in food items`);
    }
    
    res.json({
      success: true,
      data: foods
    });
    
  } catch (error) {
    logger.backend.error(`Failed to list foods: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: "Error listing foods"
    });
  }
};

// Update food with image change logging
const updateFood = async (req, res) => {
  const userId = req.user?.id || 'anonymous';
  
  try {
    const food = await foodModel.findById(req.body.id);
    
    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found"
      });
    }
    
    const oldImagePath = food.image;
    let newImagePath = oldImagePath;
    
    // Handle new image upload
    if (req.file) {
      try {
        // Upload new image with logging
        const uploadResult = await imageLogger.logUpload(
          async () => {
            // Validation (same as in addFood)
            const validationChecks = [];
            
            if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(req.file.mimetype)) {
              throw new Error('Invalid file type');
            }
            validationChecks.push('mimetype');
            
            if (req.file.size > 5 * 1024 * 1024) {
              throw new Error('File too large');
            }
            validationChecks.push('size');
            
            logger.image.upload.validation.passed(req.file.originalname, validationChecks, userId);
            
            const normalizedPath = `/uploads/${req.file.filename}`;
            logger.image.file.created(normalizedPath, req.file.size);
            
            return { path: normalizedPath };
          },
          req.file.originalname,
          req.file.size,
          req.file.mimetype,
          userId
        );
        
        newImagePath = uploadResult.path;
        
        // Remove old image if it exists and is different
        if (oldImagePath && oldImagePath !== newImagePath) {
          try {
            const oldFileSystemPath = oldImagePath.startsWith('/') ? oldImagePath.substring(1) : oldImagePath;
            
            if (fs.existsSync(oldFileSystemPath)) {
              fs.unlinkSync(oldFileSystemPath);
              logger.image.file.deleted(oldImagePath, `replaced during food update by user ${userId}`);
            }
          } catch (deleteError) {
            logger.image.file.corrupted(oldImagePath, deleteError);
          }
        }
        
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Image upload failed: ${uploadError.message}`
        });
      }
    }
    
    // Update food item
    const updatedFood = await foodModel.findByIdAndUpdate(req.body.id, {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      image: newImagePath,
      category: req.body.category
    }, { new: true });
    
    logger.backend.info(`Food item updated: ${updatedFood.name} (ID: ${updatedFood._id}) by user ${userId}`);
    
    res.json({
      success: true,
      message: "Food Updated",
      data: updatedFood
    });
    
  } catch (error) {
    logger.backend.error(`Failed to update food: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: "Error updating food"
    });
  }
};

export { addFood, listFood, removeFood, updateFood };