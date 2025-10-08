import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  originalName: { 
    type: String, 
    required: true,
    trim: true
  },
  slug: { 
    type: String, 
    required: true,
    trim: true
  },
  image: { 
    type: String, 
    required: false,
    trim: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  order: { 
    type: Number, 
    default: 0
  }
}, {
  timestamps: true
});

const categoryModel = mongoose.models.category || mongoose.model("category", categorySchema);

export default categoryModel;