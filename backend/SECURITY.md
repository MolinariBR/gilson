# Security Implementation for Category Management

This document describes the comprehensive security measures implemented for the dynamic category management system.

## Overview

The security implementation includes three main components:
1. **Admin Authentication & Authorization** - Ensures only authenticated admin users can manage categories
2. **File Upload Security** - Protects against malicious file uploads with comprehensive validation
3. **Input Sanitization & XSS Prevention** - Prevents injection attacks and sanitizes all user input

## 1. Admin Authentication & Authorization

### Middleware: `adminAuth.js`

#### Features:
- **JWT Token Validation**: Verifies JWT tokens and handles expired/invalid tokens
- **Admin Role Verification**: Ensures only users with "admin" role can access protected endpoints
- **Action Logging**: Logs all admin actions for security auditing
- **Rate Limiting**: Prevents abuse with configurable rate limits (100 requests per 15 minutes per user)
- **Detailed Error Responses**: Provides specific error codes for different authentication failures

#### Usage:
```javascript
import { adminAuthMiddleware, adminActionLogger, adminRateLimit } from '../middleware/adminAuth.js';

// Apply to admin routes
router.post('/admin/categories', 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('CREATE_CATEGORY'),
  createCategory
);
```

#### Error Codes:
- `NO_TOKEN`: No authentication token provided
- `TOKEN_EXPIRED`: JWT token has expired
- `INVALID_TOKEN`: JWT token is invalid or malformed
- `USER_NOT_FOUND`: User account no longer exists
- `INSUFFICIENT_PERMISSIONS`: User is not an admin
- `RATE_LIMIT_EXCEEDED`: Too many requests from user

## 2. File Upload Security

### Middleware: `fileUploadSecurity.js`

#### Features:
- **File Type Validation**: Only allows PNG, JPG, JPEG images
- **File Size Limits**: Maximum 2MB per file
- **Magic Number Validation**: Validates actual file content using file signatures
- **Secure Filename Generation**: Prevents path traversal and filename conflicts
- **Comprehensive Error Handling**: Handles all multer errors with specific messages
- **Automatic Cleanup**: Removes invalid files automatically

#### File Signature Validation:
- **PNG**: Validates `89 50 4E 47 0D 0A 1A 0A` signature
- **JPEG**: Validates `FF D8 FF` signature

#### Usage:
```javascript
import { secureImageUpload, handleUploadErrors, validateUploadedFile } from '../middleware/fileUploadSecurity.js';

router.post('/admin/categories', 
  secureImageUpload,
  handleUploadErrors,
  validateUploadedFile,
  createCategory
);
```

#### Security Features:
- **Path Traversal Prevention**: Secure filename generation prevents `../` attacks
- **File Size Validation**: Both multer-level and post-upload validation
- **MIME Type Spoofing Protection**: Validates both MIME type and file signature
- **Automatic Cleanup**: Invalid files are automatically deleted

## 3. Input Sanitization & XSS Prevention

### Middleware: `inputSanitization.js`

#### Features:
- **HTML Entity Encoding**: Converts dangerous characters to HTML entities
- **Script Pattern Removal**: Removes JavaScript and VBScript patterns
- **SQL Injection Prevention**: Uses parameterized queries (via Mongoose)
- **Field-Specific Sanitization**: Different rules for names, slugs, and image paths
- **Length Validation**: Enforces maximum field lengths
- **Security Headers**: Sets comprehensive security headers

#### Sanitization Rules:

##### Category Names:
- HTML entity encoding for `<`, `>`, `"`, `'`, `&`
- Removal of script patterns (`javascript:`, `vbscript:`, `on*=`)
- Maximum 100 characters
- Preserves accented characters

##### Slugs:
- Converts to lowercase
- Removes accents and special characters
- Only allows `a-z`, `0-9`, and `-`
- Maximum 100 characters

##### Image Paths:
- Removes path traversal attempts (`../`)
- Only allows alphanumeric, hyphens, underscores, and dots
- Validates file extensions
- Maximum 255 characters

#### Usage:
```javascript
import { sanitizeCategoryInput, validateSpecificFields, setSecurityHeaders } from '../middleware/inputSanitization.js';

router.post('/admin/categories', 
  setSecurityHeaders,
  sanitizeCategoryInput,
  validateSpecificFields(['name']),
  createCategory
);
```

