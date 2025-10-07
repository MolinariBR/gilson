import foodModel from "../models/foodModel.js";
import userModel from "../models/userModel.js";
import categoryModel from "../models/categoryModel.js";
import fs from "fs";

// Helper function to ensure consistent image path format
const normalizeImagePath = (imagePath) => {
  if (!imagePath) return null;
  
  // Ensure path starts with /uploads/
  if (imagePath.startsWith('/uploads/')) {
    return imagePath;
  }
  
  // Handle case where path already starts with uploads/ (without leading slash)
  if (imagePath.startsWith('uploads/')) {
    return `/${imagePath}`;
  }
  
  // Remove any leading slashes and add /uploads/
  const cleanPath = imagePath.replace(/^\/+/, '');
  return `/uploads/${cleanPath}`;
};

// Helper function to get file system path from database path
const getFileSystemPath = (dbImagePath) => {
  if (!dbImagePath) return null;
  
  // Remove leading slash for file system operations
  return dbImagePath.startsWith('/') ? dbImagePath.substring(1) : dbImagePath;
};

// Helper function to resolve category information
const resolveCategoryInfo = async (categoryInput) => {
  if (!categoryInput) {
    return null;
  }

  // If it's already an ObjectId, find the category
  if (typeof categoryInput === 'object' && categoryInput._id) {
    return categoryInput;
  }

  // If it's a string, try to find the category
  if (typeof categoryInput === 'string') {
    // First try to find by ObjectId string
    if (categoryInput.match(/^[0-9a-fA-F]{24}$/)) {
      const category = await categoryModel.findById(categoryInput);
      if (category) {
        return category;
      }
    }

    // Try to find by original name or Portuguese name
    let category = await categoryModel.findOne({ originalName: categoryInput });
    if (!category) {
      category = await categoryModel.findOne({ name: categoryInput });
    }
    if (!category) {
      // Try to find by slug
      const slug = categoryInput.toLowerCase().replace(/\s+/g, '-');
      category = await categoryModel.findOne({ slug });
    }
    
    return category;
  }

  return null;
};

// add food items
const addFood = async (req, res) => {
  let image_filename = `${req.file.filename}`;
  
  try {
    let userData = await userModel.findById(req.body.userId);
    if (!userData || userData.role !== "admin") {
      return res.json({ success: false, message: "You are not admin" });
    }

    // Resolve category information
    const categoryInfo = await resolveCategoryInfo(req.body.category);
    
    const foodData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      image: normalizeImagePath(image_filename), // Ensure consistent path format
    };

    // Set category fields based on what we found
    if (categoryInfo) {
      foodData.categoryId = categoryInfo._id;
      foodData.categoryName = categoryInfo.name;
      foodData.category = categoryInfo.originalName; // For backward compatibility
    } else {
      // Fallback to legacy string category
      foodData.category = req.body.category;
    }

    const food = new foodModel(foodData);
    await food.save();
    res.json({ success: true, message: "Food Added" });
    
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// all foods
const listFood = async (req, res) => {
  try {
    const foods = await foodModel.find({}).populate('categoryId', 'name originalName slug');
    
    // Transform data to ensure backward compatibility and consistent image URLs
    const transformedFoods = foods.map(food => {
      const foodObj = food.toObject();
      
      // Ensure category field is populated for backward compatibility
      if (food.categoryId && !foodObj.category) {
        foodObj.category = food.categoryId.originalName || food.categoryId.name;
      }
      
      // Ensure consistent image URL format
      if (foodObj.image) {
        foodObj.image = normalizeImagePath(foodObj.image);
      }
      
      return foodObj;
    });
    
    res.json({ success: true, data: transformedFoods });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// remove food item
const removeFood = async (req, res) => {
  try {
    let userData = await userModel.findById(req.body.userId);
    if (userData && userData.role === "admin") {
      const food = await foodModel.findById(req.body.id);
      // Use helper function to get correct file system path
      const imagePath = getFileSystemPath(food.image);
      if (imagePath) {
        fs.unlink(imagePath, () => {});
      }
      await foodModel.findByIdAndDelete(req.body.id);
      res.json({ success: true, message: "Food Removed" });
    } else {
      res.json({ success: false, message: "You are not admin" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// list foods by category (supports both legacy and new category references)
const listFoodsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    let foods = [];

    // Try to find category by various methods
    const categoryInfo = await resolveCategoryInfo(category);
    
    if (categoryInfo) {
      // Search by category ID (new method)
      foods = await foodModel.find({ categoryId: categoryInfo._id }).populate('categoryId', 'name originalName slug');
    }
    
    // Also search by legacy category string for backward compatibility
    const legacyFoods = await foodModel.find({ 
      $or: [
        { category: category },
        { categoryName: category }
      ]
    }).populate('categoryId', 'name originalName slug');
    
    // Merge results and remove duplicates
    const allFoods = [...foods, ...legacyFoods];
    const uniqueFoods = allFoods.filter((food, index, self) => 
      index === self.findIndex(f => f._id.toString() === food._id.toString())
    );

    // Transform data for backward compatibility and consistent image URLs
    const transformedFoods = uniqueFoods.map(food => {
      const foodObj = food.toObject();
      
      // Ensure category field is populated
      if (food.categoryId && !foodObj.category) {
        foodObj.category = food.categoryId.originalName || food.categoryId.name;
      }
      
      // Ensure consistent image URL format
      if (foodObj.image) {
        foodObj.image = normalizeImagePath(foodObj.image);
      }
      
      return foodObj;
    });

    res.json({ success: true, data: transformedFoods });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// update food item
const updateFood = async (req, res) => {
  try {
    let userData = await userModel.findById(req.body.userId);
    if (!userData || userData.role !== "admin") {
      return res.json({ success: false, message: "You are not admin" });
    }

    const updateData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
    };

    // Handle category update
    if (req.body.category) {
      const categoryInfo = await resolveCategoryInfo(req.body.category);
      
      if (categoryInfo) {
        updateData.categoryId = categoryInfo._id;
        updateData.categoryName = categoryInfo.name;
        updateData.category = categoryInfo.originalName;
      } else {
        updateData.category = req.body.category;
      }
    }

    // Handle image update
    if (req.file) {
      const food = await foodModel.findById(req.body.id);
      if (food && food.image) {
        // Use helper function to get correct file system path
        const imagePath = getFileSystemPath(food.image);
        if (imagePath) {
          fs.unlink(imagePath, () => {});
        }
      }
      updateData.image = normalizeImagePath(req.file.filename);
    }

    await foodModel.findByIdAndUpdate(req.body.id, updateData);
    res.json({ success: true, message: "Food Updated" });
    
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

export { addFood, listFood, removeFood, listFoodsByCategory, updateFood, resolveCategoryInfo, normalizeImagePath, getFileSystemPath };
