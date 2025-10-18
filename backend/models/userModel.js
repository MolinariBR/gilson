import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    whatsapp: { type: String, default: "" },
    address: {
      street: { type: String, default: "" },
      number: { type: String, default: "" },
      neighborhood: { type: String, default: "" },
      cep: { type: String, default: "" }
    },
    role: { type: String, default:"user", index: true },
    cartData: { type: Object, default: {} },
  },
  { 
    minimize: false,
    timestamps: true // Add createdAt and updatedAt
  }
);

// Add compound index for better query performance
userSchema.index({ name: 1, role: 1 });

// Add method to find admin users quickly
userSchema.statics.findAdmins = function() {
  return this.find({ role: 'admin' }).select('name role').lean();
};

// Add method to find user by name with timeout
userSchema.statics.findByNameWithTimeout = function(name, timeoutMs = 10000) {
  return this.findOne({ name: name.trim() }).maxTimeMS(timeoutMs);
};

const userModel = mongoose.model.user || mongoose.model("user", userSchema);
export default userModel;
