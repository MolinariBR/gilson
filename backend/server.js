import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from "./config/db.js";
import foodRouter from "./routes/foodRoute.js";
import userRouter from "./routes/userRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import zoneRouter from "./routes/zoneRoute.js";
import categoryRouter from "./routes/categoryRoute.js";
import driverRouter from "./routes/driverRoute.js";
import { logger, errorHandler } from "./utils/logger.js";
import testRouter from "./routes/testRoute.js";

const app = express();

// Serve frontend build assets (dist/assets) para imagens e arquivos estáticos gerados pelo Vite
app.use("/assets", express.static(path.join(__dirname, "../frontend/dist/assets"), {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.css': 'text/css',
      '.js': 'application/javascript'
    };
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }
}));
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from "./config/db.js";
import foodRouter from "./routes/foodRoute.js";
import userRouter from "./routes/userRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import zoneRouter from "./routes/zoneRoute.js";
import categoryRouter from "./routes/categoryRoute.js";
import driverRouter from "./routes/driverRoute.js";
import { logger, errorHandler } from "./utils/logger.js";
import testRouter from "./routes/testRoute.js";
import debugRouter from "./routes/debugRoute.js";
import imageInconsistencyRouter from "./routes/imageInconsistencyRoutes.js";
import { createAssetHandler, assetErrorHandler, mimeTypeFixer } from "./middleware/assetHandler.js";


// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from multiple locations
// First, try to load .env.local for development
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Check if we're in development mode based on loaded NODE_ENV
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  // In development, we already loaded .env.local, which should have all we need
  console.log('🔧 Development mode: using .env.local configuration');
} else {
  // In production, load the production .env file
  dotenv.config({ path: path.join(__dirname, '.env') });
  // And the root .env as fallback
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

// Log loaded environment variables
logger.system.info('Carregando variáveis de ambiente...');
logger.system.info(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configurado' : '❌ Ausente'}`);
logger.system.info(`MONGO_URL: ${process.env.MONGO_URL ? '✅ Configurado' : '❌ Ausente'}`);
logger.system.info(`MERCADOPAGO_ACCESS_TOKEN: ${process.env.MERCADOPAGO_ACCESS_TOKEN ? '✅ Configurado' : '❌ Ausente'}`);
logger.system.info(`FRONTEND_URL: ${process.env.FRONTEND_URL ? '✅ Configurado' : '❌ Ausente'}`);
logger.system.info(`BACKEND_URL: ${process.env.BACKEND_URL ? '✅ Configurado' : '❌ Ausente'}`);

// Environment variable validation
const validateEnvironmentVariables = () => {
  const requiredVars = [
    'JWT_SECRET',
    'MONGO_URL',
    'MERCADOPAGO_ACCESS_TOKEN',
    'FRONTEND_URL',
    'BACKEND_URL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.system.error('Variáveis de ambiente obrigatórias ausentes:', new Error(`Missing: ${missingVars.join(', ')}`));
    missingVars.forEach(varName => {
      logger.system.error(`   - ${varName}`);
    });
    process.exit(1);
  }

  // Validate specific formats
  if (!process.env.MONGO_URL.startsWith('mongodb://') && !process.env.MONGO_URL.startsWith('mongodb+srv://')) {
    console.error('❌ MONGO_URL must be a valid MongoDB connection string');
    process.exit(1);
  }

  if (!process.env.FRONTEND_URL.startsWith('http://') && !process.env.FRONTEND_URL.startsWith('https://')) {
    console.error('❌ FRONTEND_URL must be a valid HTTP/HTTPS URL');
    process.exit(1);
  }

  if (!process.env.BACKEND_URL.startsWith('http://') && !process.env.BACKEND_URL.startsWith('https://')) {
    console.error('❌ BACKEND_URL must be a valid HTTP/HTTPS URL');
    process.exit(1);
  }

  // Optional MercadoPago validation - only if token is provided
  if (process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_ACCESS_TOKEN.includes('your_mercadopago_access_token_here')) {
    console.error('❌ Please replace MERCADOPAGO_ACCESS_TOKEN with your actual MercadoPago access token');
    process.exit(1);
  }

  if (process.env.JWT_SECRET.includes('your_jwt_secret_key_here') || process.env.JWT_SECRET.length < 32) {
    console.error('❌ Please set a secure JWT_SECRET (minimum 32 characters)');
    process.exit(1);
  }

  logger.system.info('✅ Variáveis de ambiente validadas com sucesso');
};

// app config
const port = process.env.PORT || 4000;

//middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure timeouts
app.use((req, res, next) => {
  // Set timeout for all requests (30 seconds)
  req.setTimeout(30000, () => {
    logger.system.error(`Request timeout for ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false, 
        message: 'Request timeout' 
      });
    }
  });
  
  res.setTimeout(30000, () => {
    logger.system.error(`Response timeout for ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false, 
        message: 'Response timeout' 
      });
    }
  });
  
  next();
});

