import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export const connectDB = async () => {
  try {
    // HARDCODED MongoDB Atlas URL - bypass all environment variables
    const mongoUrl = "mongodb+srv://zews21_db_user:AgaFhZK9pzoRxkGC@cluster0.0imkrwc.mongodb.net/pastel-delivery?retryWrites=true&w=majority&appName=Cluster0";
    
    logger.database.info("Tentando conectar ao MongoDB...");
    logger.database.info(`URL hardcoded: ${mongoUrl.substring(0, 50)}...`);
    logger.database.info(`URL do ambiente: ${process.env.MONGO_URL ? process.env.MONGO_URL.substring(0, 50) + "..." : "NÃO DEFINIDA"}`);
    
    // Configurações otimizadas para evitar timeouts
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10, // Maximum number of connections
      minPoolSize: 2, // Minimum number of connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering
      heartbeatFrequencyMS: 10000, // Heartbeat every 10 seconds
      retryWrites: true,
      retryReads: true
    };
    
    await mongoose.connect(mongoUrl, options);
    
    // Configure mongoose settings
    mongoose.set('strictQuery', false);
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      logger.database.info('✅ MongoDB conectado com sucesso');
    });
    
    mongoose.connection.on('error', (err) => {
      logger.database.error('❌ Erro na conexão MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.database.warn('⚠️ MongoDB desconectado');
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.database.info('MongoDB connection closed through app termination');
      process.exit(0);
    });
    
    logger.database.info("✅ MongoDB conectado com configurações otimizadas");
  } catch (error) {
    logger.database.error("Falha na conexão com MongoDB:", error);
    
    // Retry connection after 5 seconds
    setTimeout(() => {
      logger.database.info("Tentando reconectar ao MongoDB...");
      connectDB();
    }, 5000);
  }
};
