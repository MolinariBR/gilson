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
    validate: {
      validator: function(v) {
        return v.startsWith('/uploads/');
      },
      message: 'Image path must start with /uploads/'
    }
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

// Indexes for performance optimization
categorySchema.index({ slug: 1 }); // Unique index for slug lookups
categorySchema.index({ isActive: 1 }); // Index for filtering active categories
categorySchema.index({ order: 1 }); // Index for sorting by order
categorySchema.index({ name: 1 }); // Index for name searches and uniqueness checks
categorySchema.index({ originalName: 1 }); // Index for original name searches
categorySchema.index({ isActive: 1, order: 1 }); // Compound index for active categories sorted by order
categorySchema.index({ createdAt: -1 }); // Index for sorting by creation date
categorySchema.index({ updatedAt: -1 }); // Index for sorting by update date

const categoryModel = mongoose.models.category || mongoose.model("category", categorySchema);

export default categoryModel;