// CORS configuration for single domain deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (same domain, mobile apps, MercadoPago webhooks)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      process.env.BACKEND_URL,
      // SquareCloud domains (both possible variations)
      'https://pastel-delivery.squarecloud.app',
      'https://pastel-delivery.squareweb.app',
      // Development URLs (SEMPRE INCLUIR PARA TESTE)
      'http://localhost:5173', // Development frontend
      'http://localhost:5174', // Development admin
      'http://localhost:4000',  // Development backend
      // Additional development URLs (if needed)
      ...(process.env.NODE_ENV === 'development' ? [
      ] : [])
    ].filter(Boolean); // Remove undefined values
    
    // Allow MercadoPago webhook origins
    const mercadoPagoOrigins = [
      'https://api.mercadopago.com',
      'https://www.mercadopago.com',
      'https://api.mercadolibre.com'
    ];
    
    const allAllowedOrigins = [...allowedOrigins, ...mercadoPagoOrigins];
    
    // DEBUG: Log CORS info
    console.log(`🔧 CORS Check - Origin: ${origin}`);
    console.log(`🔧 CORS Check - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔧 CORS Check - Allowed Origins:`, allAllowedOrigins);
    
    if (allAllowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ CORS ALLOWED for origin: ${origin}`);
      callback(null, true);
    } else {
      // In production, allow same-origin requests (when origin is undefined)
      if (process.env.NODE_ENV === 'production' && !origin) {
        console.log(`✅ CORS ALLOWED (no origin in production)`);
        callback(null, true);
      } else {
        console.warn(`❌ CORS BLOCKED request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token', 'x-signature', 'x-request-id', 'cache-control', 'pragma', 'x-requested-with']
};

app.use(cors(corsOptions));

// Apply MIME type fixer globally
app.use(mimeTypeFixer);

