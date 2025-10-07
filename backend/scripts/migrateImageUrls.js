#!/usr/bin/env node

/**
 * Comprehensive Database Migration Script for Image URLs
 * 
 * This script fixes existing image paths in the database to ensure consistency:
 * - Updates all food items with inconsistent image paths to use `/uploads/` prefix
 * - Updates all categories with inconsistent image paths to use `/uploads/categories/` prefix
 * - Verifies all migrated URLs point to existing files
 * - Creates backups and provides rollback functionality
 * - Comprehensive logging and validation
 * 
 * Requirements: 5.1, 5.2
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import foodModel from '../models/foodModel.js';
import categoryModel from '../models/categoryModel.js';
import { connectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration for the migration
 */
const MIGRATION_CONFIG = {
  backupDir: path.join(__dirname, '../backups'),
  uploadsDir: path.join(__dirname, '../uploads'),
  categoriesDir: path.join(__dirname, '../uploads/categories'),
  dryRun: false, // Set to true to preview changes without applying them
  validateFiles: true, // Set to false to skip file existence validation
};

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDirectory() {
  if (!fs.existsSync(MIGRATION_CONFIG.backupDir)) {
    fs.mkdirSync(MIGRATION_CONFIG.backupDir, { recursive: true });
    logger.database.info(`Created backup directory: ${MIGRATION_CONFIG.backupDir}`);
  }
}

/**
 * Create backup of current database state
 */
async function createBackup() {
  try {
    ensureBackupDirectory();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(MIGRATION_CONFIG.backupDir, `image_urls_backup_${timestamp}.json`);
    
    logger.database.info('Creating backup of current database state...');
    
    const [foods, categories] = await Promise.all([
      foodModel.find({}).lean(),
      categoryModel.find({}).lean()
    ]);
    
    const backupData = {
      timestamp: new Date().toISOString(),
      migration: 'image-urls',
      version: '1.0.0',
      counts: {
        foods: foods.length,
        categories: categories.length
      },
      data: {
        foods,
        categories
      }
    };
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    logger.database.info(`✅ Backup created successfully: ${backupPath}`);
    logger.database.info(`📊 Backup contains: ${foods.length} foods, ${categories.length} categories`);
    
    return backupPath;
  } catch (error) {
    logger.database.error('❌ Failed to create backup:', error);
    throw error;
  }
}

/**
 * Check if a file exists in the uploads directory
 */
function fileExists(imagePath) {
  if (!imagePath) return false;
  
  // Remove leading slash and construct full path
  const relativePath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  const fullPath = path.join(__dirname, '..', relativePath);
  
  return fs.existsSync(fullPath);
}

/**
 * Normalize image path to use consistent /uploads/ prefix
 */
function normalizeImagePath(imagePath, type = 'food') {
  if (!imagePath) return null;
  
  // Already a full URL (http/https)
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Already properly formatted
  if (type === 'category' && imagePath.startsWith('/uploads/categories/')) {
    return imagePath;
  }
  if (type === 'food' && imagePath.startsWith('/uploads/') && !imagePath.startsWith('/uploads/categories/')) {
    return imagePath;
  }
  
  // Remove any existing prefixes
  let cleanPath = imagePath;
  if (cleanPath.startsWith('/uploads/categories/')) {
    cleanPath = cleanPath.replace('/uploads/categories/', '');
  } else if (cleanPath.startsWith('/uploads/')) {
    cleanPath = cleanPath.replace('/uploads/', '');
  } else if (cleanPath.startsWith('/images/')) {
    cleanPath = cleanPath.replace('/images/', '');
  } else if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }
  
  // Add appropriate prefix
  if (type === 'category') {
    return `/uploads/categories/${cleanPath}`;
  } else {
    return `/uploads/${cleanPath}`;
  }
}

/**
 * Analyze current database state
 */
