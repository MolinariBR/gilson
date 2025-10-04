import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export const connectDB = async () => {
  try {
    // HARDCODED MongoDB Atlas URL - bypass all environment variables
    const mongoUrl = "mongodb+srv://zews21_db_user:AgaFhZK9pzoRxkGC@cluster0.0imkrwc.mongodb.net/pastel-delivery?retryWrites=true&w=majority&appName=Cluster0";
    
    logger.database.info("Tentando conectar ao MongoDB...");
    logger.database.info(`URL hardcoded: ${mongoUrl.substring(0, 50)}...`);
    logger.database.info(`URL do ambiente: ${process.env.MONGO_URL ? process.env.MONGO_URL.substring(0, 50) + "..." : "NÃO DEFINIDA"}`);
    
    await mongoose.connect(mongoUrl);
    logger.database.info("✅ MongoDB conectado com sucesso");
  } catch (error) {
    logger.database.error("Falha na conexão com MongoDB:", error);
    process.exit(1);
  }
};
