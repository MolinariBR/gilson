#!/usr/bin/env node

/**
 * Script to create an admin user
 * Usage: node scripts/createAdmin.js [admin-name]
 * Example: node scripts/createAdmin.js admin
 */

import mongoose from 'mongoose';
import userModel from '../models/userModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createAdmin = async (adminName = 'admin') => {
  try {
    console.log('🔧 Creating admin user...');
    
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URL);
      console.log('✅ Connected to MongoDB');
    }

    // Check if admin already exists
    const existingAdmin = await userModel.findOne({ name: adminName });
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log(`✅ Admin user '${adminName}' already exists!`);
        return existingAdmin;
      } else {
        // Update existing user to admin
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log(`✅ Updated user '${adminName}' to admin role!`);
        return existingAdmin;
      }
    }

    // Create new admin user
    const adminUser = new userModel({
      name: adminName,
      role: 'admin',
      cartData: {}
    });

    await adminUser.save();
    console.log(`✅ Admin user '${adminName}' created successfully!`);
    
    console.log('\n📋 Admin Login Credentials:');
    console.log(`Name: ${adminName}`);
    console.log('Password: Not required (name-only authentication)');
    console.log('\n🔐 How to login:');
    console.log('1. Go to the admin panel (http://localhost:5174)');
    console.log(`2. Enter name: ${adminName}`);
    console.log('3. Leave password field empty or enter any value');
    console.log('4. Click Login');

    return adminUser;

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
};

// Get admin name from command line arguments
const adminName = process.argv[2] || 'admin';

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdmin(adminName)
    .then(() => {
      console.log('\n🎉 Admin creation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Admin creation failed:', error);
      process.exit(1);
    });
}

export default createAdmin;