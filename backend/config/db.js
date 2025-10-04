import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    // Force the correct MongoDB Atlas URL
    const mongoUrl = process.env.MONGO_URL || "mongodb+srv://zews21_db_user:AgaFhZK9pzoRxkGC@cluster0.0imkrwc.mongodb.net/pastel-delivery?retryWrites=true&w=majority&appName=Cluster0";
    
    console.log("🔗 Attempting to connect to MongoDB...");
    console.log("🔍 Using MONGO_URL:", mongoUrl.substring(0, 50) + "...");
    console.log("🔍 Environment MONGO_URL:", process.env.MONGO_URL ? process.env.MONGO_URL.substring(0, 50) + "..." : "NOT SET");
    
    await mongoose.connect(mongoUrl);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("🔍 Full error:", error);
    console.error("Please check your MONGO_URL environment variable and ensure MongoDB is running");
    process.exit(1);
  }
};
