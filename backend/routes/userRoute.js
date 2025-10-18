import express from "express";
import { loginUser, registerUser, getUserProfile, updateUserProfile } from "../controllers/userController.js";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const userRouter = express.Router();


// Middleware simples de autenticação por token JWT (Authorization: Bearer <token>)
const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Token não fornecido" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId || decoded.id || decoded._id || decoded.sub;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Token inválido" });
  }
};

// Rotas de perfil do usuário autenticado
userRouter.get("/profile", auth, getUserProfile);
userRouter.put("/profile", auth, updateUserProfile);

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);

// Debug route for categories
userRouter.get("/debug-categories", async (req, res) => {
  try {
    const categoryModel = (await import("../models/categoryModel.js")).default;
    const categories = await categoryModel.find({}).lean();
    
    res.json({
      success: true,
      count: categories.length,
      categories: categories.map(cat => ({
        _id: cat._id,
        name: cat.name,
        originalName: cat.originalName,
        image: cat.image,
        isActive: cat.isActive,
        slug: cat.slug
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fix category image paths
userRouter.post("/fix-category-images", async (req, res) => {
  try {
    const categoryModel = (await import("../models/categoryModel.js")).default;
    
    // Update Cervejas category to point to correct image
    const result = await categoryModel.updateOne(
      { name: "Cervejas" },
      { $set: { image: "/uploads/categories/cervejas_1759779585147.jpg" } }
    );
    
    res.json({
      success: true,
      message: "Category image path updated",
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test route for admin login debugging
userRouter.post("/test-login", async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('Test login started at:', new Date().toISOString());
    console.log('Request body:', req.body);
    
    // Test database connection
    const dbTest = await userModel.findOne().limit(1).maxTimeMS(5000);
    console.log('Database connection test:', dbTest ? 'OK' : 'No users found');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    res.json({
      success: true,
      message: 'Test login completed',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      dbConnection: dbTest ? 'OK' : 'No users found'
    });
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('Test login error:', error);
    res.status(500).json({
      success: false,
      message: 'Test login failed',
      error: error.message,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

export default userRouter;
