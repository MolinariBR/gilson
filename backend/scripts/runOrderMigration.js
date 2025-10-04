#!/usr/bin/env node

/**
 * Script to run order data migration
 * Usage: node scripts/runOrderMigration.js
 */

import migrateOrders from '../migrations/migrateOrders.js';

console.log('🚀 Starting order data migration...\n');

migrateOrders()
  .then(() => {
    console.log('\n✅ Order migration completed successfully!');
  })
  .catch((error) => {
    console.error('\n❌ Order migration failed:', error.message);
    process.exit(1);
  });