import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import categoryModel from '../models/categoryModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static menu list data to migrate
const STATIC_MENU_LIST = [
    {
        menu_name: "Salada",
        menu_image: "menu_1.png",
        original_name: "Salad"
    },
    {
        menu_name: "Rolinhos",
        menu_image: "menu_2.png",
        original_name: "Rolls"
    },
    {
        menu_name: "Sobremesas",
        menu_image: "menu_3.png",
        original_name: "Deserts"
    },
    {
        menu_name: "Sanduíche",
        menu_image: "menu_4.png",
        original_name: "Sandwich"
    },
    {
        menu_name: "Bolo",
        menu_image: "menu_5.png",
        original_name: "Cake"
    },
    {
        menu_name: "Vegetariano",
        menu_image: "menu_6.png",
        original_name: "Pure Veg"
    },
    {
        menu_name: "Massa",
        menu_image: "menu_7.png",
        original_name: "Pasta"
    },
    {
        menu_name: "Macarrão",
        menu_image: "menu_8.png",
        original_name: "Noodles"
    }
];

/**
 * Generate slug from category name
 */
function generateSlug(name) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim('-'); // Remove leading/trailing hyphens
}

/**
 * Copy image from frontend assets to backend uploads
 */
async function copyImageToUploads(sourceImageName, targetFileName) {
    const sourcePath = path.join(__dirname, '../../frontend/src/assets/frontend_assets', sourceImageName);
    const targetDir = path.join(__dirname, '../uploads/categories');
    const targetPath = path.join(targetDir, targetFileName);

    try {
        // Create categories directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            console.log(`Created directory: ${targetDir}`);
        }

        // Check if source file exists
        if (!fs.existsSync(sourcePath)) {
            console.warn(`Source image not found: ${sourcePath}`);
            return null;
        }

        // Copy the file
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Copied image: ${sourceImageName} -> ${targetFileName}`);
        
        return `/uploads/categories/${targetFileName}`;
    } catch (error) {
        console.error(`Error copying image ${sourceImageName}:`, error.message);
        return null;
    }
}

/**
 * Create backup of existing categories
 */
async function createBackup() {
    try {
        const existingCategories = await categoryModel.find({});
        const backupData = {
            timestamp: new Date().toISOString(),
            categories: existingCategories
        };
        
        const backupPath = path.join(__dirname, `category_backup_${Date.now()}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        
        console.log(`Backup created: ${backupPath}`);
        return backupPath;
    } catch (error) {
        console.error('Error creating backup:', error.message);
        throw error;
    }
}

/**
 * Migrate static categories to database
 */
async function migrateCategories() {
    console.log('Starting category migration...');
    
    try {
        // Create backup first
        const backupPath = await createBackup();
        
        // Check if categories already exist
        const existingCount = await categoryModel.countDocuments();
        if (existingCount > 0) {
            console.log(`Found ${existingCount} existing categories. Migration will add new categories only.`);
        }

        const migratedCategories = [];
        
        for (let i = 0; i < STATIC_MENU_LIST.length; i++) {
            const menuItem = STATIC_MENU_LIST[i];
            const slug = generateSlug(menuItem.menu_name);
            
            // Check if category already exists
            const existingCategory = await categoryModel.findOne({ slug });
            if (existingCategory) {
                console.log(`Category already exists: ${menuItem.menu_name} (${slug})`);
                migratedCategories.push(existingCategory);
                continue;
            }
            
            // Copy image to uploads directory
            const imageFileName = `category_${Date.now()}_${i + 1}.png`;
            const imagePath = await copyImageToUploads(menuItem.menu_image, imageFileName);
            
            if (!imagePath) {
                console.warn(`Skipping category ${menuItem.menu_name} due to image copy failure`);
                continue;
            }
            
            // Create category document
            const categoryData = {
                name: menuItem.menu_name,
                originalName: menuItem.original_name,
                slug: slug,
                image: imagePath,
                isActive: true,
                order: i + 1
            };
            
            try {
                const category = new categoryModel(categoryData);
                await category.save();
                migratedCategories.push(category);
                console.log(`Migrated category: ${menuItem.menu_name} -> ${slug}`);
            } catch (error) {
                console.error(`Error saving category ${menuItem.menu_name}:`, error.message);
            }
        }
        
        console.log(`\nMigration completed successfully!`);
        console.log(`Total categories migrated: ${migratedCategories.length}`);
        console.log(`Backup saved to: ${backupPath}`);
        
        return {
            success: true,
            migratedCount: migratedCategories.length,
            backupPath,
            categories: migratedCategories
        };
        
    } catch (error) {
        console.error('Migration failed:', error.message);
        throw error;
    }
}

