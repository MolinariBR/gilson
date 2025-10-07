import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Middleware para handling otimizado de assets estáticos
 */
export const createAssetHandler = (assetPath, options = {}) => {
  const {
    maxAge = process.env.NODE_ENV === 'production' ? '1d' : 0,
    enableCaching = process.env.NODE_ENV === 'production',
    logRequests = true
  } = options;

  return (req, res, next) => {
    const filePath = req.path;
    const ext = path.extname(filePath).toLowerCase();
    
    if (logRequests) {
      logger.assets.info(`Asset request: ${req.method} ${filePath}`);
    }

    // MIME types mapping
    const mimeTypes = {
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.otf': 'font/otf',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.xml': 'application/xml; charset=utf-8'
    };

    // Set correct MIME type BEFORE any other headers
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
      logger.assets.debug(`Set MIME type for ${ext}: ${mimeTypes[ext]}`);
    }

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Caching headers
    if (enableCaching) {
      res.setHeader('Cache-Control', `public, max-age=${maxAge === '1d' ? 86400 : maxAge}`);
      res.setHeader('ETag', `"${Date.now()}"`);
      res.setHeader('Last-Modified', new Date().toUTCString());
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Connection headers for better performance
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=30, max=100');

    // Compression hint
    if (['.css', '.js', '.json', '.svg', '.html', '.xml'].includes(ext)) {
      res.setHeader('Vary', 'Accept-Encoding');
    }

    next();
  };
};

/**
 * Middleware para handling de erros de assets
 */
export const assetErrorHandler = (err, req, res, next) => {
  if (req.path.includes('/assets/') || req.path.includes('/uploads/')) {
    logger.assets.error(`Asset error for ${req.path}:`, err);
    
    // Return appropriate error for assets
    if (err.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
        path: req.path
      });
    }
    
    if (err.code === 'TIMEOUT') {
      return res.status(408).json({
        success: false,
        message: 'Asset request timeout',
        path: req.path
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Asset server error',
      path: req.path
    });
  }
  
  next(err);
};

/**
 * Middleware para detectar e corrigir problemas de MIME type
 */
export const mimeTypeFixer = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    // Se não há Content-Type definido, tentar detectar
    if (!res.getHeader('Content-Type')) {
      const ext = path.extname(req.path).toLowerCase();
      
      if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (ext === '.js' || ext === '.mjs') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (typeof data === 'string' && data.trim().startsWith('<!DOCTYPE')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
    }
    
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson.call(this, data);
  };
  
  next();
};

export default {
  createAssetHandler,
  assetErrorHandler,
  mimeTypeFixer
};