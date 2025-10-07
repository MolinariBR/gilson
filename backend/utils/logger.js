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
const writeLogToFile = (filename, level, message, error = null, metadata = null) => {
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
    }),
    ...(metadata && { metadata })
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

  // Logs específicos para operações de imagem
  image: {
    // Logs de upload de imagens
    upload: {
      start: (filename, size, mimetype, userId = null) => {
        const message = `Upload iniciado: ${filename} (${size} bytes, ${mimetype})${userId ? ` por usuário ${userId}` : ''}`;
        console.log(`🖼️ [IMAGE-UPLOAD] ${message}`);
        writeLogToFile('images.log', 'UPLOAD_START', message, null, { filename, size, mimetype, userId });
      },
      success: (filename, path, duration, userId = null) => {
        const message = `Upload concluído: ${filename} → ${path} (${duration}ms)${userId ? ` por usuário ${userId}` : ''}`;
        console.log(`✅ [IMAGE-UPLOAD] ${message}`);
        writeLogToFile('images.log', 'UPLOAD_SUCCESS', message, null, { filename, path, duration, userId });
      },
      error: (filename, error, userId = null) => {
        const message = `Falha no upload: ${filename}${userId ? ` por usuário ${userId}` : ''} - ${error.message}`;
        console.error(`❌ [IMAGE-UPLOAD] ${message}`);
        writeLogToFile('images.log', 'UPLOAD_ERROR', message, error, { filename, userId });
        writeLogToFile('errors.log', 'IMAGE_UPLOAD_ERROR', message, error);
      },
      validation: {
        failed: (filename, reason, userId = null) => {
          const message = `Validação falhou: ${filename} - ${reason}${userId ? ` (usuário ${userId})` : ''}`;
          console.warn(`⚠️ [IMAGE-VALIDATION] ${message}`);
          writeLogToFile('images.log', 'VALIDATION_FAILED', message, null, { filename, reason, userId });
        },
        passed: (filename, checks, userId = null) => {
          const message = `Validação passou: ${filename} - ${checks.join(', ')}${userId ? ` (usuário ${userId})` : ''}`;
          console.log(`✅ [IMAGE-VALIDATION] ${message}`);
          writeLogToFile('images.log', 'VALIDATION_PASSED', message, null, { filename, checks, userId });
        }
      }
    },

    // Logs de servir imagens
    serving: {
      request: (imagePath, userAgent, ip) => {
        const message = `Imagem solicitada: ${imagePath} de ${ip}`;
        console.log(`🌐 [IMAGE-SERVE] ${message}`);
        writeLogToFile('images.log', 'SERVE_REQUEST', message, null, { imagePath, userAgent, ip });
      },
      success: (imagePath, size, duration, cached = false) => {
        const message = `Imagem servida: ${imagePath} (${size} bytes, ${duration}ms)${cached ? ' [CACHED]' : ''}`;
        console.log(`📤 [IMAGE-SERVE] ${message}`);
        writeLogToFile('images.log', 'SERVE_SUCCESS', message, null, { imagePath, size, duration, cached });
      },
      notFound: (imagePath, ip) => {
        const message = `Imagem não encontrada: ${imagePath} solicitada de ${ip}`;
        console.warn(`❓ [IMAGE-SERVE] ${message}`);
        writeLogToFile('images.log', 'SERVE_NOT_FOUND', message, null, { imagePath, ip });
        writeLogToFile('missing-images.log', 'MISSING_IMAGE', message, null, { imagePath, ip, timestamp: getTimestamp() });
      },
      error: (imagePath, error, ip) => {
        const message = `Erro ao servir imagem: ${imagePath} para ${ip} - ${error.message}`;
        console.error(`❌ [IMAGE-SERVE] ${message}`);
        writeLogToFile('images.log', 'SERVE_ERROR', message, error, { imagePath, ip });
        writeLogToFile('errors.log', 'IMAGE_SERVE_ERROR', message, error);
      }
    },

    // Logs de operações de arquivo
    file: {
      created: (filePath, size) => {
        const message = `Arquivo criado: ${filePath} (${size} bytes)`;
        console.log(`📁 [IMAGE-FILE] ${message}`);
        writeLogToFile('images.log', 'FILE_CREATED', message, null, { filePath, size });
      },
      deleted: (filePath, reason = 'cleanup') => {
        const message = `Arquivo removido: ${filePath} (motivo: ${reason})`;
        console.log(`🗑️ [IMAGE-FILE] ${message}`);
        writeLogToFile('images.log', 'FILE_DELETED', message, null, { filePath, reason });
      },
      moved: (oldPath, newPath) => {
        const message = `Arquivo movido: ${oldPath} → ${newPath}`;
        console.log(`📦 [IMAGE-FILE] ${message}`);
        writeLogToFile('images.log', 'FILE_MOVED', message, null, { oldPath, newPath });
      },
      corrupted: (filePath, error) => {
        const message = `Arquivo corrompido detectado: ${filePath}`;
        console.error(`💥 [IMAGE-FILE] ${message}`);
        writeLogToFile('images.log', 'FILE_CORRUPTED', message, error, { filePath });
        writeLogToFile('errors.log', 'IMAGE_FILE_CORRUPTED', message, error);
      }
    },

    // Logs de performance
    performance: {
      slowUpload: (filename, duration, threshold = 5000) => {
        if (duration > threshold) {
          const message = `Upload lento detectado: ${filename} levou ${duration}ms (limite: ${threshold}ms)`;
          console.warn(`🐌 [IMAGE-PERF] ${message}`);
          writeLogToFile('images.log', 'SLOW_UPLOAD', message, null, { filename, duration, threshold });
          writeLogToFile('performance.log', 'SLOW_IMAGE_UPLOAD', message, null, { filename, duration, threshold });
        }
      },
      slowServing: (imagePath, duration, threshold = 1000) => {
        if (duration > threshold) {
          const message = `Servir imagem lento: ${imagePath} levou ${duration}ms (limite: ${threshold}ms)`;
          console.warn(`🐌 [IMAGE-PERF] ${message}`);
          writeLogToFile('images.log', 'SLOW_SERVING', message, null, { imagePath, duration, threshold });
          writeLogToFile('performance.log', 'SLOW_IMAGE_SERVING', message, null, { imagePath, duration, threshold });
        }
      },
      metrics: (operation, count, avgDuration, maxDuration, minDuration) => {
        const message = `Métricas de ${operation}: ${count} operações, média ${avgDuration}ms, máx ${maxDuration}ms, mín ${minDuration}ms`;
        console.log(`📊 [IMAGE-METRICS] ${message}`);
        writeLogToFile('images.log', 'PERFORMANCE_METRICS', message, null, { 
          operation, count, avgDuration, maxDuration, minDuration 
        });
        writeLogToFile('performance.log', 'IMAGE_METRICS', message, null, { 
          operation, count, avgDuration, maxDuration, minDuration 
        });
      }
    },

    // Logs de cache
    cache: {
      hit: (imagePath, cacheKey) => {
        const message = `Cache hit: ${imagePath} (chave: ${cacheKey})`;
        console.log(`💾 [IMAGE-CACHE] ${message}`);
        writeLogToFile('images.log', 'CACHE_HIT', message, null, { imagePath, cacheKey });
      },
      miss: (imagePath, cacheKey) => {
        const message = `Cache miss: ${imagePath} (chave: ${cacheKey})`;
        console.log(`💭 [IMAGE-CACHE] ${message}`);
        writeLogToFile('images.log', 'CACHE_MISS', message, null, { imagePath, cacheKey });
      },
      invalidated: (pattern, reason) => {
        const message = `Cache invalidado: padrão ${pattern} (motivo: ${reason})`;
        console.log(`🔄 [IMAGE-CACHE] ${message}`);
        writeLogToFile('images.log', 'CACHE_INVALIDATED', message, null, { pattern, reason });
      }
    },

    // Logs de limpeza e manutenção
    maintenance: {
      cleanup: (deletedCount, freedSpace) => {
        const message = `Limpeza concluída: ${deletedCount} arquivos removidos, ${freedSpace} bytes liberados`;
        console.log(`🧹 [IMAGE-MAINTENANCE] ${message}`);
        writeLogToFile('images.log', 'CLEANUP_COMPLETED', message, null, { deletedCount, freedSpace });
      },
      orphanDetected: (filePath, reason) => {
        const message = `Arquivo órfão detectado: ${filePath} (${reason})`;
        console.warn(`👻 [IMAGE-MAINTENANCE] ${message}`);
        writeLogToFile('images.log', 'ORPHAN_DETECTED', message, null, { filePath, reason });
      },
      migration: (operation, affectedCount, duration) => {
        const message = `Migração ${operation}: ${affectedCount} registros processados em ${duration}ms`;
        console.log(`🔄 [IMAGE-MIGRATION] ${message}`);
        writeLogToFile('images.log', 'MIGRATION_COMPLETED', message, null, { operation, affectedCount, duration });
      }
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

// Utilitários para logging de imagens
export const imageLogger = {
  // Wrapper para medir tempo de operações
  timeOperation: async (operation, operationName, metadata = {}) => {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      // Log de performance se a operação for lenta
      if (operationName.includes('upload')) {
        logger.image.performance.slowUpload(metadata.filename || 'unknown', duration);
      } else if (operationName.includes('serve')) {
        logger.image.performance.slowServing(metadata.imagePath || 'unknown', duration);
      }
      
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.image.performance.metrics(operationName, 1, duration, duration, duration);
      throw error;
    }
  },

  // Wrapper para logging de upload completo
  logUpload: async (uploadOperation, filename, size, mimetype, userId = null) => {
    logger.image.upload.start(filename, size, mimetype, userId);
    
    try {
      const { result, duration } = await imageLogger.timeOperation(
        uploadOperation,
        'upload',
        { filename }
      );
      
      logger.image.upload.success(filename, result.path, duration, userId);
      return result;
    } catch (error) {
      logger.image.upload.error(filename, error, userId);
      throw error;
    }
  },

  // Wrapper para logging de servir imagem
  logServing: async (servingOperation, imagePath, req) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    logger.image.serving.request(imagePath, userAgent, ip);
    
    try {
      const { result, duration } = await imageLogger.timeOperation(
        servingOperation,
        'serve',
        { imagePath }
      );
      
      const size = result.size || 0;
      const cached = result.cached || false;
      
      logger.image.serving.success(imagePath, size, duration, cached);
      return result;
    } catch (error) {
      if (error.code === 'ENOENT' || error.status === 404) {
        logger.image.serving.notFound(imagePath, ip);
      } else {
        logger.image.serving.error(imagePath, error, ip);
      }
      throw error;
    }
  },

  // Coletor de métricas de performance
  performanceCollector: {
    operations: new Map(),
    
    record(operation, duration) {
      if (!this.operations.has(operation)) {
        this.operations.set(operation, []);
      }
      this.operations.get(operation).push(duration);
    },
    
    report() {
      for (const [operation, durations] of this.operations.entries()) {
        if (durations.length > 0) {
          const count = durations.length;
          const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / count);
          const maxDuration = Math.max(...durations);
          const minDuration = Math.min(...durations);
          
          logger.image.performance.metrics(operation, count, avgDuration, maxDuration, minDuration);
        }
      }
      
      // Limpar métricas após reportar
      this.operations.clear();
    }
  }
};

