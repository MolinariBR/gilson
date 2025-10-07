#!/usr/bin/env node

/**
 * Category Image Maintenance CLI Utility
 * 
 * A simple command-line interface for category image maintenance tasks:
 * - Migration to unique naming convention
 * - Integrity checking
 * - Orphaned image cleanup
 * - Storage statistics
 * 
 * Requirements: 4.3, 1.4
 */

import { connectDB } from '../config/db.js';
import CategoryImageIntegrity from '../utils/categoryImageIntegrity.js';
import { 
  runMigration, 
  analyzeCurrentState, 
  verifyIntegrity,
  cleanupOrphanedImages as migrationCleanup,
  MIGRATION_CONFIG 
} from './migrateCategoryUniqueImages.js';
import { logger } from '../utils/logger.js';

class CategoryImageMaintenanceCLI {
  constructor() {
    this.imageIntegrity = new CategoryImageIntegrity();
  }

  /**
   * Display help information
   */
  showHelp() {
    console.log('Category Image Maintenance CLI');
    console.log('');
    console.log('Usage: node categoryImageMaintenance.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  status              Show current system status');
    console.log('  migrate             Run full migration to unique naming');
    console.log('  analyze             Analyze current state without changes');
    console.log('  verify              Verify integrity between database and filesystem');
    console.log('  cleanup             Clean up orphaned image files');
    console.log('  stats               Show storage statistics');
    console.log('  report              Generate comprehensive integrity report');
    console.log('  help                Show this help message');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run           Preview changes without applying them');
    console.log('  --no-backup         Skip creating backup files');
    console.log('  --no-cleanup        Skip orphaned file cleanup during migration');
    console.log('  --no-validate       Skip file existence validation');
    console.log('  --json              Output results in JSON format');
    console.log('');
    console.log('Examples:');
    console.log('  node categoryImageMaintenance.js status');
    console.log('  node categoryImageMaintenance.js migrate --dry-run');
    console.log('  node categoryImageMaintenance.js cleanup --no-backup');
    console.log('  node categoryImageMaintenance.js report --json');
  }

  /**
   * Show current system status
   */
  async showStatus(options = {}) {
    try {
      console.log('🔍 Checking category image system status...\n');

      const report = await this.imageIntegrity.performIntegrityCheck();
      
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      // Display human-readable status
      console.log('📊 System Status Summary:');
      console.log(`  Overall Health: ${report.summary?.isHealthy ? '✅ HEALTHY' : '⚠️  ISSUES FOUND'}`);
      console.log(`  Total Issues: ${report.summary?.totalIssues || 0}`);
      console.log('');

      if (report.orphanedImages?.success) {
        console.log('🗑️  Orphaned Images:');
        console.log(`  Count: ${report.orphanedImages.orphanedFiles?.length || 0}`);
        if (report.orphanedImages.orphanedFiles?.length > 0) {
          console.log('  Files:', report.orphanedImages.orphanedFiles.slice(0, 5).join(', '));
          if (report.orphanedImages.orphanedFiles.length > 5) {
            console.log(`  ... and ${report.orphanedImages.orphanedFiles.length - 5} more`);
          }
        }
        console.log('');
      }

      if (report.missingFiles?.success) {
        console.log('📁 Missing Files:');
        console.log(`  Count: ${report.missingFiles.missingFiles?.length || 0}`);
        if (report.missingFiles.missingFiles?.length > 0) {
          report.missingFiles.missingFiles.slice(0, 3).forEach(file => {
            console.log(`  - ${file.categoryName}: ${file.filename}`);
          });
          if (report.missingFiles.missingFiles.length > 3) {
            console.log(`  ... and ${report.missingFiles.missingFiles.length - 3} more`);
          }
        }
        console.log('');
      }

      if (report.invalidNaming?.success) {
        console.log('🏷️  Invalid Naming:');
        console.log(`  Count: ${report.invalidNaming.invalidNaming?.length || 0}`);
        if (report.invalidNaming.invalidNaming?.length > 0) {
          report.invalidNaming.invalidNaming.slice(0, 3).forEach(item => {
            console.log(`  - ${item.categoryName}: ${item.issue}`);
          });
          if (report.invalidNaming.invalidNaming.length > 3) {
            console.log(`  ... and ${report.invalidNaming.invalidNaming.length - 3} more`);
          }
        }
        console.log('');
      }

      // Show recommendations
      if (report.summary?.totalIssues > 0) {
        console.log('💡 Recommendations:');
        if (report.orphanedImages?.orphanedFiles?.length > 0) {
          console.log('  - Run cleanup to remove orphaned files');
        }
        if (report.missingFiles?.missingFiles?.length > 0) {
          console.log('  - Check and restore missing image files');
        }
        if (report.invalidNaming?.invalidNaming?.length > 0) {
          console.log('  - Run migration to update to unique naming convention');
        }
        console.log('');
      }

    } catch (error) {
      console.error('❌ Error checking status:', error.message);
      process.exit(1);
    }
  }

