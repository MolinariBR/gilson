/**
 * Performance monitoring middleware for category routes
 */

/**
 * Middleware to track response times and cache hit rates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const trackPerformance = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.json to capture response data
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Add performance headers
    res.set({
      'X-Response-Time': `${responseTime}ms`,
      'X-Cache-Hit': data && data.cached ? 'true' : 'false'
    });
    
    // Log performance metrics
    console.log(`[CATEGORY PERF] ${req.method} ${req.path} - ${responseTime}ms - Cache: ${data && data.cached ? 'HIT' : 'MISS'}`);
    
    // Call original json method
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware to add cache control headers
 * @param {number} maxAge - Cache max age in seconds
 * @returns {Function} - Express middleware function
 */
export const setCacheHeaders = (maxAge = 3600) => {
  return (req, res, next) => {
    // Set cache headers for GET requests
    if (req.method === 'GET') {
      res.set({
        'Cache-Control': `public, max-age=${maxAge}`,
        'ETag': `"${Date.now()}"`, // Simple ETag based on timestamp
        'Vary': 'Accept-Encoding'
      });
    }
    next();
  };
};

/**
 * Middleware to handle conditional requests (304 Not Modified)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const handleConditionalRequests = (req, res, next) => {
  const ifNoneMatch = req.get('If-None-Match');
  const etag = res.get('ETag');
  
  if (ifNoneMatch && etag && ifNoneMatch === etag) {
    return res.status(304).end();
  }
  
  next();
};

/**
 * Middleware to compress category images response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const enableCompression = (req, res, next) => {
  // Enable gzip compression for JSON responses
  if (req.accepts('gzip')) {
    res.set('Content-Encoding', 'gzip');
  }
  next();
};

/**
 * Rate limiting middleware for category operations
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum requests per window
 * @returns {Function} - Express middleware function
 */
export const rateLimitCategories = (windowMs = 60000, max = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old entries
    for (const [id, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(time => time > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(id);
      } else {
        requests.set(id, validTimestamps);
      }
    }
    
    // Check current client
    const clientRequests = requests.get(clientId) || [];
    const validRequests = clientRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= max) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Add current request
    validRequests.push(now);
    requests.set(clientId, validRequests);
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - validRequests.length),
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
    });
    
    next();
  };
};

/**
 * Middleware to log slow queries
 * @param {number} threshold - Slow query threshold in milliseconds
 * @returns {Function} - Express middleware function
 */
export const logSlowQueries = (threshold = 1000) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      if (duration > threshold) {
        console.warn(`[SLOW QUERY] ${req.method} ${req.path} took ${duration}ms`);
      }
    });
    
    next();
  };
};

/**
 * Middleware to add security headers for category endpoints
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const addSecurityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
};

/**
 * Performance monitoring summary
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalResponseTime: 0,
      slowQueries: 0
    };
  }

  /**
   * Record a request
   * @param {number} responseTime - Response time in milliseconds
   * @param {boolean} cacheHit - Whether it was a cache hit
   * @param {boolean} slowQuery - Whether it was a slow query
   */
  recordRequest(responseTime, cacheHit = false, slowQuery = false) {
    this.metrics.requests++;
    this.metrics.totalResponseTime += responseTime;
    
    if (cacheHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    if (slowQuery) {
      this.metrics.slowQueries++;
    }
  }

  /**
   * Get performance statistics
   * @returns {Object} - Performance statistics
   */
  getStats() {
    const { requests, cacheHits, cacheMisses, totalResponseTime, slowQueries } = this.metrics;
    
    return {
      totalRequests: requests,
      cacheHitRate: requests > 0 ? ((cacheHits / requests) * 100).toFixed(2) + '%' : '0%',
      averageResponseTime: requests > 0 ? Math.round(totalResponseTime / requests) : 0,
      slowQueryRate: requests > 0 ? ((slowQueries / requests) * 100).toFixed(2) + '%' : '0%',
      cacheHits,
      cacheMisses,
      slowQueries
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalResponseTime: 0,
      slowQueries: 0
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware to record metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const recordMetrics = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const cacheHit = res.get('X-Cache-Hit') === 'true';
    const slowQuery = responseTime > 1000;
    
    performanceMonitor.recordRequest(responseTime, cacheHit, slowQuery);
  });
  
  next();
};