async function analyzeDatabase() {
  try {
    logger.database.info('🔍 Analyzing current database state...');
    
    const [foods, categories] = await Promise.all([
      foodModel.find({}).lean(),
      categoryModel.find({}).lean()
    ]);
    
    const analysis = {
      foods: {
        total: foods.length,
        withImages: 0,
        needsMigration: 0,
        missingFiles: 0,
        patterns: {}
      },
      categories: {
        total: categories.length,
        withImages: 0,
        needsMigration: 0,
        missingFiles: 0,
        patterns: {}
      }
    };
    
    // Analyze foods
    for (const food of foods) {
      if (food.image) {
        analysis.foods.withImages++;
        
        // Track patterns
        const pattern = getImagePattern(food.image);
        analysis.foods.patterns[pattern] = (analysis.foods.patterns[pattern] || 0) + 1;
        
        // Check if needs migration
        const normalized = normalizeImagePath(food.image, 'food');
        if (normalized !== food.image) {
          analysis.foods.needsMigration++;
        }
        
        // Check if file exists
        if (MIGRATION_CONFIG.validateFiles && !fileExists(normalized || food.image)) {
          analysis.foods.missingFiles++;
        }
      }
    }
    
    // Analyze categories
    for (const category of categories) {
      if (category.image) {
        analysis.categories.withImages++;
        
        // Track patterns
        const pattern = getImagePattern(category.image);
        analysis.categories.patterns[pattern] = (analysis.categories.patterns[pattern] || 0) + 1;
        
        // Check if needs migration
        const normalized = normalizeImagePath(category.image, 'category');
        if (normalized !== category.image) {
          analysis.categories.needsMigration++;
        }
        
        // Check if file exists
        if (MIGRATION_CONFIG.validateFiles && !fileExists(normalized || category.image)) {
          analysis.categories.missingFiles++;
        }
      }
    }
    
    // Log analysis results
    logger.database.info('\n📊 Database Analysis Results:');
    logger.database.info(`\n🍕 Foods:`);
    logger.database.info(`  Total: ${analysis.foods.total}`);
    logger.database.info(`  With images: ${analysis.foods.withImages}`);
    logger.database.info(`  Need migration: ${analysis.foods.needsMigration}`);
    logger.database.info(`  Missing files: ${analysis.foods.missingFiles}`);
    logger.database.info(`  URL patterns:`, analysis.foods.patterns);
    
    logger.database.info(`\n📂 Categories:`);
    logger.database.info(`  Total: ${analysis.categories.total}`);
    logger.database.info(`  With images: ${analysis.categories.withImages}`);
    logger.database.info(`  Need migration: ${analysis.categories.needsMigration}`);
    logger.database.info(`  Missing files: ${analysis.categories.missingFiles}`);
    logger.database.info(`  URL patterns:`, analysis.categories.patterns);
    
    return analysis;
  } catch (error) {
    logger.database.error('❌ Failed to analyze database:', error);
    throw error;
  }
}

/**
 * Get image URL pattern for analysis
 */
function getImagePattern(imagePath) {
  if (!imagePath) return 'empty';
  if (imagePath.startsWith('http')) return 'full-url';
  if (imagePath.startsWith('/uploads/categories/')) return '/uploads/categories/';
  if (imagePath.startsWith('/uploads/')) return '/uploads/';
  if (imagePath.startsWith('/images/')) return '/images/';
  if (imagePath.startsWith('/')) return 'absolute-path';
  return 'filename-only';
}

/**
 * Migrate food image URLs
 */
async function migrateFoodImages() {
  try {
    logger.database.info('🍕 Starting food image URL migration...');
    
    const foods = await foodModel.find({});
    const results = {
      total: foods.length,
      migrated: 0,
      skipped: 0,
      errors: 0,
      missingFiles: []
    };
    
    for (const food of foods) {
      try {
        if (!food.image) {
          logger.database.info(`⚠️  Food "${food.name}" has no image`);
          results.skipped++;
          continue;
        }
        
        const originalPath = food.image;
        const normalizedPath = normalizeImagePath(originalPath, 'food');
        
        // Skip if already normalized
        if (originalPath === normalizedPath) {
          logger.database.info(`⏭️  Food "${food.name}": ${originalPath} (already correct)`);
          results.skipped++;
          continue;
        }
        
        // Check if file exists
        if (MIGRATION_CONFIG.validateFiles && !fileExists(normalizedPath)) {
          logger.database.info(`⚠️  Food "${food.name}": File not found - ${normalizedPath}`);
          results.missingFiles.push({
            type: 'food',
            name: food.name,
            originalPath,
            normalizedPath
          });
          results.skipped++;
          continue;
        }
        
        // Apply migration
        if (!MIGRATION_CONFIG.dryRun) {
          food.image = normalizedPath;
          await food.save();
        }
        
        logger.database.info(`✅ Food "${food.name}": ${originalPath} → ${normalizedPath}`);
        results.migrated++;
        
      } catch (error) {
        logger.database.error(`❌ Error migrating food "${food.name}":`, error.message);
        results.errors++;
      }
    }
    
    logger.database.info(`\n📊 Food Migration Results:`);
    logger.database.info(`  Total: ${results.total}`);
    logger.database.info(`  Migrated: ${results.migrated}`);
    logger.database.info(`  Skipped: ${results.skipped}`);
    logger.database.info(`  Errors: ${results.errors}`);
    logger.database.info(`  Missing files: ${results.missingFiles.length}`);
    
    return results;
  } catch (error) {
    logger.database.error('❌ Failed to migrate food images:', error);
    throw error;
  }
}

