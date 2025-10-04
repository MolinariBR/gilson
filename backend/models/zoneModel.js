import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  neighborhoods: [{ 
    type: String, 
    required: true,
    trim: true
  }],
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Pre-save middleware to update the updatedAt field
zoneSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-update middleware to update the updatedAt field
zoneSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Static method to validate neighborhood uniqueness across zones
zoneSchema.statics.validateNeighborhoodUniqueness = async function(neighborhoods, excludeZoneId = null) {
  const query = {
    neighborhoods: { $in: neighborhoods }
  };
  
  if (excludeZoneId) {
    query._id = { $ne: excludeZoneId };
  }
  
  const existingZones = await this.find(query, 'name neighborhoods');
  
  if (existingZones.length > 0) {
    const duplicateNeighborhoods = [];
    existingZones.forEach(zone => {
      zone.neighborhoods.forEach(neighborhood => {
        if (neighborhoods.includes(neighborhood)) {
          duplicateNeighborhoods.push({
            neighborhood,
            existingZone: zone.name
          });
        }
      });
    });
    
    if (duplicateNeighborhoods.length > 0) {
      const error = new Error('Duplicate neighborhoods found');
      error.duplicates = duplicateNeighborhoods;
      throw error;
    }
  }
  
  return true;
};

// Instance method to check if zone has active orders
zoneSchema.methods.hasActiveOrders = async function() {
  const Order = mongoose.model('order');
  const activeOrders = await Order.countDocuments({
    'address.zone': this.name,
    status: { $in: ['Pending', 'Paid', 'Food Processing', 'Out for delivery'] }
  });
  
  return activeOrders > 0;
};

const zoneModel = mongoose.models.zone || mongoose.model("zone", zoneSchema);
export default zoneModel;