# Image Validation Middleware

This middleware provides comprehensive image upload validation for the backend API.

## Features

- **File Type Validation**: Supports JPG, JPEG, PNG, GIF, and WebP formats
- **File Size Validation**: Maximum 5MB file size limit
- **Image Dimension Validation**: Optional validation using Sharp (if available)
- **Security**: Validates both MIME type and file extension
- **Error Handling**: Comprehensive error messages and cleanup

## Usage

```javascript
import { createImageValidationMiddleware, handleMulterError } from '../middleware/imageValidation.js';

// Create middleware for specific upload path
const imageValidation = createImageValidationMiddleware('image', 'uploads/categories');

// Use in routes
router.post('/upload', imageValidation, handleMulterError, (req, res) => {
  // req.file contains the validated uploaded file
  // req.imageValidation contains validation metadata
});
```

## Configuration

- **MAX_FILE_SIZE**: 5MB (5 * 1024 * 1024 bytes)
- **MAX_WIDTH**: 2048px (requires Sharp)
- **MAX_HEIGHT**: 2048px (requires Sharp)
- **ALLOWED_TYPES**: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

## Dependencies

- **multer**: Required for file upload handling
- **sharp**: Optional for image dimension validation

## Error Responses

The middleware returns standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Integration

This middleware has been integrated into:
- Food routes (`/api/food/add`)
- Category routes (`/admin/categories/*`)