// Middleware para interceptar e corrigir MIME types incorretos
app.use((req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    const ext = path.extname(req.path).toLowerCase();
    
    // Forçar MIME type correto baseado na extensão
    if (ext === '.css' && res.getHeader('Content-Type') !== 'text/css; charset=utf-8') {
      logger.assets.warn(`Corrigindo MIME type para CSS: ${req.path}`);
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if ((ext === '.js' || ext === '.mjs') && !res.getHeader('Content-Type')?.includes('javascript')) {
      logger.assets.warn(`Corrigindo MIME type para JS: ${req.path}`);
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    // Só aplicar JSON MIME type se não for um asset
    if (!req.path.includes('/assets/')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    return originalJson.call(this, data);
  };
  
  next();
});

// Middleware global para logging e headers
app.use((req, res, next) => {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  // Log detalhado para assets
  if (req.url.includes('/assets/')) {
    logger.assets.info(`🔍 REQUISIÇÃO ASSET: ${req.method} ${req.url}`);
  }
  
  logger.api.request(req.method, req.url, clientIP);
  
  // Headers básicos de segurança
  res.setHeader('X-Powered-By', 'Express');
  res.setHeader('X-Debug-Timestamp', Date.now().toString());
  
  // Headers anti-Cloudflare SEMPRE ATIVOS para resolver problemas
  res.setHeader('CF-Cache-Status', 'BYPASS');
  res.setHeader('CF-Rocket-Loader', 'off');
  res.setHeader('CF-Mirage', 'off');
  res.setHeader('CF-Polish', 'off');
  res.setHeader('CF-ScrapeShield', 'off');
  
  // Headers adicionais para forçar bypass do Cloudflare
  res.setHeader('Cache-Control', 'no-transform');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  
  next();
});

// Middleware para detectar e tratar problemas de conectividade
app.use((req, res, next) => {
  // Detectar se é uma requisição problemática
  const isAssetRequest = req.url.includes('/assets/') || req.url.includes('.css') || req.url.includes('.js');
  const isApiRequest = req.url.startsWith('/api/');
  
  if (isAssetRequest || isApiRequest) {
    // Adicionar headers para melhorar conectividade
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=30, max=100');
    
    // Para assets, garantir MIME type correto
    if (isAssetRequest) {
      const ext = path.extname(req.url).toLowerCase();
      if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (ext === '.js') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
    }
  }
  
  next();
});

// CRITICAL: Servir assets estáticos com MIME types forçados
app.use('/assets', (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  
  // FORÇAR MIME types corretos ANTES de qualquer processamento
  if (ext === '.css') {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
  } else if (ext === '.js' || ext === '.mjs') {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  } else if (ext === '.png') {
    res.setHeader('Content-Type', 'image/png');
  } else if (ext === '.jpg' || ext === '.jpeg') {
    res.setHeader('Content-Type', 'image/jpeg');
  } else if (ext === '.svg') {
    res.setHeader('Content-Type', 'image/svg+xml');
  }
  
  // Headers anti-Cloudflare FORÇADOS
  res.setHeader('CF-Cache-Status', 'BYPASS');
  res.setHeader('CF-Rocket-Loader', 'off');
  res.setHeader('CF-Mirage', 'off');
  res.setHeader('CF-Polish', 'off');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Cache headers
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }
  
  logger.assets.info(`Asset request: ${req.path} - MIME: ${res.getHeader('Content-Type')}`);
  next();
}, express.static(path.join(__dirname, '../frontend/dist/assets')));

// Assets do admin com MIME types forçados
app.use('/admin/assets', (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  
  // FORÇAR MIME types corretos
  if (ext === '.css') {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
  } else if (ext === '.js' || ext === '.mjs') {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  } else if (ext === '.png') {
    res.setHeader('Content-Type', 'image/png');
  } else if (ext === '.jpg' || ext === '.jpeg') {
    res.setHeader('Content-Type', 'image/jpeg');
  }
  
  // Headers anti-Cloudflare
  res.setHeader('CF-Cache-Status', 'BYPASS');
  res.setHeader('CF-Rocket-Loader', 'off');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  logger.assets.info(`Admin asset: ${req.path} - MIME: ${res.getHeader('Content-Type')}`);
  next();
}, express.static(path.join(__dirname, '../admin/dist/assets')));

// Rota de fallback para assets específicos que estão falhando
app.get('/assets/:filename', (req, res) => {
  const filename = req.params.filename;
  const ext = path.extname(filename).toLowerCase();
  
  // Tentar encontrar o arquivo em ambos os diretórios
  const possiblePaths = [
    path.join(__dirname, '../frontend/dist/assets', filename),
    path.join(__dirname, '../admin/dist/assets', filename)
  ];
  
  let filePath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      filePath = possiblePath;
      break;
    }
  }
  
  if (!filePath) {
    logger.assets.error(`Asset não encontrado: ${filename}`);
    return res.status(404).json({
      success: false,
      message: 'Asset not found',
      filename: filename
    });
  }
  
  // Definir MIME type correto ANTES de enviar
  const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  };
  
  if (mimeTypes[ext]) {
    res.setHeader('Content-Type', mimeTypes[ext]);
  }
  
  // Headers anti-Cloudflare forçados
  res.setHeader('CF-Rocket-Loader', 'off');
  res.setHeader('CF-Cache-Status', 'BYPASS');
  res.setHeader('CF-Mirage', 'off');
  res.setHeader('CF-Polish', 'off');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-transform, no-cache');
  
  logger.assets.info(`Servindo asset via fallback: ${filename} - MIME: ${mimeTypes[ext] || 'default'}`);
  
  try {
    res.sendFile(filePath);
  } catch (error) {
    logger.assets.error(`Erro ao servir asset ${filename}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error serving asset',
      filename: filename
    });
  }
});

// Rota de teste para verificar headers anti-Cloudflare
app.get('/test-headers', (req, res) => {
  logger.backend.info('Rota de teste de headers acessada');
  res.json({
    message: 'Headers anti-Cloudflare aplicados',
    headers: {
      'CF-Cache-Status': res.getHeader('CF-Cache-Status'),
      'CF-Rocket-Loader': res.getHeader('CF-Rocket-Loader'),
      'Server': res.getHeader('Server')
    },
    timestamp: new Date().toISOString()
  });
});

// Página de teste HTML para debug
app.get('/debug-page', (req, res) => {
  logger.backend.info('Servindo página de debug');
  res.sendFile(path.join(__dirname, 'public/test.html'));
});

// Validate environment variables before starting
validateEnvironmentVariables();

// DB connection
connectDB();

// api endpoints
app.use("/api/food", foodRouter);
// Serve uploads directory for static files with optimized caching headers
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: '1y', // Cache for 1 year
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);
    
    // Set proper MIME types and caching headers for images
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
      // Check if this is a category image with unique naming
      const isCategoryImage = filePath.includes('/categories/') || filename.startsWith('cat_');
      
      if (isCategoryImage) {
        // Optimized cache headers for unique category images
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30 days
        res.setHeader('Vary', 'Accept-Encoding');
        
        // Enhanced ETag for category images
        try {
          const stats = require('fs').statSync(filePath);
          const categoryId = filename.match(/cat_([a-f0-9]{24})_/)?.[1] || 'unknown';
          res.setHeader('ETag', `"cat-${categoryId}-${stats.mtime.getTime()}"`);
        } catch (err) {
          // Fallback ETag if file stats fail
          res.setHeader('ETag', `"cat-${Date.now()}"`);
        }
        
        // Category-specific headers
        res.setHeader('X-Image-Type', 'category');
        res.setHeader('X-Category-Cache', 'optimized');
        
        logger.assets.info(`Serving optimized category image: ${filename} (${ext})`);
      } else {
        // Standard cache for other images
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
        res.setHeader('Vary', 'Accept-Encoding');
        
        logger.assets.info(`Serving optimized image: ${filename} (${ext})`);
      }
      
      // Set proper MIME types for all images
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      
      if (mimeTypes[ext]) {
        res.setHeader('Content-Type', mimeTypes[ext]);
      }
      
      // Common security headers for all images
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }
}));
app.use("/api/user", userRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);
app.use("/api/zone", zoneRouter);
app.use("/api", categoryRouter);
app.use("/api", driverRouter);
app.use("/api/debug", debugRouter);
app.use("/api/admin/image-health", imageInconsistencyRouter);

// Rotas de teste para debug
app.use("/test", testRouter);

// Interceptar arquivos JS que são requisitados diretamente na raiz
app.get('/index-*.js', (req, res) => {
  logger.assets.info(`Interceptando JS na raiz: ${req.path}`);
  
  try {
    if (req.path.includes('index-DQa1iJSy.js')) {
      const filePath = path.join(__dirname, '../frontend/dist/assets/index-DQa1iJSy.js');
      logger.assets.info(`Servindo JS do frontend da raiz: ${filePath}`);
      
      if (!require('fs').existsSync(filePath)) {
        logger.assets.error(`Arquivo não encontrado: ${filePath}`);
        return res.status(404).send('Frontend JS file not found');
      }
      
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('CF-Cache-Status', 'BYPASS');
      res.setHeader('CF-Rocket-Loader', 'off');
      return res.sendFile(filePath);
    }
    
    if (req.path.includes('index-r_bhB-z9.js')) {
      const filePath = path.join(__dirname, '../admin/dist/assets/index-r_bhB-z9.js');
      logger.assets.info(`Servindo JS do admin da raiz: ${filePath}`);
      
      if (!require('fs').existsSync(filePath)) {
        logger.assets.error(`Arquivo não encontrado: ${filePath}`);
        return res.status(404).send('Admin JS file not found');
      }
      
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('CF-Cache-Status', 'BYPASS');
      res.setHeader('CF-Rocket-Loader', 'off');
      return res.sendFile(filePath);
    }
    
    // Arquivos antigos
    if (req.path.includes('index-Bl7Y6Pke.js')) {
      const filePath = path.join(__dirname, '../frontend/dist/assets/index-DQa1iJSy.js');
      logger.assets.info(`Redirecionando JS antigo do frontend (raiz): ${filePath}`);
      
      if (!require('fs').existsSync(filePath)) {
        logger.assets.error(`Arquivo não encontrado: ${filePath}`);
        return res.status(404).send('Frontend JS file not found');
      }
      
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('CF-Cache-Status', 'BYPASS');
      res.setHeader('CF-Rocket-Loader', 'off');
      return res.sendFile(filePath);
    }
    
    logger.assets.error(`JS não reconhecido na raiz: ${req.path}`);
    res.status(404).send('JS file not found');
  } catch (error) {
    logger.assets.error(`Erro ao servir JS da raiz ${req.path}:`, error);
    res.status(500).send('Internal server error');
  }
});

// Assets routes moved to top for priority

// REMOVED: Duplicate assets route that was overriding the priority one

// Serve admin static files
app.use("/admin", express.static(path.join(__dirname, "../admin/dist")));

// Serve frontend static files  
app.use("/", express.static(path.join(__dirname, "../frontend/dist")));

// Middleware para desabilitar Cloudflare em TODAS as respostas HTML
const disableCloudflareOptimizations = (res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('CF-Cache-Status', 'BYPASS');
  res.setHeader('CF-Rocket-Loader', 'off');
  res.setHeader('CF-Mirage', 'off');
  res.setHeader('CF-Polish', 'off');
  res.setHeader('CF-ScrapeShield', 'off');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  res.setHeader('X-Force-Refresh', Date.now().toString());
};

// Rota específica para forçar refresh do frontend
app.get('/force-refresh', (req, res) => {
  logger.backend.info('Forçando refresh do frontend');
  disableCloudflareOptimizations(res);
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Rota específica para forçar refresh do admin
app.get('/admin/force-refresh', (req, res) => {
  logger.backend.info('Forçando refresh do admin');
  disableCloudflareOptimizations(res);
  res.sendFile(path.join(__dirname, '../admin/dist/index.html'));
});

// Servir HTML com headers de no-cache para evitar cache de versão antiga
const serveHTMLWithNoCache = (res, filePath) => {
  disableCloudflareOptimizations(res);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Force-Refresh', Date.now().toString());
  res.sendFile(filePath);
};

// Handle SPA routing ONLY for HTML pages (not assets)
app.get("*", (req, res) => {
  logger.api.request(req.method, req.path, req.ip);
  
  // If it's an assets request that wasn't handled above, return 404
  if (req.path.startsWith('/assets/') || req.path.startsWith('/admin/assets/')) {
    logger.assets.error(`Asset não encontrado: ${req.path}`);
    return res.status(404).send('Asset not found');
  }
  
  // If it's an admin route, serve admin index.html
  if (req.path.startsWith('/admin')) {
    logger.backend.info(`Servindo admin HTML para: ${req.path}`);
    serveHTMLWithNoCache(res, path.join(__dirname, '../admin/dist/index.html'));
  } else if (req.path.startsWith('/api')) {
    // API routes that don't exist
    logger.api.error(`Rota API não encontrada: ${req.path}`);
    res.status(404).json({ success: false, message: "API endpoint not found" });
  } else if (req.path.startsWith('/uploads')) {
    // Static files - let express.static handle it, don't serve HTML
    logger.backend.info(`Arquivo estático não encontrado: ${req.path}`);
    res.status(404).json({ success: false, message: "File not found" });
  } else {
    // Serve frontend index.html for all other routes
    logger.backend.info(`Servindo frontend HTML para: ${req.path}`);
    serveHTMLWithNoCache(res, path.join(__dirname, '../frontend/dist/index.html'));
  }
});

// Asset error handler (deve vir antes dos outros)
app.use(assetErrorHandler);

// Middleware específico para tratar erros de conectividade
app.use((err, req, res, next) => {
  // Log do erro
  logger.system.error(`Erro na requisição ${req.method} ${req.url}:`, err);
  
  // Tratar diferentes tipos de erro
  if (err.code === 'TIMEOUT' || err.message.includes('timeout')) {
    return res.status(408).json({
      success: false,
      message: 'Request timeout - please try again',
      error: 'TIMEOUT'
    });
  }
  
  if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
    return res.status(503).json({
      success: false,
      message: 'Connection error - please try again',
      error: 'CONNECTION_ERROR'
    });
  }
  
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS error',
      error: 'CORS_ERROR'
    });
  }
  
  // Passar para o próximo handler de erro
  next(err);
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

app.listen(port, () => {
  logger.app.info(`🚀 Servidor iniciado na porta: ${port}`);
  logger.app.info(`🌐 Frontend: ${process.env.FRONTEND_URL}`);
  logger.app.info(`👨‍💼 Admin: ${process.env.ADMIN_URL}`);
  logger.app.info(`📊 Ambiente: ${process.env.NODE_ENV}`);
});
