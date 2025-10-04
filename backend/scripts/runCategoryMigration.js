import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { migrateCategories, rollbackMigration, validateMigration } from '../migrations/migrateCategories.js';

// Load environment variables
dotenv.config();

/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        throw error;
    }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDB() {
    try {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('MongoDB disconnection error:', error.message);
    }
}

/**
 * Run category migration with database connection
 */
async function runMigration() {
    try {
        await connectDB();
        const result = await migrateCategories();
        console.log('\n=== Migration Summary ===');
        console.log(`Success: ${result.success}`);
        console.log(`Categories migrated: ${result.migratedCount}`);
        console.log(`Backup path: ${result.backupPath}`);
        return result;
    } catch (error) {
        console.error('Migration failed:', error.message);
        throw error;
    } finally {
        await disconnectDB();
    }
}

/**
 * Run migration rollback with database connection
 */
async function runRollback(backupPath) {
    try {
        await connectDB();
        const result = await rollbackMigration(backupPath);
        console.log('\n=== Rollback Summary ===');
        console.log(`Success: ${result.success}`);
        return result;
    } catch (error) {
        console.error('Rollback failed:', error.message);
        throw error;
    } finally {
        await disconnectDB();
    }
}

/**
 * Run migration validation with database connection
 */
async function runValidation() {
    try {
        await connectDB();
        const result = await validateMigration();
        console.log('\n=== Validation Summary ===');
        console.log(`Success: ${result.success}`);
        if (result.categories) {
            console.log(`Total categories: ${result.categories.length}`);
        }
        if (result.issues) {
            console.log(`Issues found: ${result.issues.length}`);
        }
        return result;
    } catch (error) {
        console.error('Validation failed:', error.message);
        throw error;
    } finally {
        await disconnectDB();
    }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    
    switch (command) {
        case 'migrate':
            console.log('🚀 Starting category migration...');
            runMigration()
                .then(() => {
                    console.log('✅ Migration completed successfully!');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Migration failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'rollback':
            const backupPath = process.argv[3];
            if (!backupPath) {
                console.error('❌ Please provide backup file path');
                console.log('Usage: node runCategoryMigration.js rollback <backup-path>');
                process.exit(1);
            }
            console.log('🔄 Starting migration rollback...');
            runRollback(backupPath)
                .then(() => {
                    console.log('✅ Rollback completed successfully!');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Rollback failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'validate':
            console.log('🔍 Starting migration validation...');
            runValidation()
                .then(result => {
                    if (result.success) {
                        console.log('✅ Validation passed!');
                        process.exit(0);
                    } else {
                        console.log('❌ Validation failed!');
                        process.exit(1);
                    }
                })
                .catch(error => {
                    console.error('❌ Validation error:', error.message);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Category Migration Tool');
            console.log('');
            console.log('Usage:');
            console.log('  node runCategoryMigration.js migrate              - Run category migration');
            console.log('  node runCategoryMigration.js rollback <backup>    - Rollback migration using backup');
            console.log('  node runCategoryMigration.js validate             - Validate migration results');
            console.log('');
            console.log('Examples:');
            console.log('  node runCategoryMigration.js migrate');
            console.log('  node runCategoryMigration.js rollback ./migrations/category_backup_1234567890.json');
            console.log('  node runCategoryMigration.js validate');
            process.exit(1);
    }
}

export { runMigration, runRollback, runValidation };