/**
 * Migrate category image URLs
 */
async function migrateCategoryImages() {
  try {
    logger.database.info('📂 Starting category image URL migration...');
    
    const categories = await categoryModel.find({});
    const results = {
      total: categories.length,
      migrated: 0,
      skipped: 0,
      errors: 0,
      missingFiles: []
    };
    
    for (const category of categories) {
      try {
        if (!category.image) {
          logger.database.info(`⚠️  Category "${category.name}" has no image`);
          results.skipped++;
          continue;
        }
        
        const originalPath = category.image;
        const normalizedPath = normalizeImagePath(originalPath, 'category');
        
        // Skip if already normalized
        if (originalPath === normalizedPath) {
          logger.database.info(`⏭️  Category "${category.name}": ${originalPath} (already correct)`);
          results.skipped++;
          continue;
        }
        
        // Check if file exists
        if (MIGRATION_CONFIG.validateFiles && !fileExists(normalizedPath)) {
          logger.database.info(`⚠️  Category "${category.name}": File not found - ${normalizedPath}`);
          results.missingFiles.push({
            type: 'category',
            name: category.name,
            originalPath,
            normalizedPath
          });
          results.skipped++;
          continue;
        }
        
        // Apply migration
        if (!MIGRATION_CONFIG.dryRun) {
          category.image = normalizedPath;
          await category.save();
        }
        
        logger.database.info(`✅ Category "${category.name}": ${originalPath} → ${normalizedPath}`);
        results.migrated++;
        
      } catch (error) {
        logger.database.error(`❌ Error migrating category "${category.name}":`, error.message);
        results.errors++;
      }
    }
    
    logger.database.info(`\n📊 Category Migration Results:`);
    logger.database.info(`  Total: ${results.total}`);
    logger.database.info(`  Migrated: ${results.migrated}`);
    logger.database.info(`  Skipped: ${results.skipped}`);
    logger.database.info(`  Errors: ${results.errors}`);
    logger.database.info(`  Missing files: ${results.missingFiles.length}`);
    
    return results;
  } catch (error) {
    logger.database.error('❌ Failed to migrate category images:', error);
    throw error;
  }
}

/**
 * Validate migration results
 */
