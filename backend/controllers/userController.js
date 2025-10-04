import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";

// login user

const loginUser = async (req, res) => {
  const { name } = req.body;
  try {
    if (!name || name.trim() === "") {
      return res.json({ success: false, message: "Name is required" });
    }

    let user = await userModel.findOne({ name: name.trim() });
    
    // If user doesn't exist, create a new one automatically
    if (!user) {
      user = new userModel({
        name: name.trim(),
        role: "user",
        cartData: {}
      });
      await user.save();
    }

    const role = user.role;
    const token = createToken(user._id);
    res.json({ success: true, token, role, user: { id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      // Handle duplicate key error (shouldn't happen in normal flow but good to handle)
      return res.json({ success: false, message: "Name already exists" });
    }
    res.json({ success: false, message: "Error" });
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
