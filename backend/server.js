import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from "./config/db.js";
import foodRouter from "./routes/foodRoute.js";
import userRouter from "./routes/userRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import zoneRouter from "./routes/zoneRoute.js";
import categoryRouter from "./routes/categoryRoute.js";
import { logger, errorHandler } from "./utils/logger.js";
import testRouter from "./routes/testRoute.js";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from multiple locations
dotenv.config({ path: path.join(__dirname, '.env') }); // backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') }); // root .env

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
const app = express();
const port = process.env.PORT || 4000;

//middlewares
app.use(express.json());

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
      // Development URLs (only included in development mode)
      ...(process.env.NODE_ENV === 'development' ? [
        'http://localhost:5173', // Development frontend
        'http://localhost:5174', // Development admin
        'http://localhost:4000'  // Development backend
      ] : [])
    ].filter(Boolean); // Remove undefined values
    
    // Allow MercadoPago webhook origins
    const mercadoPagoOrigins = [
      'https://api.mercadopago.com',
      'https://www.mercadopago.com',
      'https://api.mercadolibre.com'
    ];
    
    const allAllowedOrigins = [...allowedOrigins, ...mercadoPagoOrigins];
    
    if (allAllowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // In production, allow same-origin requests (when origin is undefined)
      if (process.env.NODE_ENV === 'production' && !origin) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token', 'x-signature', 'x-request-id']
};

app.use(cors(corsOptions));

// Middleware global para debug e desabilitar Cloudflare
app.use((req, res, next) => {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  // Log detalhado para assets
  if (req.url.includes('/assets/')) {
    logger.assets.info(`🔍 REQUISIÇÃO ASSET: ${req.method} ${req.url}`);
    logger.assets.info(`🔍 Headers: ${JSON.stringify(req.headers.accept)}`);
    logger.assets.info(`🔍 User-Agent: ${req.headers['user-agent']}`);
  }
  
  logger.api.request(req.method, req.url, clientIP);
  
  // Headers anti-Cloudflare para TODAS as respostas
  res.setHeader('CF-Cache-Status', 'BYPASS');
  res.setHeader('CF-Rocket-Loader', 'off');
  res.setHeader('CF-Mirage', 'off');
  res.setHeader('CF-Polish', 'off');
  res.setHeader('CF-ScrapeShield', 'off');
  res.setHeader('Server', 'Express-Custom');
  res.setHeader('X-Debug-Timestamp', Date.now().toString());
  
  next();
});

// CRITICAL: Handle assets AFTER CORS but BEFORE APIs
app.use('/assets', (req, res, next) => {
  logger.assets.info(`Interceptando asset: ${req.method} ${req.path}`);
  
  try {
    // NOVOS NOMES DOS ARQUIVOS APÓS REBUILD
    
    // Frontend CSS (mesmo nome)
    if (req.path.includes('index-C6a7aT4-.css')) {
      logger.assets.info('Servindo CSS do frontend');
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(path.join(__dirname, '../frontend/dist/assets/index-C6a7aT4-.css'));
    }
    
    // Frontend JS (NOVO NOME)
    if (req.path.includes('index-DQa1iJSy.js')) {
      logger.assets.info('Servindo JS do frontend - forçando MIME type');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('CF-Cache-Status', 'BYPASS');
      res.setHeader('CF-Rocket-Loader', 'off');
      return res.sendFile(path.join(__dirname, '../frontend/dist/assets/index-DQa1iJSy.js'));
    }
    
    // Admin CSS (NOVO NOME)
    if (req.path.includes('index-B03NhcvP.css')) {
      logger.assets.info('Servindo CSS do admin');
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(path.join(__dirname, '../admin/dist/assets/index-B03NhcvP.css'));
    }
    
    // Admin JS (NOVO NOME)
    if (req.path.includes('index-r_bhB-z9.js')) {
      logger.assets.info('Servindo JS do admin - forçando MIME type');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('CF-Cache-Status', 'BYPASS');
      res.setHeader('CF-Rocket-Loader', 'off');
      return res.sendFile(path.join(__dirname, '../admin/dist/assets/index-r_bhB-z9.js'));
    }
    
    // MANTER COMPATIBILIDADE COM NOMES ANTIGOS (para cache)
    if (req.path.includes('index-Bl7Y6Pke.js')) {
      logger.assets.info('Redirecionando JS antigo do frontend para novo');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('CF-Cache-Status', 'BYPASS');
      res.setHeader('CF-Rocket-Loader', 'off');
      return res.sendFile(path.join(__dirname, '../frontend/dist/assets/index-DQa1iJSy.js'));
    }
    
    if (req.path.includes('index-Dnk9WlHB.js')) {
      logger.assets.info('Redirecionando JS antigo do admin para novo');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('CF-Cache-Status', 'BYPASS');
      res.setHeader('CF-Rocket-Loader', 'off');
      return res.sendFile(path.join(__dirname, '../admin/dist/assets/index-r_bhB-z9.js'));
    }
    
    if (req.path.includes('index-CAabumZp.css')) {
      logger.assets.info('Redirecionando CSS antigo do admin para novo');
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(path.join(__dirname, '../admin/dist/assets/index-B03NhcvP.css'));
    }
    
    logger.assets.error(`Asset não encontrado: ${req.path}`);
    res.status(404).send('Asset not found');
  } catch (error) {
    logger.assets.error(`Erro ao servir asset ${req.path}:`, error);
    res.status(500).send('Erro interno do servidor');
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
app.use("/images", express.static("uploads"));
app.use("/api/user", userRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);
app.use("/api/zone", zoneRouter);
app.use("/api", categoryRouter);

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
    disableCloudflareOptimizations(res);
    res.sendFile(path.join(__dirname, '../admin/dist/index.html'));
  } else if (req.path.startsWith('/api')) {
    // API routes that don't exist
    logger.api.error(`Rota API não encontrada: ${req.path}`);
    res.status(404).json({ success: false, message: "API endpoint not found" });
  } else {
    // Serve frontend index.html for all other routes
    logger.backend.info(`Servindo frontend HTML para: ${req.path}`);
    disableCloudflareOptimizations(res);
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

app.listen(port, () => {
  logger.app.info(`🚀 Servidor iniciado na porta: ${port}`);
  logger.app.info(`🌐 Frontend: ${process.env.FRONTEND_URL}`);
  logger.app.info(`👨‍💼 Admin: ${process.env.ADMIN_URL}`);
  logger.app.info(`📊 Ambiente: ${process.env.NODE_ENV}`);
});
