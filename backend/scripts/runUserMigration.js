#!/usr/bin/env node

/**
 * Script to run user data migration
 * Usage: node scripts/runUserMigration.js
 */

import migrateUsers from '../migrations/migrateUsers.js';

console.log('🚀 Starting user data migration...\n');

migrateUsers()
  .then(() => {
    console.log('\n✅ User migration completed successfully!');
  })
  .catch((error) => {
    console.error('\n❌ User migration failed:', error.message);
    process.exit(1);
  });