import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Função para formatar timestamp
const getTimestamp = () => {
  return new Date().toISOString();
};

// Função para escrever log em arquivo
const writeLogToFile = (filename, level, message, error = null) => {
  const timestamp = getTimestamp();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(error && { 
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    })
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  const logPath = path.join(logsDir, filename);
  
  try {
    fs.appendFileSync(logPath, logLine);
  } catch (err) {
    console.error('Erro ao escrever log:', err);
  }
};

// Logger principal
export const logger = {
  // Logs do backend
  backend: {
    info: (message) => {
      console.log(`🔵 [BACKEND] ${message}`);
      writeLogToFile('backend.log', 'INFO', message);
    },
    error: (message, error = null) => {
      console.error(`🔴 [BACKEND] ${message}`, error || '');
      writeLogToFile('backend.log', 'ERROR', message, error);
      writeLogToFile('errors.log', 'BACKEND_ERROR', message, error);
    },
    warn: (message) => {
      console.warn(`🟡 [BACKEND] ${message}`);
      writeLogToFile('backend.log', 'WARN', message);
    },
    debug: (message) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 [BACKEND] ${message}`);
        writeLogToFile('backend.log', 'DEBUG', message);
      }
    }
  },

  // Logs de assets
  assets: {
    info: (message) => {
      console.log(`📁 [ASSETS] ${message}`);
      writeLogToFile('assets.log', 'INFO', message);
    },
    error: (message, error = null) => {
      console.error(`🔴 [ASSETS] ${message}`, error || '');
      writeLogToFile('assets.log', 'ERROR', message, error);
      writeLogToFile('errors.log', 'ASSETS_ERROR', message, error);
    }
  },

  // Logs de API
  api: {
    request: (method, url, ip) => {
      const message = `${method} ${url} from ${ip}`;
      console.log(`🌐 [API] ${message}`);
      writeLogToFile('api.log', 'REQUEST', message);
    },
    error: (message, error = null) => {
      console.error(`🔴 [API] ${message}`, error || '');
      writeLogToFile('api.log', 'ERROR', message, error);
      writeLogToFile('errors.log', 'API_ERROR', message, error);
    }
  },

  // Logs de MongoDB
  database: {
    info: (message) => {
      console.log(`🗄️ [DATABASE] ${message}`);
      writeLogToFile('database.log', 'INFO', message);
    },
    error: (message, error = null) => {
      console.error(`🔴 [DATABASE] ${message}`, error || '');
      writeLogToFile('database.log', 'ERROR', message, error);
      writeLogToFile('errors.log', 'DATABASE_ERROR', message, error);
    }
  },

  // Logs de sistema
  system: {
    info: (message) => {
      console.log(`⚙️ [SYSTEM] ${message}`);
      writeLogToFile('system.log', 'INFO', message);
    },
    error: (message, error = null) => {
      console.error(`🔴 [SYSTEM] ${message}`, error || '');
      writeLogToFile('system.log', 'ERROR', message, error);
      writeLogToFile('errors.log', 'SYSTEM_ERROR', message, error);
    }
  },

  // Log geral de aplicação
  app: {
    info: (message) => {
      console.log(`🚀 [APP] ${message}`);
      writeLogToFile('app.log', 'INFO', message);
    },
    error: (message, error = null) => {
      console.error(`🔴 [APP] ${message}`, error || '');
      writeLogToFile('app.log', 'ERROR', message, error);
      writeLogToFile('errors.log', 'APP_ERROR', message, error);
    }
  }
};

// Middleware para capturar erros não tratados
export const errorHandler = (err, req, res, next) => {
  logger.system.error('Erro não tratado capturado:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
};

// Capturar erros não tratados do processo
process.on('uncaughtException', (error) => {
  logger.system.error('Exceção não capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.system.error('Promise rejeitada não tratada:', reason);
});

export default logger;