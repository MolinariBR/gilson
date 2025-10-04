import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import foodModel from '../models/foodModel.js';
import categoryModel from '../models/categoryModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapping of original category names to Portuguese names
const CATEGORY_NAME_MAPPING = {
    'Salad': 'Salada',
    'Rolls': 'Rolinhos', 
    'Deserts': 'Sobremesas',
    'Sandwich': 'Sanduíche',
    'Cake': 'Bolo',
    'Pure Veg': 'Vegetariano',
    'Pasta': 'Massa',
    'Noodles': 'Macarrão'
};

/**
 * Create backup of existing food products
 */
async function createFoodBackup() {
    try {
        const existingFoods = await foodModel.find({});
        const backupData = {
            timestamp: new Date().toISOString(),
            foods: existingFoods
        };
        
        const backupPath = path.join(__dirname, `food_backup_${Date.now()}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        
        console.log(`Food backup created: ${backupPath}`);
        return backupPath;
    } catch (error) {
        console.error('Error creating food backup:', error.message);
        throw error;
    }
}

/**
 * Get category by original name or Portuguese name
 */
async function getCategoryByName(categoryName) {
    // First try to find by original name
    let category = await categoryModel.findOne({ originalName: categoryName });
    
    if (!category) {
        // Try to find by Portuguese name
        const portugueseName = CATEGORY_NAME_MAPPING[categoryName] || categoryName;
        category = await categoryModel.findOne({ name: portugueseName });
    }
    
    if (!category) {
        // Try to find by slug
        const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
        category = await categoryModel.findOne({ slug });
    }
    
    return category;
}

/**
 * Migrate food products to use category IDs
 */
async function migrateFoodCategories() {
    console.log('Starting food category migration...');
    
    try {
        // Create backup first
        const backupPath = await createFoodBackup();
        
        // Get all food products
        const foods = await foodModel.find({});
        console.log(`Found ${foods.length} food products to migrate`);
        
        // Get all categories for reference
        const categories = await categoryModel.find({});
        console.log(`Found ${categories.length} categories in database`);
        
        if (categories.length === 0) {
            throw new Error('No categories found in database. Please run category migration first.');
        }
        
        const migrationResults = {
            success: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };
        
        for (const food of foods) {
            try {
                // Skip if already migrated (has categoryId)
                if (food.categoryId) {
                    console.log(`Skipping already migrated food: ${food.name}`);
                    migrationResults.skipped++;
                    continue;
                }
                
                const currentCategory = food.category;
                console.log(`Migrating food: ${food.name} (category: ${currentCategory})`);
                
                // Find matching category
                const category = await getCategoryByName(currentCategory);
                
                if (!category) {
                    const error = `Category not found for food "${food.name}": ${currentCategory}`;
                    console.warn(error);
                    migrationResults.errors.push(error);
                    migrationResults.failed++;
                    continue;
                }
                
                // Update food product
                const updateData = {
                    categoryId: category._id,
                    categoryName: category.name, // Store Portuguese name
                    category: category.originalName // Keep original for backward compatibility
                };
                
                await foodModel.findByIdAndUpdate(food._id, updateData);
                
                console.log(`✅ Migrated: ${food.name} -> ${category.name} (${category._id})`);
                migrationResults.success++;
                
            } catch (error) {
                const errorMsg = `Error migrating food "${food.name}": ${error.message}`;
                console.error(errorMsg);
                migrationResults.errors.push(errorMsg);
                migrationResults.failed++;
            }
        }
        
        console.log('\n=== Food Category Migration Summary ===');
        console.log(`✅ Successfully migrated: ${migrationResults.success}`);
        console.log(`❌ Failed: ${migrationResults.failed}`);
        console.log(`⏭️  Skipped (already migrated): ${migrationResults.skipped}`);
        console.log(`📁 Backup saved to: ${backupPath}`);
        
        if (migrationResults.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            migrationResults.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        return {
            success: migrationResults.failed === 0,
            results: migrationResults,
            backupPath
        };
        
    } catch (error) {
        console.error('Food category migration failed:', error.message);
        throw error;
    }
}

/**
 * Rollback food category migration
 */
async function rollbackFoodMigration(backupPath) {
    console.log('Starting food category migration rollback...');
    
    try {
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }
        
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        
        // Clear current food products
        await foodModel.deleteMany({});
        console.log('Cleared existing food products');
        
        // Restore from backup
        if (backupData.foods && backupData.foods.length > 0) {
            await foodModel.insertMany(backupData.foods);
            console.log(`Restored ${backupData.foods.length} food products from backup`);
        }
        
        console.log('Food category migration rollback completed successfully!');
        return { success: true };
        
    } catch (error) {
        console.error('Food category migration rollback failed:', error.message);
        throw error;
    }
}

/**
 * Validate food category migration
 */
async function validateFoodMigration() {
    console.log('Validating food category migration...');
    
    try {
        const foods = await foodModel.find({}).populate('categoryId');
        const issues = [];
        let migratedCount = 0;
        let unmigrated = 0;
        
        for (const food of foods) {
            if (food.categoryId) {
                migratedCount++;
                
                // Validate category reference exists
                if (!food.categoryId) {
                    issues.push(`Food "${food.name}" has invalid category reference`);
                }
                
                // Check if category exists in database
                const category = await categoryModel.findById(food.categoryId);
                if (!category) {
                    issues.push(`Food "${food.name}" references non-existent category: ${food.categoryId}`);
                }
            } else {
                unmigrated++;
                issues.push(`Food "${food.name}" not migrated (missing categoryId)`);
            }
        }
        
        console.log('\n=== Food Migration Validation Results ===');
        console.log(`Total food products: ${foods.length}`);
        console.log(`✅ Migrated: ${migratedCount}`);
        console.log(`❌ Not migrated: ${unmigrated}`);
        console.log(`⚠️  Issues found: ${issues.length}`);
        
        if (issues.length > 0) {
            console.log('\n⚠️  Issues:');
            issues.forEach(issue => console.log(`  - ${issue}`));
        }
        
        const success = issues.length === 0 && unmigrated === 0;
        
        if (success) {
            console.log('\n✅ Food category migration validation passed!');
        } else {
            console.log('\n❌ Food category migration validation failed!');
        }
        
        return {
            success,
            totalFoods: foods.length,
            migratedCount,
            unmigrated,
            issues
        };
        
    } catch (error) {
        console.error('Food category migration validation failed:', error.message);
        throw error;
    }
}

/**
 * Update category references throughout codebase
 */
async function updateCategoryReferences() {
    console.log('Updating category references in codebase...');
    
    const updates = [];
    
    try {
        // List of files that might need updates
        const filesToCheck = [
            'controllers/foodController.js',
            'routes/foodRoutes.js',
            'services/foodService.js'
        ];
        
        for (const filePath of filesToCheck) {
            const fullPath = path.join(__dirname, '..', filePath);
            
            if (fs.existsSync(fullPath)) {
                console.log(`Checking file: ${filePath}`);
                
                // Read file content
                const content = fs.readFileSync(fullPath, 'utf8');
                
                // Check for potential category-related code that might need updates
                const patterns = [
                    /category:\s*req\.body\.category/g,
                    /food\.category/g,
                    /\$match:\s*{\s*category:/g
                ];
                
                let hasReferences = false;
                patterns.forEach(pattern => {
                    if (pattern.test(content)) {
                        hasReferences = true;
                    }
                });
                
                if (hasReferences) {
                    updates.push({
                        file: filePath,
                        status: 'needs_review',
                        message: 'File contains category references that may need updating'
                    });
                }
            }
        }
        
        console.log('\n=== Category Reference Update Summary ===');
        if (updates.length === 0) {
            console.log('✅ No files require immediate updates');
        } else {
            console.log('⚠️  Files that may need manual review:');
            updates.forEach(update => {
                console.log(`  - ${update.file}: ${update.message}`);
            });
        }
        
        return { updates };
        
    } catch (error) {
        console.error('Error updating category references:', error.message);
        throw error;
    }
}

// Export functions
export {
    migrateFoodCategories,
    rollbackFoodMigration,
    validateFoodMigration,
    updateCategoryReferences,
    getCategoryByName
};

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    
    switch (command) {
        case 'migrate':
            migrateFoodCategories()
                .then(result => {
                    console.log('Migration result:', result);
                    process.exit(result.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('Migration error:', error);
                    process.exit(1);
                });
            break;
            
        case 'rollback':
            const backupPath = process.argv[3];
            if (!backupPath) {
                console.error('Please provide backup file path');
                process.exit(1);
            }
            rollbackFoodMigration(backupPath)
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('Rollback error:', error);
                    process.exit(1);
                });
            break;
            
        case 'validate':
            validateFoodMigration()
                .then(result => {
                    process.exit(result.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('Validation error:', error);
                    process.exit(1);
                });
            break;
            
        case 'update-refs':
            updateCategoryReferences()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('Update references error:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage:');
            console.log('  node migrateFoodCategories.js migrate      - Migrate food categories');
            console.log('  node migrateFoodCategories.js rollback <backup-path> - Rollback migration');
            console.log('  node migrateFoodCategories.js validate     - Validate migration');
            console.log('  node migrateFoodCategories.js update-refs  - Update category references');
            process.exit(1);
    }
}