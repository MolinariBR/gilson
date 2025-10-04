import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { runMigration as runCategoryMigration, runValidation as validateCategories } from './runCategoryMigration.js';
import { migrateFoodCategories, validateFoodMigration, updateCategoryReferences } from '../migrations/migrateFoodCategories.js';

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
 * Run complete category migration process
 */
async function runFullMigration() {
    console.log('🚀 Starting full category migration process...\n');
    
    try {
        await connectDB();
        
        // Step 1: Migrate categories
        console.log('📁 Step 1: Migrating categories...');
        const categoryResult = await runCategoryMigration();
        
        if (!categoryResult.success) {
            throw new Error('Category migration failed');
        }
        
        console.log('✅ Category migration completed\n');
        
        // Step 2: Validate categories
        console.log('🔍 Step 2: Validating categories...');
        const categoryValidation = await validateCategories();
        
        if (!categoryValidation.success) {
            throw new Error('Category validation failed');
        }
        
        console.log('✅ Category validation passed\n');
        
        // Step 3: Migrate food categories
        console.log('🍽️  Step 3: Migrating food categories...');
        const foodResult = await migrateFoodCategories();
        
        if (!foodResult.success) {
            console.warn('⚠️  Food migration completed with errors');
        } else {
            console.log('✅ Food category migration completed');
        }
        
        console.log('');
        
        // Step 4: Validate food migration
        console.log('🔍 Step 4: Validating food migration...');
        const foodValidation = await validateFoodMigration();
        
        if (!foodValidation.success) {
            console.warn('⚠️  Food validation completed with issues');
        } else {
            console.log('✅ Food validation passed');
        }
        
        console.log('');
        
        // Step 5: Update category references
        console.log('🔄 Step 5: Checking category references...');
        const referenceUpdate = await updateCategoryReferences();
        
        console.log('✅ Reference check completed\n');
        
        // Final summary
        console.log('🎉 Full migration process completed!');
        console.log('\n=== Migration Summary ===');
        console.log(`Categories migrated: ${categoryResult.migratedCount}`);
        console.log(`Food products processed: ${foodResult.results.success + foodResult.results.failed + foodResult.results.skipped}`);
        console.log(`Food products migrated: ${foodResult.results.success}`);
        console.log(`Food products failed: ${foodResult.results.failed}`);
        console.log(`Food products skipped: ${foodResult.results.skipped}`);
        
        if (referenceUpdate.updates.length > 0) {
            console.log('\n⚠️  Manual review required for:');
            referenceUpdate.updates.forEach(update => {
                console.log(`  - ${update.file}`);
            });
        }
        
        console.log('\n📁 Backup files created:');
        console.log(`  - Categories: ${categoryResult.backupPath}`);
        console.log(`  - Food products: ${foodResult.backupPath}`);
        
        return {
            success: true,
            categoryResult,
            foodResult,
            foodValidation,
            referenceUpdate
        };
        
    } catch (error) {
        console.error('❌ Full migration failed:', error.message);
        throw error;
    } finally {
        await disconnectDB();
    }
}

/**
 * Run migration validation only
 */
async function runFullValidation() {
    console.log('🔍 Starting full migration validation...\n');
    
    try {
        await connectDB();
        
        // Validate categories
        console.log('📁 Validating categories...');
        const categoryValidation = await validateCategories();
        
        // Validate food migration
        console.log('🍽️  Validating food migration...');
        const foodValidation = await validateFoodMigration();
        
        console.log('\n=== Validation Summary ===');
        console.log(`Categories validation: ${categoryValidation.success ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Food migration validation: ${foodValidation.success ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (categoryValidation.categories) {
            console.log(`Total categories: ${categoryValidation.categories.length}`);
        }
        
        console.log(`Total food products: ${foodValidation.totalFoods}`);
        console.log(`Migrated food products: ${foodValidation.migratedCount}`);
        console.log(`Unmigrated food products: ${foodValidation.unmigrated}`);
        
        const overallSuccess = categoryValidation.success && foodValidation.success;
        
        if (overallSuccess) {
            console.log('\n🎉 All validations passed!');
        } else {
            console.log('\n❌ Some validations failed. Please check the details above.');
        }
        
        return {
            success: overallSuccess,
            categoryValidation,
            foodValidation
        };
        
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
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
            runFullMigration()
                .then(result => {
                    console.log('\n✅ Full migration completed successfully!');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('\n❌ Full migration failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'validate':
            runFullValidation()
                .then(result => {
                    process.exit(result.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('\n❌ Validation failed:', error.message);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Full Category Migration Tool');
            console.log('');
            console.log('This tool runs the complete migration process:');
            console.log('1. Migrate static categories to database');
            console.log('2. Validate category migration');
            console.log('3. Update food products to use category IDs');
            console.log('4. Validate food migration');
            console.log('5. Check for code references that need updating');
            console.log('');
            console.log('Usage:');
            console.log('  node runFullCategoryMigration.js migrate   - Run complete migration');
            console.log('  node runFullCategoryMigration.js validate  - Validate all migrations');
            console.log('');
            console.log('Examples:');
            console.log('  node runFullCategoryMigration.js migrate');
            console.log('  node runFullCategoryMigration.js validate');
            process.exit(1);
    }
}

export { runFullMigration, runFullValidation };