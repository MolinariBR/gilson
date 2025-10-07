import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";

// login user

const loginUser = async (req, res) => {
  // Set timeout for login operation
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      console.error('Login timeout for user:', req.body?.name);
      res.status(408).json({
        success: false,
        message: "Login timeout - please try again"
      });
    }
  }, 20000); // 20 seconds timeout

  const { name } = req.body;
  try {
    console.log('Login attempt for user:', name);
    
    if (!name || name.trim() === "") {
      clearTimeout(timeoutId);
      return res.json({ success: false, message: "Name is required" });
    }

    console.log('Searching for user in database...');
    let user = await userModel.findByNameWithTimeout(name, 15000); // 15s DB timeout
    
    // If user doesn't exist, create a new one automatically
    if (!user) {
      console.log('User not found, creating new user...');
      user = new userModel({
        name: name.trim(),
        role: "user",
        cartData: {}
      });
      await user.save();
      console.log('New user created successfully');
    } else {
      console.log('Existing user found:', user._id);
    }

    console.log('Generating JWT token...');
    const role = user.role;
    const token = createToken(user._id);
    
    // Clear timeout before sending response
    clearTimeout(timeoutId);
    
    if (!res.headersSent) {
      console.log('Login successful for user:', name);
      res.json({ 
        success: true, 
        token, 
        role, 
        user: { 
          id: user._id, 
          name: user.name, 
          role: user.role 
        } 
      });
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Login error for user:', name, error);
    
    if (!res.headersSent) {
      if (error.code === 11000) {
        // Handle duplicate key error
        return res.json({ success: false, message: "Name already exists" });
      }
      
      if (error.name === 'MongoTimeoutError' || error.message.includes('timeout')) {
        return res.status(408).json({ 
          success: false, 
          message: "Database timeout - please try again" 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Login error - please try again",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// Create token

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET);
};

// register user (now same as login since we auto-create users)

const registerUser = async (req, res) => {
  // Redirect to login function since we now auto-create users
  return loginUser(req, res);
};

export { loginUser, registerUser };
