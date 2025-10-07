#!/usr/bin/env node

/**
 * Category Unique Images Migration Script
 * 
 * This script migrates existing category images to the new unique naming convention:
 * - Renames existing category images to follow cat_[categoryId]_[timestamp].[ext] format
 * - Updates database references to point to new filenames
 * - Cleans up orphaned images (files without database references)
 * - Verifies integrity between database and filesystem
 * 
 * Requirements: 4.3, 1.4
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
  categoriesDir: path.join(__dirname, '../uploads/categories'),
  dryRun: false, // Set to true to preview changes without applying them
  createBackups: true, // Create backup copies of original files
  cleanupOrphans: true, // Remove orphaned image files
  validateIntegrity: true, // Verify database-filesystem integrity
};

/**
 * Ensure required directories exist
 */
function ensureDirectories() {
  // Create backup directory
  if (MIGRATION_CONFIG.createBackups && !fs.existsSync(MIGRATION_CONFIG.backupDir)) {
    fs.mkdirSync(MIGRATION_CONFIG.backupDir, { recursive: true });
    logger.database.info(`Created backup directory: ${MIGRATION_CONFIG.backupDir}`);
  }

  // Create categories backup subdirectory
  const categoriesBackupDir = path.join(MIGRATION_CONFIG.categoriesDir, '.backups');
  if (MIGRATION_CONFIG.createBackups && !fs.existsSync(categoriesBackupDir)) {
    fs.mkdirSync(categoriesBackupDir, { recursive: true });
    logger.database.info(`Created categories backup directory: ${categoriesBackupDir}`);
  }

  // Ensure categories directory exists
  if (!fs.existsSync(MIGRATION_CONFIG.categoriesDir)) {
    fs.mkdirSync(MIGRATION_CONFIG.categoriesDir, { recursive: true });
    logger.database.info(`Created categories directory: ${MIGRATION_CONFIG.categoriesDir}`);
  }
}

/**
 * Create backup of current database state and files
 */
async function createBackup() {
  try {
    if (!MIGRATION_CONFIG.createBackups) {
      logger.database.info('Backup creation disabled, skipping...');
      return null;
    }

    ensureDirectories();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(MIGRATION_CONFIG.backupDir, `category_unique_images_backup_${timestamp}.json`);
    
    logger.database.info('Creating backup of current database state and file list...');
    
    const categories = await categoryModel.find({}).lean();
    
    // Get list of current files in categories directory
    const currentFiles = fs.existsSync(MIGRATION_CONFIG.categoriesDir) 
      ? fs.readdirSync(MIGRATION_CONFIG.categoriesDir).filter(file => 
          !file.startsWith('.') && fs.statSync(path.join(MIGRATION_CONFIG.categoriesDir, file)).isFile()
        )
      : [];
    
    const backupData = {
      timestamp: new Date().toISOString(),
      migration: 'category-unique-images',
      version: '1.0.0',
      config: MIGRATION_CONFIG,
      counts: {
        categories: categories.length,
        files: currentFiles.length
      },
      data: {
        categories,
        files: currentFiles
      }
    };
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    logger.database.info(`✅ Backup created successfully: ${backupPath}`);
    logger.database.info(`📊 Backup contains: ${categories.length} categories, ${currentFiles.length} files`);
    
    return backupPath;
  } catch (error) {
    logger.database.error('❌ Failed to create backup:', error);
    throw error;
  }
}

/**
 * Generate unique image name for category
 */
function generateUniqueImageName(categoryId, originalFilename) {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const fileExtension = path.extname(originalFilename);
  return `cat_${categoryId}_${timestamp}_${randomSuffix}${fileExtension}`;
}

/**
 * Check if filename follows unique naming pattern
 */
function isUniqueNamingFormat(filename) {
  const uniquePattern = /^cat_[a-f0-9]{24}_\d+_\d+\.[a-zA-Z0-9]+$/;
  return uniquePattern.test(filename);
}

/**
 * Extract category ID from unique filename
 */
