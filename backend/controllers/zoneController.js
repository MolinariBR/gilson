import zoneModel from "../models/zoneModel.js";

// Get all zones
const getAllZones = async (req, res) => {
  try {
    const zones = await zoneModel.find({}).sort({ name: 1 });
    res.json({ success: true, data: zones });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching zones" });
  }
};

// Get zone by ID
const getZoneById = async (req, res) => {
  try {
    const zone = await zoneModel.findById(req.params.id);
    if (!zone) {
      return res.json({ success: false, message: "Zone not found" });
    }
    res.json({ success: true, data: zone });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching zone" });
  }
};

// Create new zone
const createZone = async (req, res) => {
  try {
    // Admin authentication is handled by middleware
    const { name, neighborhoods, isActive = true } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.json({ success: false, message: "Zone name is required" });
    }

    if (!neighborhoods || !Array.isArray(neighborhoods) || neighborhoods.length === 0) {
      return res.json({ success: false, message: "At least one neighborhood is required" });
    }

    // Clean and validate neighborhoods
    const cleanNeighborhoods = neighborhoods
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (cleanNeighborhoods.length === 0) {
      return res.json({ success: false, message: "Valid neighborhoods are required" });
    }

    // Check for duplicate neighborhoods across zones
    try {
      await zoneModel.validateNeighborhoodUniqueness(cleanNeighborhoods);
    } catch (error) {
      if (error.duplicates) {
        const duplicateList = error.duplicates
          .map(d => `${d.neighborhood} (already in ${d.existingZone})`)
          .join(', ');
        return res.json({ 
          success: false, 
          message: `Duplicate neighborhoods found: ${duplicateList}` 
        });
      }
      throw error;
    }

    const newZone = new zoneModel({
      name: name.trim(),
      neighborhoods: cleanNeighborhoods,
      isActive
    });

    await newZone.save();
    res.json({ success: true, message: "Zone created successfully", data: newZone });
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      return res.json({ success: false, message: "Zone name already exists" });
    }
    res.json({ success: false, message: "Error creating zone" });
  }
};

// Update zone
const updateZone = async (req, res) => {
  try {
    // Admin authentication is handled by middleware
    const { id } = req.params;
    const { name, neighborhoods, isActive } = req.body;

    const existingZone = await zoneModel.findById(id);
    if (!existingZone) {
      return res.json({ success: false, message: "Zone not found" });
    }

    // Validate required fields if provided
    if (name !== undefined && (!name || !name.trim())) {
      return res.json({ success: false, message: "Zone name cannot be empty" });
    }

    if (neighborhoods !== undefined) {
      if (!Array.isArray(neighborhoods) || neighborhoods.length === 0) {
        return res.json({ success: false, message: "At least one neighborhood is required" });
      }

      // Clean and validate neighborhoods
      const cleanNeighborhoods = neighborhoods
        .map(n => n.trim())
        .filter(n => n.length > 0);

      if (cleanNeighborhoods.length === 0) {
        return res.json({ success: false, message: "Valid neighborhoods are required" });
      }

      // Check for duplicate neighborhoods across other zones
      try {
        await zoneModel.validateNeighborhoodUniqueness(cleanNeighborhoods, id);
      } catch (error) {
        if (error.duplicates) {
          const duplicateList = error.duplicates
            .map(d => `${d.neighborhood} (already in ${d.existingZone})`)
            .join(', ');
          return res.json({ 
            success: false, 
            message: `Duplicate neighborhoods found: ${duplicateList}` 
          });
        }
        throw error;
      }
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (neighborhoods !== undefined) {
      updateData.neighborhoods = neighborhoods
        .map(n => n.trim())
        .filter(n => n.length > 0);
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedZone = await zoneModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: "Zone updated successfully", data: updatedZone });
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      return res.json({ success: false, message: "Zone name already exists" });
    }
    res.json({ success: false, message: "Error updating zone" });
  }
};

// Delete zone
const deleteZone = async (req, res) => {
  try {
    // Admin authentication is handled by middleware
    const { id } = req.params;

    const zone = await zoneModel.findById(id);
    if (!zone) {
      return res.json({ success: false, message: "Zone not found" });
    }

    // Check if zone has active orders
    const hasActiveOrders = await zone.hasActiveOrders();
    if (hasActiveOrders) {
      return res.json({ 
        success: false, 
        message: "Cannot delete zone with active orders. Please wait for orders to be completed or reassign them to another zone." 
      });
    }

    await zoneModel.findByIdAndDelete(id);
    res.json({ success: true, message: "Zone deleted successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error deleting zone" });
  }
};

// Get all neighborhoods for dropdown
const getAllNeighborhoods = async (req, res) => {
  try {
    const zones = await zoneModel.find({ isActive: true }, 'name neighborhoods');
    
    const neighborhoodsWithZones = [];
    zones.forEach(zone => {
      zone.neighborhoods.forEach(neighborhood => {
        neighborhoodsWithZones.push({
          neighborhood,
          zone: zone.name,
          zoneId: zone._id
        });
      });
    });

    // Sort neighborhoods alphabetically
    neighborhoodsWithZones.sort((a, b) => a.neighborhood.localeCompare(b.neighborhood));

    res.json({ success: true, data: neighborhoodsWithZones });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching neighborhoods" });
  }
};

// Get neighborhoods by zone
const getNeighborhoodsByZone = async (req, res) => {
  try {
    const { zoneId } = req.params;
    
    const zone = await zoneModel.findById(zoneId);
    if (!zone) {
      return res.json({ success: false, message: "Zone not found" });
    }

    res.json({ 
      success: true, 
      data: {
        zone: zone.name,
        neighborhoods: zone.neighborhoods.sort()
      }
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching neighborhoods" });
  }
};

export { 
  getAllZones, 
  getZoneById, 
  createZone, 
  updateZone, 
  deleteZone, 
  getAllNeighborhoods,
  getNeighborhoodsByZone 
};