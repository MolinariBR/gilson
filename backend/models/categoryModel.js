import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  originalName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: { 
    type: String, 
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 100
  },
  image: { 
    type: String, 
    required: true,
    trim: true,
    validate: [
      {
        validator: function(v) {
          // Validate that image path starts with correct directory structure
          return v.startsWith('/uploads/categories/') || v.startsWith('/uploads/');
        },
        message: 'Image path must start with /uploads/categories/ or /uploads/'
      },
      {
        validator: function(v) {
          // Validate image path format and file extension
          const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
          const extension = v.split('.').pop()?.toLowerCase();
          
          if (!extension || !allowedExtensions.includes(extension)) {
            return false;
          }
          
          // Validate path structure (no path traversal attempts)
          const pathSegments = v.split('/');
          return !pathSegments.some(segment => 
            segment === '..' || 
            segment === '.' || 
            segment.includes('\\') ||
            segment.includes('<') ||
            segment.includes('>')
          );
        },
        message: 'Image must have valid extension (jpg, jpeg, png, webp, gif) and secure path'
      },
      {
        validator: function(v) {
          // Custom validator for unique image naming format
          if (this.isNew || this.isModified('image')) {
            const filename = v.split('/').pop();
            
            // Check if filename follows the new unique pattern
            const uniquePatternGeneral = /^cat_[a-f0-9]{24}_\d+\.[a-zA-Z0-9]+$/;
            if (uniquePatternGeneral.test(filename)) {
              // If it's a unique format, it must match this category's ID (if available)
              if (this._id) {
                const uniquePattern = new RegExp(`^cat_${this._id}_\\d+\\.[a-zA-Z0-9]+$`);
                return uniquePattern.test(filename);
              }
              // If no ID available yet (new document), allow it but validate format
              return true;
            }
            
            // Allow legacy format for backward compatibility during migration
            const legacyPattern = /^[^/]+_\d+\.[a-zA-Z0-9]+$/;
            if (legacyPattern.test(filename)) {
              return true;
            }
            
            // Allow temporary filenames during initial save (will be updated later)
            const tempPattern = /^temp\.[a-zA-Z0-9]+$|^[^/]+\.[a-zA-Z0-9]+$/;
            return tempPattern.test(filename);
          }
          return true;
        },
        message: 'Image filename must follow the unique naming format (cat_[categoryId]_[timestamp].[ext]) for this category'
      },
      {
        validator: async function(v) {
          // Validate image uniqueness across categories (async validator)
          if (this.isNew || this.isModified('image')) {
            const filename = v.split('/').pop();
            
            // Only check uniqueness for files following the unique pattern
            const uniquePatternGeneral = /^cat_[a-f0-9]{24}_\d+\.[a-zA-Z0-9]+$/;
            if (uniquePatternGeneral.test(filename)) {
              // Extract category ID from filename
              const match = filename.match(/^cat_([a-f0-9]{24})_\d+\.[a-zA-Z0-9]+$/);
              if (match) {
                const filenameCategoryId = match[1];
                
                // Ensure the category ID in filename matches this document's ID
                if (this._id && this._id.toString() !== filenameCategoryId) {
                  return false;
                }
                
                // Check if any other category is using this exact image path
                const existingCategory = await this.constructor.findOne({
                  image: v,
                  _id: { $ne: this._id }
                });
                
                return !existingCategory;
              }
            }
          }
          return true;
        },
        message: 'Image path must be unique and match the category ID in the filename'
      }
    ]
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  order: { 
    type: Number, 
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Static methods for image validation
categorySchema.statics.validateImagePath = function(imagePath) {
  // Validate basic image path format
  if (!imagePath || typeof imagePath !== 'string') {
    return { valid: false, error: 'Image path is required and must be a string' };
  }
  
  // Check if path starts with correct directory
  if (!imagePath.startsWith('/uploads/categories/') && !imagePath.startsWith('/uploads/')) {
    return { valid: false, error: 'Image path must start with /uploads/categories/ or /uploads/' };
  }
  
  // Validate file extension
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const extension = imagePath.split('.').pop()?.toLowerCase();
  
  if (!extension || !allowedExtensions.includes(extension)) {
    return { valid: false, error: 'Image must have valid extension (jpg, jpeg, png, webp, gif)' };
  }
  
  // Validate path structure (no path traversal attempts)
  const pathSegments = imagePath.split('/');
  const hasPathTraversal = pathSegments.some(segment => 
    segment === '..' || 
    segment === '.' || 
    segment.includes('\\') ||
    segment.includes('<') ||
    segment.includes('>')
  );
  
  if (hasPathTraversal) {
    return { valid: false, error: 'Image path contains invalid characters or path traversal attempts' };
  }
  
  return { valid: true };
};

categorySchema.statics.validateUniqueImageNaming = function(imagePath, categoryId) {
  const filename = imagePath.split('/').pop();
  
  // Check if filename follows the unique pattern with the correct category ID
  const uniquePattern = new RegExp(`^cat_${categoryId}_\\d+\\.[a-zA-Z0-9]+$`);
  
  if (uniquePattern.test(filename)) {
    return { valid: true, isUniqueFormat: true };
  }
  
  // Check if it follows unique pattern but with wrong category ID
  const generalUniquePattern = /^cat_[a-f0-9]{24}_\d+\.[a-zA-Z0-9]+$/;
  if (generalUniquePattern.test(filename)) {
    return { valid: false, error: 'Image filename contains wrong category ID' };
  }
  
  // Check if it's legacy format (for backward compatibility)
  const legacyPattern = /^[^/]+_\d+\.[a-zA-Z0-9]+$/;
  if (legacyPattern.test(filename)) {
    return { valid: true, isUniqueFormat: false };
  }
  
  return { valid: false, error: 'Image filename must follow the unique naming format' };
};

// Instance method to generate expected unique image name
categorySchema.methods.generateExpectedImageName = function(originalFilename) {
  if (!this._id) {
    const error = new Error('Category must have an ID to generate unique image name');
    throw error;
  }
  
  const timestamp = Date.now();
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  
  return `cat_${this._id}_${timestamp}.${extension}`;
};

// Pre-save middleware for additional validation
categorySchema.pre('save', function(next) {
  // Additional validation before saving
  if (this.isModified('image') || this.isNew) {
    const validation = this.constructor.validateImagePath(this.image);
    if (!validation.valid) {
      return next(new Error(validation.error));
    }
    
    // If we have an ID and the image follows unique pattern, validate it matches this category
    if (this._id) {
      const filename = this.image.split('/').pop();
      const uniquePatternGeneral = /^cat_[a-f0-9]{24}_\d+\.[a-zA-Z0-9]+$/;
      
      // Only validate unique naming if it follows the unique pattern
      if (uniquePatternGeneral.test(filename)) {
        const uniqueValidation = this.constructor.validateUniqueImageNaming(this.image, this._id);
        if (!uniqueValidation.valid) {
          return next(new Error(uniqueValidation.error));
        }
      }
    }
  }
  
  next();
});

// Indexes for performance optimization
categorySchema.index({ slug: 1 }); // Unique index for slug lookups
categorySchema.index({ isActive: 1 }); // Index for filtering active categories
categorySchema.index({ order: 1 }); // Index for sorting by order
categorySchema.index({ name: 1 }); // Index for name searches and uniqueness checks
categorySchema.index({ originalName: 1 }); // Index for original name searches
categorySchema.index({ isActive: 1, order: 1 }); // Compound index for active categories sorted by order
categorySchema.index({ createdAt: -1 }); // Index for sorting by creation date
categorySchema.index({ updatedAt: -1 }); // Index for sorting by update date

// Indexes for image validation optimization
categorySchema.index({ image: 1 }); // Index for image path uniqueness validation
categorySchema.index({ image: 1, _id: 1 }); // Compound index for image validation queries

const categoryModel = mongoose.models.category || mongoose.model("category", categorySchema);

export default categoryModel;