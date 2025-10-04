#!/usr/bin/env node

/**
 * Script to run complete data migration
 * This script runs both user and order migrations in sequence
 * Usage: node scripts/runFullMigration.js
 */

import migrateUsers from '../migrations/migrateUsers.js';
import migrateOrders from '../migrations/migrateOrders.js';

const runFullMigration = async () => {
  console.log('🚀 Starting complete data migration...\n');
  
  try {
    // Step 1: Migrate users
    console.log('📝 Step 1: Migrating user data...');
    await migrateUsers();
    console.log('✅ User migration completed\n');
    
    // Step 2: Migrate orders
    console.log('📦 Step 2: Migrating order data...');
    await migrateOrders();
    console.log('✅ Order migration completed\n');
    
    console.log('🎉 Complete migration finished successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the migrated data in your database');
    console.log('2. Test the application with the new data structure');
    console.log('3. Consider backing up the migrated data');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease check the error above and fix any issues before retrying.');
    process.exit(1);
  }
};

runFullMigration();