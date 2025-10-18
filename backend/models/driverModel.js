import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true },
    whatsapp: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  {
    minimize: false,
    timestamps: true // Add createdAt and updatedAt
  }
);

// Add compound index for better query performance
driverSchema.index({ name: 1, status: 1 });

// Add method to find active drivers quickly
driverSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).select('name phone whatsapp').lean();
};

// Add method to find driver by name with timeout
driverSchema.statics.findByNameWithTimeout = function(name, timeoutMs = 10000) {
  return this.findOne({ name: name.trim() }).maxTimeMS(timeoutMs);
};

const driverModel = mongoose.model.driver || mongoose.model("driver", driverSchema);
export default driverModel;