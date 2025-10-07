import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export const connectDB = async () => {
  try {
    // HARDCODED MongoDB Atlas URL - bypass all environment variables
    const mongoUrl = "mongodb+srv://zews21_db_user:AgaFhZK9pzoRxkGC@cluster0.0imkrwc.mongodb.net/pastel-delivery?retryWrites=true&w=majority&appName=Cluster0";
    
    logger.database.info("Tentando conectar ao MongoDB...");
    logger.database.info(`URL: ${mongoUrl.substring(0, 50)}...`);
    
    // Configure mongoose settings BEFORE connecting
    mongoose.set('strictQuery', false);
    
    // Basic connection options - keep it simple
    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000
    };
    
    logger.database.info("Conectando com opções básicas...");
    
    // Connect and wait for it to complete
    const connection = await mongoose.connect(mongoUrl, options);
    
    logger.database.info("✅ Conexão inicial estabelecida");
    
    // Wait for the connection to be ready
    await mongoose.connection.db.admin().ping();
    logger.database.info("✅ Ping ao MongoDB bem-sucedido");
    
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
    
    logger.database.info("✅ MongoDB conectado e pronto para uso");
    return connection;
  } catch (error) {
    logger.database.error("Falha na conexão com MongoDB:", error);
    
    // Retry connection after 5 seconds
    setTimeout(() => {
      logger.database.info("Tentando reconectar ao MongoDB...");
      connectDB();
    }, 5000);
  }
};
