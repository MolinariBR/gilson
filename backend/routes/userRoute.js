import express from "express";
import { loginUser, registerUser } from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);

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
