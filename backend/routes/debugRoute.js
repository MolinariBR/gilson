import express from "express";
import foodModel from "../models/foodModel.js";
import categoryModel from "../models/categoryModel.js";

const debugRouter = express.Router();

// Debug route to list actual files in uploads directory
debugRouter.get("/files", async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const uploadsDir = 'uploads';
    const categoriesDir = 'uploads/categories';
    
    let uploadsFiles = [];
    let categoriesFiles = [];
    
    // List files in uploads/
    if (fs.existsSync(uploadsDir)) {
      uploadsFiles = fs.readdirSync(uploadsDir).filter(file => 
        fs.statSync(`${uploadsDir}/${file}`).isFile()
      );
    }
    
    // List files in uploads/categories/
    if (fs.existsSync(categoriesDir)) {
      categoriesFiles = fs.readdirSync(categoriesDir).filter(file => 
        fs.statSync(`${categoriesDir}/${file}`).isFile()
      );
    }
    
    res.json({
      success: true,
      uploadsDir: {
        exists: fs.existsSync(uploadsDir),
        files: uploadsFiles,
        count: uploadsFiles.length
      },
      categoriesDir: {
        exists: fs.existsSync(categoriesDir),
        files: categoriesFiles,
        count: categoriesFiles.length
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Debug route to check food items and their image URLs
debugRouter.get("/food-images", async (req, res) => {
  try {
    const foods = await foodModel.find({}).limit(10);
    const categories = await categoryModel.find({}).limit(10);
    
    const foodDebug = foods.map(food => ({
      id: food._id,
      name: food.name,
      image: food.image,
      imageType: typeof food.image,
      imageStartsWithSlash: food.image?.startsWith('/'),
      imageStartsWithHttp: food.image?.startsWith('http')
    }));
    
    const categoryDebug = categories.map(cat => ({
      id: cat._id,
      name: cat.name,
      image: cat.image,
      imageType: typeof cat.image,
      imageStartsWithSlash: cat.image?.startsWith('/'),
      imageStartsWithHttp: cat.image?.startsWith('http')
    }));
    
    res.json({
      success: true,
      totalFoods: foods.length,
      totalCategories: categories.length,
      foods: foodDebug,
      categories: categoryDebug,
      serverInfo: {
        uploadsPath: '/uploads',
        imagesPath: '/images'
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

export default debugRouter;