// Middleware para logging automático de servir imagens
export const imageServingMiddleware = (req, res, next) => {
  const originalSend = res.send;
  const originalSendFile = res.sendFile;
  const startTime = Date.now();
  
  // Override res.send para capturar respostas de erro
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    if (res.statusCode === 404) {
      logger.image.serving.notFound(req.path, req.ip || 'unknown');
    } else if (res.statusCode >= 400) {
      logger.image.serving.error(req.path, new Error(`HTTP ${res.statusCode}`), req.ip || 'unknown');
    }
    
    return originalSend.call(this, data);
  };
  
  // Override res.sendFile para capturar envios de arquivo bem-sucedidos
  res.sendFile = function(path, options, callback) {
    const wrappedCallback = (err) => {
      const duration = Date.now() - startTime;
      
      if (err) {
        if (err.code === 'ENOENT') {
          logger.image.serving.notFound(req.path, req.ip || 'unknown');
        } else {
          logger.image.serving.error(req.path, err, req.ip || 'unknown');
        }
      } else {
        // Tentar obter o tamanho do arquivo
        try {
          const stats = fs.statSync(path);
          logger.image.serving.success(req.path, stats.size, duration, false);
        } catch (statErr) {
          logger.image.serving.success(req.path, 0, duration, false);
        }
      }
      
      if (callback) callback(err);
    };
    
    return originalSendFile.call(this, path, options, wrappedCallback);
  };
  
  // Log da requisição inicial
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    logger.image.serving.request(req.path, req.get('User-Agent') || 'unknown', req.ip || 'unknown');
  }
  
  next();
};

// Agendar relatório de métricas a cada 5 minutos
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    imageLogger.performanceCollector.report();
  }, 5 * 60 * 1000); // 5 minutos
}

export default logger;