/**
 * Rollback migration using backup
 */
async function rollbackMigration(backupPath) {
    console.log('Starting migration rollback...');
    
    try {
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }
        
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        
        // Clear current categories
        await categoryModel.deleteMany({});
        console.log('Cleared existing categories');
        
        // Restore from backup
        if (backupData.categories && backupData.categories.length > 0) {
            await categoryModel.insertMany(backupData.categories);
            console.log(`Restored ${backupData.categories.length} categories from backup`);
        }
        
        // Clean up uploaded category images
        const uploadsDir = path.join(__dirname, '../uploads/categories');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                if (file.startsWith('category_')) {
                    fs.unlinkSync(path.join(uploadsDir, file));
                    console.log(`Removed uploaded image: ${file}`);
                }
            }
        }
        
        console.log('Rollback completed successfully!');
        return { success: true };
        
    } catch (error) {
        console.error('Rollback failed:', error.message);
        throw error;
    }
}

/**
 * Validate migration results
 */
async function validateMigration() {
    console.log('Validating migration...');
    
    try {
        const categories = await categoryModel.find({}).sort({ order: 1 });
        const issues = [];
        
        // Check if all expected categories exist
        for (const menuItem of STATIC_MENU_LIST) {
            const slug = generateSlug(menuItem.menu_name);
            const category = categories.find(cat => cat.slug === slug);
            
            if (!category) {
                issues.push(`Missing category: ${menuItem.menu_name} (${slug})`);
            } else {
                // Validate category data
                if (category.name !== menuItem.menu_name) {
                    issues.push(`Name mismatch for ${slug}: expected "${menuItem.menu_name}", got "${category.name}"`);
                }
                if (category.originalName !== menuItem.original_name) {
                    issues.push(`Original name mismatch for ${slug}: expected "${menuItem.original_name}", got "${category.originalName}"`);
                }
                
                // Check if image file exists
                const imagePath = path.join(__dirname, '..', category.image);
                if (!fs.existsSync(imagePath)) {
                    issues.push(`Image file missing for ${slug}: ${category.image}`);
                }
            }
        }
        
        if (issues.length === 0) {
            console.log('✅ Migration validation passed!');
            console.log(`Total categories: ${categories.length}`);
            return { success: true, categories };
        } else {
            console.log('❌ Migration validation failed:');
            issues.forEach(issue => console.log(`  - ${issue}`));
            return { success: false, issues };
        }
        
    } catch (error) {
        console.error('Validation failed:', error.message);
        throw error;
    }
}

// Export functions for use in other scripts
export {
    migrateCategories,
    rollbackMigration,
    validateMigration,
    generateSlug,
    copyImageToUploads
};

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    
    switch (command) {
        case 'migrate':
            migrateCategories()
                .then(result => {
                    console.log('Migration result:', result);
                    process.exit(0);
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
            rollbackMigration(backupPath)
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('Rollback error:', error);
                    process.exit(1);
                });
            break;
            
        case 'validate':
            validateMigration()
                .then(result => {
                    process.exit(result.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('Validation error:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage:');
            console.log('  node migrateCategories.js migrate   - Run migration');
            console.log('  node migrateCategories.js rollback <backup-path> - Rollback migration');
            console.log('  node migrateCategories.js validate  - Validate migration');
            process.exit(1);
    }
}