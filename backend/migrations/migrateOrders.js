import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import zoneModel from '../models/zoneModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Migration script to transform order data to new structure
 * This script:
 * 1. Transforms existing address strings to structured objects
 * 2. Sets default zone for existing orders
 * 3. Preserves order history and payment status
 */

const migrateOrders = async () => {
  try {
    console.log('Starting order data migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all orders from the database
    const orders = await orderModel.find({});
    console.log(`Found ${orders.length} orders to process`);

    // Get available zones for default assignment
    const zones = await zoneModel.find({ isActive: true });
    console.log(`Found ${zones.length} active zones`);

    // Create a default zone if none exist
    let defaultZone;
    if (zones.length === 0) {
      console.log('No zones found, creating default zone...');
      defaultZone = new zoneModel({
        name: 'Default Zone',
        neighborhoods: ['Centro', 'Downtown', 'City Center'],
        isActive: true
      });
      await defaultZone.save();
      console.log('Created default zone');
    } else {
      defaultZone = zones[0];
    }

    let migratedCount = 0;
    let alreadyStructuredCount = 0;

    for (const order of orders) {
      let hasChanges = false;
      const updateData = {};

      // Check if address is already structured
      if (typeof order.address === 'object' && 
          order.address.street !== undefined && 
          order.address.number !== undefined && 
          order.address.neighborhood !== undefined) {
        
        // Address is already structured, but check if zone is missing
        if (!order.address.zone) {
          updateData['address.zone'] = defaultZone.name;
          hasChanges = true;
          console.log(`Added default zone to structured address for order: ${order._id}`);
        } else {
          alreadyStructuredCount++;
          continue;
        }
      } else {
        // Address needs to be migrated from string to structured format
        const addressString = typeof order.address === 'string' ? order.address : JSON.stringify(order.address);
        
        // Parse the address string and create structured address
        const structuredAddress = parseAddressString(addressString, defaultZone.name);
        
        updateData.address = structuredAddress;
        hasChanges = true;
        console.log(`Migrated address for order ${order._id}: "${addressString}" -> structured format`);
      }

      // Ensure status is set correctly (change "Food Processing" to "Pending" if needed)
      if (order.status === "Food Processing") {
        updateData.status = "Pending";
        hasChanges = true;
        console.log(`Updated status from "Food Processing" to "Pending" for order: ${order._id}`);
      }

      // Ensure payment field exists
      if (order.payment === undefined) {
        updateData.payment = false;
        hasChanges = true;
        console.log(`Set default payment status for order: ${order._id}`);
      }

      // Apply updates if any changes were made
      if (hasChanges) {
        await orderModel.updateOne({ _id: order._id }, updateData);
        migratedCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total orders processed: ${orders.length}`);
    console.log(`Orders migrated: ${migratedCount}`);
    console.log(`Orders already structured: ${alreadyStructuredCount}`);
    console.log('Order migration completed successfully!');

    // Verify the migration
    const ordersWithStringAddress = await orderModel.find({
      $or: [
        { 'address.street': { $exists: false } },
        { 'address.number': { $exists: false } },
        { 'address.neighborhood': { $exists: false } },
        { 'address.zone': { $exists: false } }
      ]
    });

    if (ordersWithStringAddress.length > 0) {
      console.warn(`Warning: ${ordersWithStringAddress.length} orders still have incomplete address structure`);
      ordersWithStringAddress.forEach(order => {
        console.warn(`Order ${order._id} has incomplete address:`, order.address);
      });
    } else {
      console.log('✅ All orders successfully migrated to structured address format!');
    }

  } catch (error) {
    console.error('Error during order migration:', error);
    throw error;
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

/**
 * Parse address string and convert to structured format
 * This function attempts to extract components from various address formats
 */
const parseAddressString = (addressString, defaultZone) => {
  // Default structured address
  const structuredAddress = {
    street: '',
    number: '',
    neighborhood: '',
    zone: defaultZone,
    cep: ''
  };

  if (!addressString || typeof addressString !== 'string') {
    // If no address string, use defaults
    structuredAddress.street = 'Unknown Street';
    structuredAddress.number = 'S/N';
    structuredAddress.neighborhood = 'Centro';
    return structuredAddress;
  }

  try {
    // Try to parse as JSON first (in case it was stored as JSON string)
    const parsed = JSON.parse(addressString);
    if (typeof parsed === 'object') {
      structuredAddress.street = parsed.street || parsed.address || 'Unknown Street';
      structuredAddress.number = parsed.number || parsed.houseNumber || 'S/N';
      structuredAddress.neighborhood = parsed.neighborhood || parsed.district || 'Centro';
      structuredAddress.zone = parsed.zone || defaultZone;
      structuredAddress.cep = parsed.cep || parsed.zipCode || '';
      return structuredAddress;
    }
  } catch (e) {
    // Not JSON, continue with string parsing
  }

  // Common address patterns to extract information
  const addressParts = addressString.split(',').map(part => part.trim());
  
  if (addressParts.length >= 1) {
    // First part is usually street and number
    const streetAndNumber = addressParts[0];
    const numberMatch = streetAndNumber.match(/(\d+)$/);
    
    if (numberMatch) {
      structuredAddress.number = numberMatch[1];
      structuredAddress.street = streetAndNumber.replace(/\s*\d+$/, '').trim();
    } else {
      structuredAddress.street = streetAndNumber;
      structuredAddress.number = 'S/N';
    }
  }

  if (addressParts.length >= 2) {
    // Second part might be neighborhood
    structuredAddress.neighborhood = addressParts[1];
  } else {
    structuredAddress.neighborhood = 'Centro';
  }

  if (addressParts.length >= 3) {
    // Third part might be CEP or additional info
    const possibleCep = addressParts[2];
    if (/^\d{5}-?\d{3}$/.test(possibleCep)) {
      structuredAddress.cep = possibleCep;
    }
  }

  // Ensure we have at least basic information
  if (!structuredAddress.street) {
    structuredAddress.street = 'Unknown Street';
  }
  if (!structuredAddress.number) {
    structuredAddress.number = 'S/N';
  }
  if (!structuredAddress.neighborhood) {
    structuredAddress.neighborhood = 'Centro';
  }

  return structuredAddress;
};

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateOrders()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default migrateOrders;