async function validateMigration() {
  try {
    logger.database.info('🔍 Validating migration results...');
    
    const [foods, categories] = await Promise.all([
      foodModel.find({}).lean(),
      categoryModel.find({}).lean()
    ]);
    
    const validation = {
      foods: {
        total: foods.length,
        valid: 0,
        invalid: 0,
        missingFiles: 0,
        issues: []
      },
      categories: {
        total: categories.length,
        valid: 0,
        invalid: 0,
        missingFiles: 0,
        issues: []
      }
    };
    
    // Validate foods
    for (const food of foods) {
      if (food.image) {
        const isValidFormat = food.image.startsWith('/uploads/') && !food.image.startsWith('/uploads/categories/');
        const fileExistsOnDisk = !MIGRATION_CONFIG.validateFiles || fileExists(food.image);
        
        if (isValidFormat && fileExistsOnDisk) {
          validation.foods.valid++;
        } else {
          validation.foods.invalid++;
          const issue = {
            name: food.name,
            image: food.image,
            problems: []
          };
          
          if (!isValidFormat) {
            issue.problems.push('Invalid URL format');
          }
          if (!fileExistsOnDisk) {
            issue.problems.push('File not found');
            validation.foods.missingFiles++;
          }
          
          validation.foods.issues.push(issue);
        }
      }
    }
    
    // Validate categories
    for (const category of categories) {
      if (category.image) {
        const isValidFormat = category.image.startsWith('/uploads/categories/');
        const fileExistsOnDisk = !MIGRATION_CONFIG.validateFiles || fileExists(category.image);
        
        if (isValidFormat && fileExistsOnDisk) {
          validation.categories.valid++;
        } else {
          validation.categories.invalid++;
          const issue = {
            name: category.name,
            image: category.image,
            problems: []
          };
          
          if (!isValidFormat) {
            issue.problems.push('Invalid URL format');
          }
          if (!fileExistsOnDisk) {
            issue.problems.push('File not found');
            validation.categories.missingFiles++;
          }
          
          validation.categories.issues.push(issue);
        }
      }
    }
    
    // Log validation results
    logger.database.info('\n📊 Validation Results:');
    logger.database.info(`\n🍕 Foods:`);
    logger.database.info(`  Total: ${validation.foods.total}`);
    logger.database.info(`  Valid: ${validation.foods.valid}`);
    logger.database.info(`  Invalid: ${validation.foods.invalid}`);
    logger.database.info(`  Missing files: ${validation.foods.missingFiles}`);
    
    logger.database.info(`\n📂 Categories:`);
    logger.database.info(`  Total: ${validation.categories.total}`);
    logger.database.info(`  Valid: ${validation.categories.valid}`);
    logger.database.info(`  Invalid: ${validation.categories.invalid}`);
    logger.database.info(`  Missing files: ${validation.categories.missingFiles}`);
    
    // Log issues if any
    if (validation.foods.issues.length > 0) {
      logger.database.info('\n⚠️  Food Issues:');
      validation.foods.issues.forEach(issue => {
        logger.database.info(`  - ${issue.name}: ${issue.problems.join(', ')} (${issue.image})`);
      });
    }
    
    if (validation.categories.issues.length > 0) {
      logger.database.info('\n⚠️  Category Issues:');
      validation.categories.issues.forEach(issue => {
        logger.database.info(`  - ${issue.name}: ${issue.problems.join(', ')} (${issue.image})`);
      });
    }
    
    const isValid = validation.foods.invalid === 0 && validation.categories.invalid === 0;
    
    if (isValid) {
      logger.database.info('\n✅ Migration validation passed!');
    } else {
      logger.database.info('\n⚠️  Migration validation found issues');
    }
    
    return { isValid, validation };
  } catch (error) {
    logger.database.error('❌ Failed to validate migration:', error);
    throw error;
  }
}

/**
 * Rollback migration using backup
 */
