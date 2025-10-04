import mongoose from 'mongoose';
import userModel from '../models/userModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Migration script to clean up user data and ensure name field uniqueness
 * This script:
 * 1. Removes password and email fields from existing users
 * 2. Ensures name field uniqueness for existing users
 * 3. Preserves existing cart data and user preferences
 */

const migrateUsers = async (skipConnection = false) => {
  try {
    console.log('Starting user data migration...');
    
    // Connect to MongoDB only if not already connected or skipConnection is false
    if (!skipConnection && mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
    } else if (skipConnection) {
      console.log('Using existing MongoDB connection');
    }

    // Get all users from the database using raw MongoDB to include all fields
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users to process`);

    let migratedCount = 0;
    let duplicateCount = 0;
    const processedNames = new Set();

    for (const user of users) {
      let hasChanges = false;
      const updateData = {};
      const unsetData = {};

      // Store original email before potential removal for name generation
      const originalEmail = user.email;
      const originalName = user.name;

      // Handle name uniqueness first (before removing email)
      if (!user.name) {
        // If no name exists, create one from email or use a default
        const newName = originalEmail ? originalEmail.split('@')[0] : `user_${user._id}`;
        let uniqueName = newName;
        let counter = 1;
        
        // Ensure uniqueness
        while (processedNames.has(uniqueName)) {
          uniqueName = `${newName}_${counter}`;
          counter++;
        }
        
        updateData.name = uniqueName;
        processedNames.add(uniqueName);
        hasChanges = true;
        console.log(`Added name field: ${uniqueName} for user ${user._id}`);
      } else {
        // Check if name is already processed (duplicate)
        if (processedNames.has(user.name)) {
          const baseName = user.name;
          let uniqueName = `${baseName}_${duplicateCount + 1}`;
          let counter = duplicateCount + 2;
          
          // Ensure uniqueness
          while (processedNames.has(uniqueName)) {
            uniqueName = `${baseName}_${counter}`;
            counter++;
          }
          
          updateData.name = uniqueName;
          duplicateCount++;
          hasChanges = true;
          console.log(`Renamed duplicate user from ${baseName} to ${uniqueName}`);
        }
        processedNames.add(updateData.name || user.name);
      }

      // Mark fields for removal
      if (user.password !== undefined) {
        unsetData.password = 1;
        hasChanges = true;
        console.log(`Marked password field for removal from user: ${updateData.name || user.name}`);
      }

      if (user.email !== undefined) {
        unsetData.email = 1;
        hasChanges = true;
        console.log(`Marked email field for removal from user: ${updateData.name || user.name}`);
      }

      // Ensure cartData exists and is an object
      if (!user.cartData || typeof user.cartData !== 'object') {
        updateData.cartData = {};
        hasChanges = true;
        console.log(`Initialized cartData for user: ${updateData.name || user.name}`);
      }

      // Ensure role exists
      if (!user.role) {
        updateData.role = 'user';
        hasChanges = true;
        console.log(`Set default role for user: ${updateData.name || user.name}`);
      }

      // Apply all updates in a single operation
      if (hasChanges) {
        const updateOperation = {};
        
        if (Object.keys(updateData).length > 0) {
          updateOperation.$set = updateData;
        }
        
        if (Object.keys(unsetData).length > 0) {
          updateOperation.$unset = unsetData;
        }
        
        // Only perform update if there are actual operations to perform
        if (Object.keys(updateOperation).length > 0) {
          const result = await mongoose.connection.db.collection('users').updateOne({ _id: user._id }, updateOperation);
          console.log(`Updated user ${updateData.name || user.name}: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
        }
        migratedCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total users processed: ${users.length}`);
    console.log(`Users migrated: ${migratedCount}`);
    console.log(`Duplicate names resolved: ${duplicateCount}`);
    console.log('User migration completed successfully!');

    // Verify the migration by checking for any remaining problematic fields
    // Use direct MongoDB queries to check for fields not in schema
    const usersWithPassword = await mongoose.connection.db.collection('users').find({ password: { $exists: true } }).toArray();
    const usersWithEmail = await mongoose.connection.db.collection('users').find({ email: { $exists: true } }).toArray();
    const usersWithoutName = await mongoose.connection.db.collection('users').find({ name: { $exists: false } }).toArray();

    if (usersWithPassword.length > 0) {
      console.warn(`Warning: ${usersWithPassword.length} users still have password field`);
    }
    if (usersWithEmail.length > 0) {
      console.warn(`Warning: ${usersWithEmail.length} users still have email field`);
    }
    if (usersWithoutName.length > 0) {
      console.warn(`Warning: ${usersWithoutName.length} users don't have name field`);
    }

    if (usersWithPassword.length === 0 && usersWithEmail.length === 0 && usersWithoutName.length === 0) {
      console.log('✅ All users successfully migrated!');
    }

  } catch (error) {
    console.error('Error during user migration:', error);
    throw error;
  } finally {
    // Close the database connection only if we opened it
    if (!skipConnection && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('Database connection closed');
    }
  }
};

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUsers()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default migrateUsers;