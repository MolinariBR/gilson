import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

/**
 * Middleware to verify admin authentication and authorization
 * Ensures only authenticated admin users can access protected routes
 */
const adminAuthMiddleware = async (req, res, next) => {
  try {
    // Check if token exists
    const { token } = req.headers;
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Token de acesso não fornecido. Faça login novamente.",
        code: "NO_TOKEN"
      });
    }

    // Verify JWT token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: "Token expirado. Faça login novamente.",
          code: "TOKEN_EXPIRED"
        });
      } else if (jwtError.name === 'JsonWebTokenError' || jwtError.message.includes('JsonWebTokenError')) {
        return res.status(401).json({
          success: false,
          message: "Token inválido. Faça login novamente.",
          code: "INVALID_TOKEN"
        });
      } else {
        console.error("JWT verification error:", jwtError);
        return res.status(401).json({
          success: false,
          message: "Token inválido. Faça login novamente.",
          code: "INVALID_TOKEN"
        });
      }
    }

    // Check if user exists and is admin
    const userData = await userModel.findById(decodedToken.id);
    if (!userData) {
      return res.status(401).json({ 
        success: false, 
        message: "Usuário não encontrado. Faça login novamente.",
        code: "USER_NOT_FOUND"
      });
    }

    // Verify admin role
    if (userData.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Acesso negado. Apenas administradores podem acessar este recurso.",
        code: "INSUFFICIENT_PERMISSIONS"
      });
    }

    // Add user data to request for use in controllers
    req.user = {
      id: userData._id,
      name: userData.name,
      role: userData.role
    };

    // Add userId to body for backward compatibility
    req.body.userId = userData._id;

    next();
  } catch (error) {
    console.error("Error in admin auth middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor na autenticação",
      code: "AUTH_ERROR"
    });
  }
};

/**
 * Middleware to log admin actions for security auditing
 */
const adminActionLogger = (action) => {
  return (req, res, next) => {
    // Log admin action with timestamp and user info
    const logData = {
      timestamp: new Date().toISOString(),
      action: action,
      userId: req.user?.id,
      userName: req.user?.name,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      params: req.params,
      body: { ...req.body }
    };

    // Remove sensitive data from logs
    if (logData.body.userId) delete logData.body.userId;
    if (logData.body.password) delete logData.body.password;

    console.log(`[ADMIN_ACTION] ${JSON.stringify(logData)}`);
    next();
  };
};

/**
 * Rate limiting middleware for admin actions
 * Prevents abuse of admin endpoints
 */
const adminRateLimit = () => {
  const attempts = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 100; // Max 100 requests per window per user

  return (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
      return next();
    }

    const now = Date.now();
    const userAttempts = attempts.get(userId) || { count: 0, resetTime: now + WINDOW_MS };

    // Reset counter if window has passed
    if (now > userAttempts.resetTime) {
      userAttempts.count = 0;
      userAttempts.resetTime = now + WINDOW_MS;
    }

    // Check if user has exceeded limit
    if (userAttempts.count >= MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Muitas tentativas. Tente novamente em alguns minutos.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
      });
    }

    // Increment counter
    userAttempts.count++;
    attempts.set(userId, userAttempts);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      const cutoff = now - WINDOW_MS;
      for (const [key, value] of attempts.entries()) {
        if (value.resetTime < cutoff) {
          attempts.delete(key);
        }
      }
    }

    next();
  };
};

export { adminAuthMiddleware, adminActionLogger, adminRateLimit };
export default adminAuthMiddleware;