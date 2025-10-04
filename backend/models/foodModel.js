import mongoose from "mongoose";

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  // Support both legacy string categories and new ObjectId references
  category: { 
    type: mongoose.Schema.Types.Mixed, // Allows both String and ObjectId
    required: true 
  },
  // New field for category ObjectId reference
  categoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'category',
    required: false // Optional during migration period
  },
  // Legacy category name for backward compatibility
  categoryName: { 
    type: String, 
    required: false // Optional during migration period
  }
}, {
  timestamps: true
});

// Index for performance
foodSchema.index({ categoryId: 1 });
foodSchema.index({ category: 1 }); // Keep existing index for backward compatibility

// Virtual to get category information
foodSchema.virtual('categoryInfo', {
  ref: 'category',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true
});

// Method to get category display name (backward compatible)
foodSchema.methods.getCategoryName = function() {
  if (this.categoryName) {
    return this.categoryName;
  }
  if (typeof this.category === 'string') {
    return this.category;
  }
  return this.categoryInfo?.originalName || this.categoryInfo?.name || 'Unknown';
};

const foodModel = mongoose.models.food || mongoose.model("food", foodSchema);

export default foodModel;