  /**
   * Run migration with options
   */
  async runMigration(options = {}) {
    try {
      // Set migration config based on options
      if (options.dryRun) MIGRATION_CONFIG.dryRun = true;
      if (options.noBackup) MIGRATION_CONFIG.createBackups = false;
      if (options.noCleanup) MIGRATION_CONFIG.cleanupOrphans = false;
      if (options.noValidate) MIGRATION_CONFIG.validateIntegrity = false;

      console.log('🚀 Starting category image migration...\n');
      
      const result = await runMigration();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log('\n🎉 Migration completed successfully!');
      console.log(`📁 Backup: ${result.backupPath || 'None created'}`);
      console.log(`🔄 Categories migrated: ${result.migrationResults?.migrated || 0}/${result.migrationResults?.total || 0}`);
      console.log(`🧹 Orphaned files cleaned: ${result.cleanupResults?.cleaned || 0}/${result.cleanupResults?.total || 0}`);
      console.log(`✅ Integrity validation: ${result.integrityResults?.isValid ? 'PASSED' : 'FAILED'}`);

      if (MIGRATION_CONFIG.dryRun) {
        console.log('\n🔍 This was a dry run - no changes were applied');
      }

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Analyze current state
   */
  async analyzeState(options = {}) {
    try {
      console.log('🔍 Analyzing current category image state...\n');
      
      const analysis = await analyzeCurrentState();
      
      if (options.json) {
        console.log(JSON.stringify(analysis, null, 2));
        return;
      }

      console.log('📊 Analysis Results:');
      console.log('\n📂 Categories:');
      console.log(`  Total: ${analysis.categories.total}`);
      console.log(`  With images: ${analysis.categories.withImages}`);
      console.log(`  Need migration: ${analysis.categories.needsMigration}`);
      console.log(`  Already unique: ${analysis.categories.alreadyUnique}`);
      console.log(`  Missing files: ${analysis.categories.missingFiles}`);
      console.log(`  Invalid paths: ${analysis.categories.invalidPaths}`);

      console.log('\n📁 Files:');
      console.log(`  Total: ${analysis.files.total}`);
      console.log(`  Unique format: ${analysis.files.uniqueFormat}`);
      console.log(`  Legacy format: ${analysis.files.legacyFormat}`);
      console.log(`  Referenced: ${analysis.files.referenced}`);
      console.log(`  Orphaned: ${analysis.files.orphaned}`);

      if (analysis.issues.length > 0) {
        console.log(`\n⚠️  Issues found: ${analysis.issues.length}`);
        analysis.issues.slice(0, 5).forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.type}: ${issue.description || JSON.stringify(issue)}`);
        });
        if (analysis.issues.length > 5) {
          console.log(`  ... and ${analysis.issues.length - 5} more issues`);
        }
      }

    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Verify integrity
   */
  async verifyIntegrity(options = {}) {
    try {
      console.log('🔍 Verifying integrity between database and filesystem...\n');
      
      const result = await verifyIntegrity();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log('📊 Integrity Verification Results:');
      console.log(`  Total categories: ${result.totalCategories || 0}`);
      console.log(`  Valid categories: ${result.validCount || 0}`);
      console.log(`  Issues found: ${result.issues?.length || 0}`);
      console.log(`  Overall status: ${result.isValid ? '✅ VALID' : '❌ ISSUES FOUND'}`);

      if (result.issues?.length > 0) {
        console.log('\n⚠️  Issues Details:');
        result.issues.slice(0, 10).forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.type}: ${issue.description}`);
          if (issue.category) console.log(`     Category: ${issue.category}`);
          if (issue.filename) console.log(`     File: ${issue.filename}`);
        });
        if (result.issues.length > 10) {
          console.log(`  ... and ${result.issues.length - 10} more issues`);
        }
      }

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Clean up orphaned images
   */
  async cleanupOrphans(options = {}) {
    try {
      console.log('🧹 Cleaning up orphaned image files...\n');
      
      const createBackup = !options.noBackup;
      const result = await this.imageIntegrity.cleanupOrphanedImages(createBackup);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.success) {
        console.log('📊 Cleanup Results:');
        console.log(`  Files cleaned: ${result.cleaned || 0}`);
        console.log(`  Errors: ${result.errors || 0}`);
        if (result.backupPath) {
          console.log(`  Backup directory: ${result.backupPath}`);
        }

        if (result.cleanedFiles?.length > 0) {
          console.log('\n🗑️  Cleaned files:');
          result.cleanedFiles.forEach(filename => {
            console.log(`  - ${filename}`);
          });
        }

        if (result.cleaned === 0) {
          console.log('\n✅ No orphaned images found - system is clean!');
        }
      } else {
        console.error('❌ Cleanup failed:', result.error);
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Show storage statistics
   */
  async showStats(options = {}) {
    try {
      console.log('📊 Gathering storage statistics...\n');
      
      const result = await this.imageIntegrity.getStorageStatistics();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.success) {
        const stats = result.statistics;
        
        console.log('📊 Storage Statistics:');
        console.log(`  Total files: ${stats.totalFiles}`);
        console.log(`  Total size: ${this.formatBytes(stats.totalSize)}`);
        console.log(`  Average size: ${this.formatBytes(stats.averageSize)}`);
        console.log(`  Total categories: ${stats.totalCategories}`);
        console.log(`  Categories with images: ${stats.categoriesWithImages}`);
        console.log(`  Storage efficiency: ${stats.storageEfficiency}%`);

        if (stats.largestFile) {
          console.log(`\n📈 Largest file: ${stats.largestFile.filename} (${this.formatBytes(stats.largestFile.size)})`);
        }
        if (stats.smallestFile) {
          console.log(`📉 Smallest file: ${stats.smallestFile.filename} (${this.formatBytes(stats.smallestFile.size)})`);
        }

        if (result.fileSizes?.length > 0) {
          console.log('\n📋 Top files by size:');
          result.fileSizes.slice(0, 5).forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.filename} - ${this.formatBytes(file.size)}`);
          });
        }
      } else {
        console.error('❌ Failed to get statistics:', result.error);
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Statistics failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(options = {}) {
    try {
      console.log('📋 Generating comprehensive integrity report...\n');
      
      const report = await this.imageIntegrity.generateIntegrityReport();
      
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log('📋 Comprehensive Integrity Report');
      console.log(`Generated: ${report.timestamp}`);
      console.log(`Status: ${report.status}`);
      console.log('');

      console.log('📊 Metrics:');
      Object.entries(report.metrics || {}).forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        console.log(`  ${label}: ${value}`);
      });

      if (report.recommendations?.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
          console.log(`     Action: ${rec.action}`);
        });
      }

      if (report.status === 'healthy') {
        console.log('\n✅ System is healthy - no issues found!');
      } else {
        console.log('\n⚠️  Issues found - see recommendations above');
      }

    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI execution
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  // Parse options
  const options = {
    dryRun: args.includes('--dry-run'),
    noBackup: args.includes('--no-backup'),
    noCleanup: args.includes('--no-cleanup'),
    noValidate: args.includes('--no-validate'),
    json: args.includes('--json')
  };

  const cli = new CategoryImageMaintenanceCLI();

  try {
    // Connect to database for commands that need it
    if (['status', 'migrate', 'analyze', 'verify', 'cleanup', 'stats', 'report'].includes(command)) {
      await connectDB();
    }

    switch (command) {
      case 'status':
        await cli.showStatus(options);
        break;
      case 'migrate':
        await cli.runMigration(options);
        break;
      case 'analyze':
        await cli.analyzeState(options);
        break;
      case 'verify':
        await cli.verifyIntegrity(options);
        break;
      case 'cleanup':
        await cli.cleanupOrphans(options);
        break;
      case 'stats':
        await cli.showStats(options);
        break;
      case 'report':
        await cli.generateReport(options);
        break;
      case 'help':
      case '--help':
      case '-h':
        cli.showHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use "help" to see available commands');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default CategoryImageMaintenanceCLI;