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

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from multiple locations
dotenv.config({ path: path.join(__dirname, '.env') }); // backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') }); // root .env

// Debug: Log loaded environment variables (remove in production)
console.log('🔍 Environment variables loaded:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('MONGO_URL:', process.env.MONGO_URL ? '✅ Set' : '❌ Missing');
console.log('MERCADOPAGO_ACCESS_TOKEN:', process.env.MERCADOPAGO_ACCESS_TOKEN ? '✅ Set' : '❌ Missing');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL ? '✅ Set' : '❌ Missing');
console.log('BACKEND_URL:', process.env.BACKEND_URL ? '✅ Set' : '❌ Missing');

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
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
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

  console.log('✅ Environment variables validated successfully');
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

// Explicit routes for problematic assets
app.get('/assets/index-CAabumZp.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, '../admin/dist/assets/index-CAabumZp.css'));
});

app.get('/assets/index-Dnk9WlHB.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, '../admin/dist/assets/index-Dnk9WlHB.js'));
});

app.get('/assets/index-C6a7aT4-.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, '../frontend/dist/assets/index-C6a7aT4-.css'));
});

app.get('/assets/index-Bl7Y6Pke.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, '../frontend/dist/assets/index-Bl7Y6Pke.js'));
});

// Generic assets route for other files
app.use('/assets', (req, res, next) => {
  const filePath = req.path;
  if (filePath.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
  } else if (filePath.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (filePath.endsWith('.png')) {
    res.setHeader('Content-Type', 'image/png');
  }
  
  // Try frontend assets first
  const frontendAssetPath = path.join(__dirname, '../frontend/dist/assets', filePath);
  if (require('fs').existsSync(frontendAssetPath)) {
    return res.sendFile(frontendAssetPath);
  }
  
  // Then try admin assets
  const adminAssetPath = path.join(__dirname, '../admin/dist/assets', filePath);
  if (require('fs').existsSync(adminAssetPath)) {
    return res.sendFile(adminAssetPath);
  }
  
  res.status(404).send('Asset not found');
});

// Serve admin static files
app.use("/admin", express.static(path.join(__dirname, "../admin/dist")));

// Serve frontend static files  
app.use("/", express.static(path.join(__dirname, "../frontend/dist")));

// Handle SPA routing ONLY for HTML pages (not assets)
app.get("*", (req, res) => {
  // If it's an assets request that wasn't handled above, return 404
  if (req.path.startsWith('/assets/') || req.path.startsWith('/admin/assets/')) {
    return res.status(404).send('Asset not found');
  }
  
  // If it's an admin route, serve admin index.html
  if (req.path.startsWith('/admin')) {
    res.sendFile(path.join(__dirname, '../admin/dist/index.html'));
  } else if (req.path.startsWith('/api')) {
    // API routes that don't exist
    res.status(404).json({ success: false, message: "API endpoint not found" });
  } else {
    // Serve frontend index.html for all other routes
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
});

app.listen(port, () => {
  console.log(`Server Started on port: ${port}`);
});
