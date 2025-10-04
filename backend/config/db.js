import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    // HARDCODED MongoDB Atlas URL - bypass all environment variables
    const mongoUrl = "mongodb+srv://zews21_db_user:AgaFhZK9pzoRxkGC@cluster0.0imkrwc.mongodb.net/pastel-delivery?retryWrites=true&w=majority&appName=Cluster0";
    
    console.log("🔗 Attempting to connect to MongoDB...");
    console.log("🔍 HARDCODED MONGO_URL:", mongoUrl.substring(0, 50) + "...");
    console.log("🔍 Environment MONGO_URL:", process.env.MONGO_URL ? process.env.MONGO_URL.substring(0, 50) + "..." : "NOT SET");
    console.log("🔍 All env vars:", Object.keys(process.env).filter(key => key.includes('MONGO')));
    
    await mongoose.connect(mongoUrl);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("🔍 Full error:", error);
    console.error("Please check your MONGO_URL environment variable and ensure MongoDB is running");
    process.exit(1);
  }
};