async function rollbackMigration(backupPath) {
  try {
    logger.database.info(`🔄 Starting migration rollback from: ${backupPath}`);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    if (!backupData.data || !backupData.data.foods || !backupData.data.categories) {
      throw new Error('Invalid backup file format');
    }
    
    logger.database.info(`📊 Backup contains: ${backupData.data.foods.length} foods, ${backupData.data.categories.length} categories`);
    
    // Restore foods
    logger.database.info('🍕 Restoring food image URLs...');
    let foodsRestored = 0;
    for (const foodData of backupData.data.foods) {
      const food = await foodModel.findById(foodData._id);
      if (food && food.image !== foodData.image) {
        food.image = foodData.image;
        await food.save();
        foodsRestored++;
        logger.database.info(`✅ Restored food "${food.name}": ${food.image} → ${foodData.image}`);
      }
    }
    
    // Restore categories
    logger.database.info('📂 Restoring category image URLs...');
    let categoriesRestored = 0;
    for (const categoryData of backupData.data.categories) {
      const category = await categoryModel.findById(categoryData._id);
      if (category && category.image !== categoryData.image) {
        category.image = categoryData.image;
        await category.save();
        categoriesRestored++;
        logger.database.info(`✅ Restored category "${category.name}": ${category.image} → ${categoryData.image}`);
      }
    }
    
    logger.database.info('\n📊 Rollback Results:');
    logger.database.info(`  Foods restored: ${foodsRestored}`);
    logger.database.info(`  Categories restored: ${categoriesRestored}`);
    logger.database.info('\n✅ Rollback completed successfully!');
    
    return {
      success: true,
      foodsRestored,
      categoriesRestored
    };
    
  } catch (error) {
    logger.database.error('❌ Failed to rollback migration:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    logger.database.info('🚀 Starting Image URL Migration...');
    logger.database.info(`📁 Uploads directory: ${MIGRATION_CONFIG.uploadsDir}`);
    logger.database.info(`📁 Categories directory: ${MIGRATION_CONFIG.categoriesDir}`);
    logger.database.info(`🔍 Dry run: ${MIGRATION_CONFIG.dryRun}`);
    logger.database.info(`✅ Validate files: ${MIGRATION_CONFIG.validateFiles}`);
    
    // Connect to database
    await connectDB();
    
    // Analyze current state
    const analysis = await analyzeDatabase();
    
    // Create backup
    const backupPath = await createBackup();
    
    // Run migrations
    const foodResults = await migrateFoodImages();
    const categoryResults = await migrateCategoryImages();
    
    // Validate results
    const { isValid, validation } = await validateMigration();
    
    // Summary
    logger.database.info('\n🎉 Migration Summary:');
    logger.database.info(`📁 Backup: ${backupPath}`);
    logger.database.info(`🍕 Foods migrated: ${foodResults.migrated}/${foodResults.total}`);
    logger.database.info(`📂 Categories migrated: ${categoryResults.migrated}/${categoryResults.total}`);
    logger.database.info(`✅ Validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    if (MIGRATION_CONFIG.dryRun) {
      logger.database.info('\n🔍 This was a dry run - no changes were applied');
      logger.database.info('Set MIGRATION_CONFIG.dryRun = false to apply changes');
    }
    
    return {
      success: true,
      backupPath,
      analysis,
      foodResults,
      categoryResults,
      validation,
      isValid
    };
    
  } catch (error) {
    logger.database.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.database.info('🔌 Database connection closed');
    }
  }
}

// Export functions for use in other scripts
export {
  runMigration,
  rollbackMigration,
  validateMigration,
  analyzeDatabase,
  createBackup,
  normalizeImagePath,
  fileExists,
  MIGRATION_CONFIG
};

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'migrate':
      // Check for dry-run flag
      if (process.argv.includes('--dry-run')) {
        MIGRATION_CONFIG.dryRun = true;
      }
      if (process.argv.includes('--no-validate')) {
        MIGRATION_CONFIG.validateFiles = false;
      }
      
      runMigration()
        .then(result => {
          logger.database.info('\n🎉 Migration completed successfully!');
          process.exit(0);
        })
        .catch(error => {
          logger.database.error('\n💥 Migration failed:', error);
          process.exit(1);
        });
      break;
      
    case 'rollback':
      if (!arg) {
        console.error('Please provide backup file path');
        console.error('Usage: node migrateImageUrls.js rollback <backup-path>');
        process.exit(1);
      }
      
      connectDB()
        .then(() => rollbackMigration(arg))
        .then(() => {
          logger.database.info('\n🎉 Rollback completed successfully!');
          process.exit(0);
        })
        .catch(error => {
          logger.database.error('\n💥 Rollback failed:', error);
          process.exit(1);
        });
      break;
      
    case 'validate':
      connectDB()
        .then(() => validateMigration())
        .then(({ isValid }) => {
          process.exit(isValid ? 0 : 1);
        })
        .catch(error => {
          logger.database.error('\n💥 Validation failed:', error);
          process.exit(1);
        });
      break;
      
    case 'analyze':
      connectDB()
        .then(() => analyzeDatabase())
        .then(() => {
          logger.database.info('\n🎉 Analysis completed!');
          process.exit(0);
        })
        .catch(error => {
          logger.database.error('\n💥 Analysis failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Image URL Migration Script');
      console.log('');
      console.log('Usage:');
      console.log('  node migrateImageUrls.js migrate [--dry-run] [--no-validate]');
      console.log('    Run the migration (use --dry-run to preview changes)');
      console.log('');
      console.log('  node migrateImageUrls.js rollback <backup-path>');
      console.log('    Rollback migration using backup file');
      console.log('');
      console.log('  node migrateImageUrls.js validate');
      console.log('    Validate current database state');
      console.log('');
      console.log('  node migrateImageUrls.js analyze');
      console.log('    Analyze current database state without making changes');
      console.log('');
      console.log('Examples:');
      console.log('  node migrateImageUrls.js migrate --dry-run');
      console.log('  node migrateImageUrls.js migrate');
      console.log('  node migrateImageUrls.js rollback ../backups/image_urls_backup_2024-01-15.json');
      process.exit(1);
  }
}