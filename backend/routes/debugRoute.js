import express from "express";
import foodModel from "../models/foodModel.js";
import categoryModel from "../models/categoryModel.js";

const debugRouter = express.Router();

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