#### Security Headers:
- `X-XSS-Protection: 1; mode=block`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'none'`
- Removes `X-Powered-By` header

## 4. Route Security Implementation

### Admin Routes (Protected):
```javascript
// All admin routes require authentication and include security measures
categoryRouter.post("/admin/categories", 
  adminAuthMiddleware,
  adminRateLimit(),
  adminActionLogger('CREATE_CATEGORY'),
  sanitizeCategoryInput,
  validateSpecificFields(['name']),
  secureImageUpload,
  handleUploadErrors,
  validateUploadedFile,
  createCategory,
  cleanupOnError
);
```

### Public Routes (Basic Security):
```javascript
// Public routes have basic security but no admin authentication
categoryRouter.get("/categories", 
  setSecurityHeaders,
  sanitizeCategoryInput,
  getActiveCategories
);
```

## 5. Security Testing

### Test Coverage:
- **Admin Authentication**: 6 test cases covering all authentication scenarios
- **Input Sanitization**: 6 test cases covering XSS prevention and validation
- **File Upload Security**: 20 test cases covering all upload scenarios
- **Security Headers**: Verification of all security headers
- **Rate Limiting**: Tests for rate limit enforcement

### Running Security Tests:
```bash
# Run all security tests
npm test -- security.middleware.test.js fileUploadSecurity.test.js --run

# Run specific test suites
npm test -- security.middleware.test.js --run
npm test -- fileUploadSecurity.test.js --run
```

## 6. Security Best Practices Implemented

### Authentication & Authorization:
- ✅ JWT token validation with proper error handling
- ✅ Role-based access control (admin-only endpoints)
- ✅ Token expiration handling
- ✅ User existence verification
- ✅ Action logging for audit trails

### File Upload Security:
- ✅ File type validation (whitelist approach)
- ✅ File size limits
- ✅ Magic number validation
- ✅ Secure filename generation
- ✅ Path traversal prevention
- ✅ Automatic cleanup of invalid files

### Input Validation & Sanitization:
- ✅ HTML entity encoding
- ✅ Script injection prevention
- ✅ SQL injection prevention (via Mongoose)
- ✅ Field length validation
- ✅ Character set restrictions
- ✅ XSS prevention

### General Security:
- ✅ Security headers implementation
- ✅ Rate limiting
- ✅ Error message sanitization
- ✅ Comprehensive logging
- ✅ Input validation at multiple layers

## 7. Configuration

### Environment Variables:
```bash
# JWT Secret (required)
JWT_SECRET=your-secret-key

# File Upload Configuration
CATEGORY_UPLOAD_PATH=/uploads/categories
CATEGORY_IMAGE_MAX_SIZE=2097152  # 2MB
CATEGORY_CACHE_TTL=3600          # 1 hour
```

### Security Configuration:
- **Max File Size**: 2MB
- **Allowed File Types**: PNG, JPG, JPEG
- **Rate Limit**: 100 requests per 15 minutes per user
- **Max Field Length**: 100 characters (names), 255 characters (image paths)

## 8. Monitoring & Logging

### Admin Action Logging:
All admin actions are logged with:
- Timestamp
- Action type
- User ID and name
- IP address
- User agent
- Request parameters (sanitized)

### Security Event Logging:
- Authentication failures
- Rate limit violations
- File upload violations
- Input sanitization events (development mode)

### Log Format:
```json
{
  "timestamp": "2025-02-10T17:22:23.000Z",
  "action": "CREATE_CATEGORY",
  "userId": "user123",
  "userName": "Admin User",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "params": {"id": "category123"}
}
```

## 9. Security Considerations

### Known Limitations:
- Rate limiting is in-memory (resets on server restart)
- File signature validation covers basic formats only
- No virus scanning (recommended for production)

### Recommendations for Production:
1. **Use Redis for rate limiting** to persist across server restarts
2. **Implement virus scanning** for uploaded files
3. **Add CSP headers** for frontend applications
4. **Use HTTPS** for all communications
5. **Regular security audits** and dependency updates
6. **Monitor logs** for suspicious activity

### Future Enhancements:
- Two-factor authentication for admin users
- IP-based access restrictions
- Advanced file content analysis
- Automated security scanning
- Real-time security monitoring

## 10. Compliance

This implementation addresses common security requirements:
- **OWASP Top 10**: Injection, Broken Authentication, XSS, Insecure Direct Object References
- **Data Protection**: Input validation, output encoding, secure file handling
- **Access Control**: Role-based permissions, authentication verification
- **Security Logging**: Comprehensive audit trails for compliance

The security implementation provides defense-in-depth with multiple layers of protection against common web application vulnerabilities.