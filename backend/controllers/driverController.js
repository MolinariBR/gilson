import driverModel from "../models/driverModel.js";
import userModel from "../models/userModel.js";

// Create new driver (Admin only)
const createDriver = async (req, res) => {
  try {
    // Check admin
    let userData = await userModel.findById(req.body.userId);
    if (!userData || userData.role !== "admin") {
      return res.json({ success: false, message: "You are not admin" });
    }

    const driverData = {
      name: req.body.name,
      phone: req.body.phone,
      whatsapp: req.body.whatsapp,
      status: req.body.status || 'active'
    };

    const driver = new driverModel(driverData);
    await driver.save();
    res.json({ success: true, message: "Driver Added" });

  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      return res.json({ success: false, message: "Driver name already exists" });
    }
    res.json({ success: false, message: "Error" });
  }
};

// Get all drivers (Admin only)
const getAllDrivers = async (req, res) => {
  try {
    // Set timeout for this operation
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: "Request timeout - drivers taking too long to load"
        });
      }
    }, 15000); // 15 seconds timeout

    // Admin authentication is handled by middleware
    const includeInactive = req.query.includeInactive === 'true';
    let query = {};
    if (!includeInactive) {
      query.status = 'active';
    }

    const drivers = await driverModel.find(query).sort({ name: 1 });

    // Clear timeout if operation completed
    clearTimeout(timeoutId);

    if (!res.headersSent) {
      res.json({
        success: true,
        data: drivers
      });
    }
  } catch (error) {
    console.error("Error in getAllDrivers:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
        error: error.message
      });
    }
  }
};

// Get driver by ID (Admin only)
const getDriverById = async (req, res) => {
  try {
    const driver = await driverModel.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    res.json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error("Error in getDriverById:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// Update driver (Admin only)
const updateDriver = async (req, res) => {
  try {
    // Check admin
    let userData = await userModel.findById(req.body.userId);
    if (!userData || userData.role !== "admin") {
      return res.json({ success: false, message: "You are not admin" });
    }

    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.phone) updateData.phone = req.body.phone;
    if (req.body.whatsapp) updateData.whatsapp = req.body.whatsapp;
    if (req.body.status) updateData.status = req.body.status;

    const updatedDriver = await driverModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedDriver) {
      return res.json({ success: false, message: "Driver not found" });
    }

    res.json({ success: true, message: "Driver Updated" });

  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      return res.json({ success: false, message: "Driver name already exists" });
    }
    res.json({ success: false, message: "Error" });
  }
};

// Delete driver (Admin only)
const deleteDriver = async (req, res) => {
  try {
    // Check admin
    let userData = await userModel.findById(req.body.userId);
    if (!userData || userData.role !== "admin") {
      return res.json({ success: false, message: "You are not admin" });
    }

    // Check if driver is assigned to any active orders
    const orderModel = (await import("../models/orderModel.js")).default;
    const activeOrdersWithDriver = await orderModel.countDocuments({
      driver: req.params.id,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'] }
    });

    if (activeOrdersWithDriver > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete driver - assigned to active orders"
      });
    }

    const deletedDriver = await driverModel.findByIdAndDelete(req.params.id);

    if (!deletedDriver) {
      return res.json({ success: false, message: "Driver not found" });
    }

    res.json({ success: true, message: "Driver Deleted" });

  } catch (error) {
    console.error("Error in deleteDriver:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// Get active drivers (Public endpoint for frontend)
const getActiveDrivers = async (req, res) => {
  try {
    const drivers = await driverModel.findActive();

    res.json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error("Error in getActiveDrivers:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

export {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  getActiveDrivers
};