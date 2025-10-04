import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    console.log("🔗 Attempting to connect to MongoDB...");
    console.log("🔍 MONGO_URL:", process.env.MONGO_URL ? process.env.MONGO_URL.substring(0, 50) + "..." : "NOT SET");
    
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("🔍 Full error:", error);
    console.error("Please check your MONGO_URL environment variable and ensure MongoDB is running");
    process.exit(1);
  }
};