function extractCategoryIdFromFilename(filename) {
  const match = filename.match(/^cat_([a-f0-9]{24})_\d+_\d+\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
}

/**
 * Analyze current state of category images
 */
async function analyzeCurrentState() {
  try {
    logger.database.info('🔍 Analyzing current category images state...');
    
    const categories = await categoryModel.find({}).lean();
    
    // Get all files in categories directory
    const allFiles = fs.existsSync(MIGRATION_CONFIG.categoriesDir) 
      ? fs.readdirSync(MIGRATION_CONFIG.categoriesDir).filter(file => 
          !file.startsWith('.') && fs.statSync(path.join(MIGRATION_CONFIG.categoriesDir, file)).isFile()
        )
      : [];
    
    const analysis = {
      categories: {
        total: categories.length,
        withImages: 0,
        needsMigration: 0,
        alreadyUnique: 0,
        missingFiles: 0,
        invalidPaths: 0
      },
      files: {
        total: allFiles.length,
        uniqueFormat: 0,
        legacyFormat: 0,
        orphaned: 0,
        referenced: 0
      },
      issues: []
    };
    
    // Create a set of referenced filenames for orphan detection
    const referencedFiles = new Set();
    
    // Analyze categories
    for (const category of categories) {
      if (category.image) {
        analysis.categories.withImages++;
        
        // Extract filename from path
        const filename = path.basename(category.image);
        referencedFiles.add(filename);
        
        // Check if file exists
        const filePath = path.join(MIGRATION_CONFIG.categoriesDir, filename);
        if (!fs.existsSync(filePath)) {
          analysis.categories.missingFiles++;
          analysis.issues.push({
            type: 'missing_file',
            category: category.name,
            categoryId: category._id.toString(),
            imagePath: category.image,
            filename: filename
          });
        }
        
        // Check if path format is valid
        if (!category.image.startsWith('/uploads/categories/')) {
          analysis.categories.invalidPaths++;
          analysis.issues.push({
            type: 'invalid_path',
            category: category.name,
            categoryId: category._id.toString(),
            imagePath: category.image
          });
        }
        
        // Check if filename follows unique naming convention
        if (isUniqueNamingFormat(filename)) {
          analysis.categories.alreadyUnique++;
          
          // Verify the category ID in filename matches actual category ID
          const extractedId = extractCategoryIdFromFilename(filename);
          if (extractedId !== category._id.toString()) {
            analysis.issues.push({
              type: 'id_mismatch',
              category: category.name,
              categoryId: category._id.toString(),
              extractedId: extractedId,
              filename: filename
            });
          }
        } else {
          analysis.categories.needsMigration++;
        }
      }
    }
    
    // Analyze files
    for (const filename of allFiles) {
      if (isUniqueNamingFormat(filename)) {
        analysis.files.uniqueFormat++;
      } else {
        analysis.files.legacyFormat++;
      }
      
      if (referencedFiles.has(filename)) {
        analysis.files.referenced++;
      } else {
        analysis.files.orphaned++;
        analysis.issues.push({
          type: 'orphaned_file',
          filename: filename,
          filePath: path.join(MIGRATION_CONFIG.categoriesDir, filename)
        });
      }
    }
    
    // Log analysis results
    logger.database.info('\n📊 Current State Analysis:');
    logger.database.info(`\n📂 Categories:`);
    logger.database.info(`  Total: ${analysis.categories.total}`);
    logger.database.info(`  With images: ${analysis.categories.withImages}`);
    logger.database.info(`  Need migration: ${analysis.categories.needsMigration}`);
    logger.database.info(`  Already unique: ${analysis.categories.alreadyUnique}`);
    logger.database.info(`  Missing files: ${analysis.categories.missingFiles}`);
    logger.database.info(`  Invalid paths: ${analysis.categories.invalidPaths}`);
    
    logger.database.info(`\n📁 Files:`);
    logger.database.info(`  Total: ${analysis.files.total}`);
    logger.database.info(`  Unique format: ${analysis.files.uniqueFormat}`);
    logger.database.info(`  Legacy format: ${analysis.files.legacyFormat}`);
    logger.database.info(`  Referenced: ${analysis.files.referenced}`);
    logger.database.info(`  Orphaned: ${analysis.files.orphaned}`);
    
    if (analysis.issues.length > 0) {
      logger.database.info(`\n⚠️  Issues found: ${analysis.issues.length}`);
      analysis.issues.forEach((issue, index) => {
        logger.database.info(`  ${index + 1}. ${issue.type}: ${JSON.stringify(issue, null, 2)}`);
      });
    }
    
    return analysis;
  } catch (error) {
    logger.database.error('❌ Failed to analyze current state:', error);
    throw error;
  }
}

/**
 * Migrate category images to unique naming convention
 */
async function migrateCategoryImages() {
  try {
    logger.database.info('🔄 Starting category images migration to unique naming...');
    
    const categories = await categoryModel.find({});
    const results = {
      total: categories.length,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
    
    for (const category of categories) {
      try {
        if (!category.image) {
          logger.database.info(`⏭️  Category "${category.name}": No image to migrate`);
          results.skipped++;
          continue;
        }
        
        const currentFilename = path.basename(category.image);
        const currentFilePath = path.join(MIGRATION_CONFIG.categoriesDir, currentFilename);
        
        // Skip if already follows unique naming convention
        if (isUniqueNamingFormat(currentFilename)) {
          // Verify the category ID matches
          const extractedId = extractCategoryIdFromFilename(currentFilename);
          if (extractedId === category._id.toString()) {
            logger.database.info(`⏭️  Category "${category.name}": Already has unique naming`);
            results.skipped++;
            continue;
          } else {
            logger.database.info(`⚠️  Category "${category.name}": Unique format but wrong ID, will migrate`);
          }
        }
        
        // Check if current file exists
        if (!fs.existsSync(currentFilePath)) {
          logger.database.error(`❌ Category "${category.name}": Current image file not found - ${currentFilePath}`);
          results.errors++;
          results.details.push({
            category: category.name,
            status: 'error',
            reason: 'File not found',
            currentPath: currentFilePath
          });
          continue;
        }
        
        // Generate new unique filename
        const newFilename = generateUniqueImageName(category._id.toString(), currentFilename);
        const newFilePath = path.join(MIGRATION_CONFIG.categoriesDir, newFilename);
        const newImagePath = `/uploads/categories/${newFilename}`;
        
        // Create backup of original file if enabled
        if (MIGRATION_CONFIG.createBackups) {
          const backupDir = path.join(MIGRATION_CONFIG.categoriesDir, '.backups');
          const backupFilePath = path.join(backupDir, currentFilename);
          
          if (!MIGRATION_CONFIG.dryRun) {
            fs.copyFileSync(currentFilePath, backupFilePath);
            logger.database.info(`📋 Created backup: ${backupFilePath}`);
          }
        }
        
        // Rename file to new unique name
        if (!MIGRATION_CONFIG.dryRun) {
          fs.renameSync(currentFilePath, newFilePath);
          
          // Update database with new image path
          category.image = newImagePath;
          await category.save();
        }
        
        logger.database.info(`✅ Category "${category.name}": ${currentFilename} → ${newFilename}`);
        results.migrated++;
        results.details.push({
          category: category.name,
          categoryId: category._id.toString(),
          status: 'migrated',
          oldFilename: currentFilename,
          newFilename: newFilename,
          oldPath: category.image,
          newPath: newImagePath
        });
        
      } catch (error) {
        logger.database.error(`❌ Error migrating category "${category.name}":`, error.message);
        results.errors++;
        results.details.push({
          category: category.name,
          status: 'error',
          reason: error.message
        });
      }
    }
    
    logger.database.info(`\n📊 Migration Results:`);
    logger.database.info(`  Total: ${results.total}`);
    logger.database.info(`  Migrated: ${results.migrated}`);
    logger.database.info(`  Skipped: ${results.skipped}`);
    logger.database.info(`  Errors: ${results.errors}`);
    
    return results;
  } catch (error) {
    logger.database.error('❌ Failed to migrate category images:', error);
    throw error;
  }
}

/**
 * Clean up orphaned image files
 */
async function cleanupOrphanedImages() {
  try {
    if (!MIGRATION_CONFIG.cleanupOrphans) {
      logger.database.info('Orphan cleanup disabled, skipping...');
      return { total: 0, cleaned: 0, skipped: 0, errors: 0 };
    }

    logger.database.info('🧹 Starting cleanup of orphaned image files...');
    
    // Get all categories with their image filenames
    const categories = await categoryModel.find({}).lean();
    const referencedFiles = new Set();
    
    categories.forEach(category => {
      if (category.image) {
        const filename = path.basename(category.image);
        referencedFiles.add(filename);
      }
    });
    
    // Get all files in categories directory
    const allFiles = fs.existsSync(MIGRATION_CONFIG.categoriesDir) 
      ? fs.readdirSync(MIGRATION_CONFIG.categoriesDir).filter(file => {
          const filePath = path.join(MIGRATION_CONFIG.categoriesDir, file);
          return !file.startsWith('.') && fs.statSync(filePath).isFile();
        })
      : [];
    
    const results = {
      total: allFiles.length,
      cleaned: 0,
      skipped: 0,
      errors: 0,
      orphanedFiles: []
    };
    
    for (const filename of allFiles) {
      try {
        if (referencedFiles.has(filename)) {
          logger.database.info(`⏭️  File "${filename}": Referenced by category, keeping`);
          results.skipped++;
          continue;
        }
        
        // This is an orphaned file
        const filePath = path.join(MIGRATION_CONFIG.categoriesDir, filename);
        results.orphanedFiles.push(filename);
        
        // Create backup before deletion if enabled
        if (MIGRATION_CONFIG.createBackups) {
          const backupDir = path.join(MIGRATION_CONFIG.categoriesDir, '.backups');
          const backupFilePath = path.join(backupDir, `orphan_${filename}`);
          
          if (!MIGRATION_CONFIG.dryRun) {
            fs.copyFileSync(filePath, backupFilePath);
            logger.database.info(`📋 Created backup of orphan: ${backupFilePath}`);
          }
        }
        
        // Delete orphaned file
        if (!MIGRATION_CONFIG.dryRun) {
          fs.unlinkSync(filePath);
        }
        
        logger.database.info(`🗑️  Cleaned orphaned file: ${filename}`);
        results.cleaned++;
        
      } catch (error) {
        logger.database.error(`❌ Error cleaning file "${filename}":`, error.message);
        results.errors++;
      }
    }
    
    logger.database.info(`\n📊 Cleanup Results:`);
    logger.database.info(`  Total files: ${results.total}`);
    logger.database.info(`  Cleaned: ${results.cleaned}`);
    logger.database.info(`  Skipped (referenced): ${results.skipped}`);
    logger.database.info(`  Errors: ${results.errors}`);
    
    if (results.orphanedFiles.length > 0) {
      logger.database.info(`\n🗑️  Orphaned files cleaned:`);
      results.orphanedFiles.forEach(filename => {
        logger.database.info(`  - ${filename}`);
      });
    }
    
    return results;
  } catch (error) {
    logger.database.error('❌ Failed to cleanup orphaned images:', error);
    throw error;
  }
}

/**
 * Verify integrity between database and filesystem
 */
async function verifyIntegrity() {
  try {
    if (!MIGRATION_CONFIG.validateIntegrity) {
      logger.database.info('Integrity validation disabled, skipping...');
      return { isValid: true, issues: [] };
    }

    logger.database.info('🔍 Verifying integrity between database and filesystem...');
    
    const categories = await categoryModel.find({}).lean();
    const issues = [];
    let validCount = 0;
    
    // Get all files in categories directory
    const allFiles = fs.existsSync(MIGRATION_CONFIG.categoriesDir) 
      ? fs.readdirSync(MIGRATION_CONFIG.categoriesDir).filter(file => {
          const filePath = path.join(MIGRATION_CONFIG.categoriesDir, file);
          return !file.startsWith('.') && fs.statSync(filePath).isFile();
        })
      : [];
    
    const filesSet = new Set(allFiles);
    
    // Check each category
    for (const category of categories) {
      if (!category.image) {
        issues.push({
          type: 'missing_image_reference',
          category: category.name,
          categoryId: category._id.toString(),
          description: 'Category has no image reference'
        });
        continue;
      }
      
      // Check path format
      if (!category.image.startsWith('/uploads/categories/')) {
        issues.push({
          type: 'invalid_path_format',
          category: category.name,
          categoryId: category._id.toString(),
          imagePath: category.image,
          description: 'Image path does not start with /uploads/categories/'
        });
        continue;
      }
      
      // Extract filename and check if file exists
      const filename = path.basename(category.image);
      if (!filesSet.has(filename)) {
        issues.push({
          type: 'missing_file',
          category: category.name,
          categoryId: category._id.toString(),
          imagePath: category.image,
          filename: filename,
          description: 'Referenced file does not exist on filesystem'
        });
        continue;
      }
      
      // Check if filename follows unique naming convention
      if (!isUniqueNamingFormat(filename)) {
        issues.push({
          type: 'non_unique_naming',
          category: category.name,
          categoryId: category._id.toString(),
          filename: filename,
          description: 'Filename does not follow unique naming convention'
        });
        continue;
      }
      
      // Check if category ID in filename matches actual category ID
      const extractedId = extractCategoryIdFromFilename(filename);
      if (extractedId !== category._id.toString()) {
        issues.push({
          type: 'id_mismatch',
          category: category.name,
          categoryId: category._id.toString(),
          extractedId: extractedId,
          filename: filename,
          description: 'Category ID in filename does not match database ID'
        });
        continue;
      }
      
      validCount++;
    }
    
    // Check for orphaned files
    const referencedFiles = new Set();
    categories.forEach(category => {
      if (category.image) {
        referencedFiles.add(path.basename(category.image));
      }
    });
    
    for (const filename of allFiles) {
      if (!referencedFiles.has(filename)) {
        issues.push({
          type: 'orphaned_file',
          filename: filename,
          description: 'File exists but is not referenced by any category'
        });
      }
    }
    
    const isValid = issues.length === 0;
    
    logger.database.info(`\n📊 Integrity Verification Results:`);
    logger.database.info(`  Total categories: ${categories.length}`);
    logger.database.info(`  Valid categories: ${validCount}`);
    logger.database.info(`  Total files: ${allFiles.length}`);
    logger.database.info(`  Issues found: ${issues.length}`);
    logger.database.info(`  Overall status: ${isValid ? '✅ VALID' : '❌ ISSUES FOUND'}`);
    
    if (issues.length > 0) {
      logger.database.info(`\n⚠️  Issues Details:`);
      issues.forEach((issue, index) => {
        logger.database.info(`  ${index + 1}. ${issue.type}: ${issue.description}`);
        if (issue.category) logger.database.info(`     Category: ${issue.category}`);
        if (issue.filename) logger.database.info(`     File: ${issue.filename}`);
        if (issue.imagePath) logger.database.info(`     Path: ${issue.imagePath}`);
      });
    }
    
    return { isValid, issues, validCount, totalCategories: categories.length };
  } catch (error) {
    logger.database.error('❌ Failed to verify integrity:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    logger.database.info('🚀 Starting Category Unique Images Migration...');
    logger.database.info(`📁 Categories directory: ${MIGRATION_CONFIG.categoriesDir}`);
    logger.database.info(`🔍 Dry run: ${MIGRATION_CONFIG.dryRun}`);
    logger.database.info(`📋 Create backups: ${MIGRATION_CONFIG.createBackups}`);
    logger.database.info(`🧹 Cleanup orphans: ${MIGRATION_CONFIG.cleanupOrphans}`);
    logger.database.info(`✅ Validate integrity: ${MIGRATION_CONFIG.validateIntegrity}`);
    
    // Connect to database
    await connectDB();
    
    // Ensure directories exist
    ensureDirectories();
    
    // Analyze current state
    const analysis = await analyzeCurrentState();
    
    // Create backup
    const backupPath = await createBackup();
    
    // Run migration
    const migrationResults = await migrateCategoryImages();
    
    // Clean up orphaned images
    const cleanupResults = await cleanupOrphanedImages();
    
    // Verify integrity
    const integrityResults = await verifyIntegrity();
    
    // Summary
    logger.database.info('\n🎉 Migration Summary:');
    if (backupPath) logger.database.info(`📁 Backup: ${backupPath}`);
    logger.database.info(`🔄 Categories migrated: ${migrationResults.migrated}/${migrationResults.total}`);
    logger.database.info(`🧹 Orphaned files cleaned: ${cleanupResults.cleaned}/${cleanupResults.total}`);
    logger.database.info(`✅ Integrity validation: ${integrityResults.isValid ? 'PASSED' : 'FAILED'}`);
    
    if (MIGRATION_CONFIG.dryRun) {
      logger.database.info('\n🔍 This was a dry run - no changes were applied');
      logger.database.info('Set MIGRATION_CONFIG.dryRun = false to apply changes');
    }
    
    return {
      success: true,
      backupPath,
      analysis,
      migrationResults,
      cleanupResults,
      integrityResults
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
  analyzeCurrentState,
  migrateCategoryImages,
  cleanupOrphanedImages,
  verifyIntegrity,
  createBackup,
  generateUniqueImageName,
  isUniqueNamingFormat,
  extractCategoryIdFromFilename,
  MIGRATION_CONFIG
};

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      // Check for flags
      if (process.argv.includes('--dry-run')) {
        MIGRATION_CONFIG.dryRun = true;
      }
      if (process.argv.includes('--no-backup')) {
        MIGRATION_CONFIG.createBackups = false;
      }
      if (process.argv.includes('--no-cleanup')) {
        MIGRATION_CONFIG.cleanupOrphans = false;
      }
      if (process.argv.includes('--no-validate')) {
        MIGRATION_CONFIG.validateIntegrity = false;
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
      
    case 'analyze':
      connectDB()
        .then(() => analyzeCurrentState())
        .then(() => {
          logger.database.info('\n🎉 Analysis completed!');
          process.exit(0);
        })
        .catch(error => {
          logger.database.error('\n💥 Analysis failed:', error);
          process.exit(1);
        });
      break;
      
    case 'verify':
      connectDB()
        .then(() => verifyIntegrity())
        .then(({ isValid }) => {
          process.exit(isValid ? 0 : 1);
        })
        .catch(error => {
          logger.database.error('\n💥 Verification failed:', error);
          process.exit(1);
        });
      break;
      
    case 'cleanup':
      if (process.argv.includes('--dry-run')) {
        MIGRATION_CONFIG.dryRun = true;
      }
      
      connectDB()
        .then(() => cleanupOrphanedImages())
        .then(() => {
          logger.database.info('\n🎉 Cleanup completed!');
          process.exit(0);
        })
        .catch(error => {
          logger.database.error('\n💥 Cleanup failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Category Unique Images Migration Script');
      console.log('');
      console.log('Usage:');
      console.log('  node migrateCategoryUniqueImages.js migrate [--dry-run] [--no-backup] [--no-cleanup] [--no-validate]');
      console.log('    Run the complete migration process');
      console.log('');
      console.log('  node migrateCategoryUniqueImages.js analyze');
      console.log('    Analyze current state without making changes');
      console.log('');
      console.log('  node migrateCategoryUniqueImages.js verify');
      console.log('    Verify integrity between database and filesystem');
      console.log('');
      console.log('  node migrateCategoryUniqueImages.js cleanup [--dry-run]');
      console.log('    Clean up orphaned image files only');
      console.log('');
      console.log('Examples:');
      console.log('  node migrateCategoryUniqueImages.js migrate --dry-run');
      console.log('  node migrateCategoryUniqueImages.js migrate');
      console.log('  node migrateCategoryUniqueImages.js analyze');
      console.log('  node migrateCategoryUniqueImages.js verify');
      process.exit(1);
  }
}