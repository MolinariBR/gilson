#!/usr/bin/env node

/**
 * Image Inconsistency Management Script
 * 
 * Command-line utility for detecting and correcting image inconsistencies
 * in the category image system.
 * 
 * Usage:
 *   node imageInconsistencyManager.js [command] [options]
 * 
 * Commands:
 *   detect       - Detect all types of inconsistencies
 *   correct      - Automatically correct detected issues
 *   report       - Generate comprehensive health report
 *   duplicates   - Detect and optionally correct duplicate images
 *   orphaned     - Detect and optionally correct orphaned images
 *   references   - Detect and optionally correct incorrect references
 * 
 * Requirements: 4.3, 6.4
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import ImageInconsistencyDetector from '../utils/imageInconsistencyDetector.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ImageInconsistencyManager {
  constructor() {
    this.detector = new ImageInconsistencyDetector();
    this.outputDir = path.join(__dirname, '..', 'reports');
    this.ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Save report to file
   * @param {Object} report - Report data
   * @param {string} filename - Output filename
   */
  saveReport(report, filename) {
    try {
      const filePath = path.join(this.outputDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
      console.log(`📄 Report saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('❌ Error saving report:', error.message);
      return null;
    }
  }

  /**
   * Print summary statistics
   * @param {Object} data - Data to summarize
   */
  printSummary(data) {
    console.log('\n📊 SUMMARY');
    console.log('═'.repeat(50));
    
    if (data.summary) {
      Object.entries(data.summary).forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        console.log(`${label.padEnd(20)}: ${value}`);
      });
    }
  }

  /**
   * Print recommendations
   * @param {Array} recommendations - Array of recommendations
   */
  printRecommendations(recommendations) {
    if (!recommendations || recommendations.length === 0) {
      console.log('\n✅ No recommendations - system is healthy!');
      return;
    }

    console.log('\n💡 RECOMMENDATIONS');
    console.log('═'.repeat(50));
    
    recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`${index + 1}. ${priority} ${rec.title}`);
      console.log(`   ${rec.description}`);
      console.log(`   Action: ${rec.action}`);
      if (rec.estimatedSavings) {
        console.log(`   Savings: ${rec.estimatedSavings}`);
      }
      console.log('');
    });
  }

  /**
   * Detect all inconsistencies
   */
  async detectAll() {
    console.log('🔍 Detecting all image inconsistencies...\n');
    
    try {
      const [duplicates, orphaned, references] = await Promise.all([
        this.detector.detectDuplicateImages(),
        this.detector.detectOrphanedImages(),
        this.detector.detectIncorrectReferences()
      ]);

      console.log('📋 DETECTION RESULTS');
      console.log('═'.repeat(50));
      
      // Duplicates
      if (duplicates.success) {
        console.log(`🔄 Duplicate Images: ${duplicates.duplicates.length} groups found`);
        console.log(`   Total duplicate files: ${duplicates.statistics.totalDuplicateFiles}`);
        console.log(`   Wasted space: ${Math.round(duplicates.statistics.wastedSpace / 1024)} KB`);
      } else {
        console.log('❌ Duplicate detection failed:', duplicates.error);
      }

      // Orphaned
      if (orphaned.success) {
        console.log(`🗑️  Orphaned Images: ${orphaned.orphanedFiles.length} files found`);
      } else {
        console.log('❌ Orphaned detection failed:', orphaned.error);
      }

      // References
      if (references.success) {
        console.log(`🔗 Incorrect References: ${references.incorrectReferences.length} issues found`);
        
        // Break down by issue type
        const issueTypes = {};
        references.incorrectReferences.forEach(ref => {
          issueTypes[ref.issue] = (issueTypes[ref.issue] || 0) + 1;
        });
        
        Object.entries(issueTypes).forEach(([type, count]) => {
          console.log(`   ${type.replace(/_/g, ' ')}: ${count}`);
        });
      } else {
        console.log('❌ Reference detection failed:', references.error);
      }

      // Save detailed report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportData = {
        timestamp: new Date().toISOString(),
        duplicates,
        orphaned,
        references
      };
      
      this.saveReport(reportData, `inconsistency-detection-${timestamp}.json`);
      
      return { duplicates, orphaned, references };
    } catch (error) {
      console.error('❌ Error during detection:', error.message);
      return null;
    }
  }

  /**
   * Correct all inconsistencies automatically
   */
  async correctAll(options = {}) {
    console.log('🔧 Starting automatic correction...\n');
    
    try {
      const result = await this.detector.runComprehensiveCorrection(options);
      
      if (result.success) {
        console.log('✅ CORRECTION COMPLETED');
        console.log('═'.repeat(50));
        console.log(`Duration: ${Math.round(result.duration / 1000)}s`);
        console.log(`Total corrections: ${result.summary.totalCorrected}`);
        console.log(`Total errors: ${result.summary.totalErrors}`);
        console.log(`Space freed: ${Math.round(result.summary.freedSpace / 1024)} KB`);
        
        // Detailed results
        if (result.corrections.duplicates) {
          console.log(`\n🔄 Duplicates: ${result.corrections.duplicates.corrected} files removed`);
        }
        
        if (result.corrections.orphaned) {
          console.log(`🗑️  Orphaned: ${result.corrections.orphaned.cleaned} files cleaned`);
        }
        
        if (result.corrections.references) {
          console.log(`🔗 References: ${result.corrections.references.corrected} issues corrected`);
        }
      } else {
        console.log('❌ Correction failed:', result.error);
      }

      // Save correction report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.saveReport(result, `correction-report-${timestamp}.json`);
      
      return result;
    } catch (error) {
      console.error('❌ Error during correction:', error.message);
      return null;
    }
  }

  /**
   * Generate comprehensive health report
   */
  async generateHealthReport() {
    console.log('📊 Generating health report...\n');
    
    try {
      const report = await this.detector.generateHealthReport();
      
      console.log('🏥 SYSTEM HEALTH REPORT');
      console.log('═'.repeat(50));
      console.log(`Health Score: ${report.healthScore}% (${report.status.toUpperCase()})`);
      console.log(`Generated: ${new Date(report.timestamp).toLocaleString()}`);
      console.log(`Duration: ${Math.round(report.duration / 1000)}s`);
      
      this.printSummary(report);
      this.printRecommendations(report.recommendations);
      
      // Save report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.saveReport(report, `health-report-${timestamp}.json`);
      
      return report;
    } catch (error) {
      console.error('❌ Error generating health report:', error.message);
      return null;
    }
  }

  /**
   * Handle duplicate images
   */
  async handleDuplicates(autoCorrect = false) {
    console.log('🔄 Detecting duplicate images...\n');
    
    try {
      const result = await this.detector.detectDuplicateImages();
      
      if (!result.success) {
        console.log('❌ Duplicate detection failed:', result.error);
        return;
      }

      console.log('📋 DUPLICATE DETECTION RESULTS');
      console.log('═'.repeat(50));
      console.log(`Duplicate groups: ${result.duplicates.length}`);
      console.log(`Total duplicate files: ${result.statistics.totalDuplicateFiles}`);
      console.log(`Wasted space: ${Math.round(result.statistics.wastedSpace / 1024)} KB`);
      
      if (result.duplicates.length > 0) {
        console.log('\n📁 DUPLICATE GROUPS:');
        result.duplicates.forEach((group, index) => {
          console.log(`\nGroup ${index + 1} (${Math.round(group.size / 1024)} KB each):`);
          group.files.forEach(file => console.log(`  - ${file}`));
        });
      }

      if (autoCorrect && result.duplicates.length > 0) {
        console.log('\n🔧 Auto-correcting duplicates...');
        const correctionResult = await this.detector.correctDuplicateImages(result.duplicates);
        
        if (correctionResult.success) {
          console.log(`✅ Removed ${correctionResult.corrected} duplicate files`);
          console.log(`💾 Freed ${Math.round(correctionResult.freedSpace / 1024)} KB`);
        } else {
          console.log('❌ Correction failed:', correctionResult.error);
        }
      }

      // Save report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.saveReport(result, `duplicates-report-${timestamp}.json`);
      
    } catch (error) {
      console.error('❌ Error handling duplicates:', error.message);
    }
  }

  /**
   * Handle orphaned images
   */
  async handleOrphaned(autoCorrect = false) {
    console.log('🗑️ Detecting orphaned images...\n');
    
    try {
      const result = await this.detector.detectOrphanedImages();
      
      if (!result.success) {
        console.log('❌ Orphaned detection failed:', result.error);
        return;
      }

      console.log('📋 ORPHANED DETECTION RESULTS');
      console.log('═'.repeat(50));
      console.log(`Orphaned files: ${result.orphanedFiles.length}`);
      console.log(`Total files: ${result.totalFiles}`);
      console.log(`Referenced files: ${result.referencedFiles}`);
      
      if (result.orphanedFiles.length > 0) {
        console.log('\n📁 ORPHANED FILES:');
        result.orphanedFiles.forEach(file => console.log(`  - ${file}`));
      }

      if (autoCorrect && result.orphanedFiles.length > 0) {
        console.log('\n🔧 Auto-correcting orphaned files...');
        const correctionResult = await this.detector.correctOrphanedImages(result.orphanedFiles);
        
        if (correctionResult.success) {
          console.log(`✅ Cleaned ${correctionResult.cleaned} orphaned files`);
          if (correctionResult.backupPath) {
            console.log(`💾 Backups created in: ${correctionResult.backupPath}`);
          }
        } else {
          console.log('❌ Correction failed:', correctionResult.error);
        }
      }

      // Save report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.saveReport(result, `orphaned-report-${timestamp}.json`);
      
    } catch (error) {
      console.error('❌ Error handling orphaned images:', error.message);
    }
  }

  /**
   * Handle incorrect references
   */
  async handleReferences(autoCorrect = false) {
    console.log('🔗 Detecting incorrect references...\n');
    
    try {
      const result = await this.detector.detectIncorrectReferences();
      
      if (!result.success) {
        console.log('❌ Reference detection failed:', result.error);
        return;
      }

      console.log('📋 REFERENCE DETECTION RESULTS');
      console.log('═'.repeat(50));
      console.log(`Incorrect references: ${result.incorrectReferences.length}`);
      console.log(`Total categories: ${result.totalCategories}`);
      
      // Group by issue type
      const issueGroups = {};
      result.incorrectReferences.forEach(ref => {
        if (!issueGroups[ref.issue]) {
          issueGroups[ref.issue] = [];
        }
        issueGroups[ref.issue].push(ref);
      });

      Object.entries(issueGroups).forEach(([issueType, refs]) => {
        console.log(`\n${issueType.replace(/_/g, ' ').toUpperCase()} (${refs.length}):`);
        refs.forEach(ref => {
          console.log(`  - ${ref.categoryName} (${ref.categoryId})`);
          if (ref.filename) console.log(`    File: ${ref.filename}`);
          if (ref.description) console.log(`    Issue: ${ref.description}`);
        });
      });

      if (autoCorrect && result.incorrectReferences.length > 0) {
        console.log('\n🔧 Auto-correcting references...');
        const correctionResult = await this.detector.correctIncorrectReferences(result.incorrectReferences);
        
        if (correctionResult.success) {
          console.log(`✅ Corrected ${correctionResult.corrected} references`);
          console.log(`⏭️  Skipped ${correctionResult.skipped} references (manual intervention needed)`);
          console.log(`❌ Errors: ${correctionResult.errors}`);
        } else {
          console.log('❌ Correction failed:', correctionResult.error);
        }
      }

      // Save report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.saveReport(result, `references-report-${timestamp}.json`);
      
    } catch (error) {
      console.error('❌ Error handling references:', error.message);
    }
  }

  /**
   * Print usage information
   */
  printUsage() {
    console.log(`
🖼️  Image Inconsistency Manager

USAGE:
  node imageInconsistencyManager.js <command> [options]

COMMANDS:
  detect                    Detect all types of inconsistencies
  correct [--no-backup]     Automatically correct all detected issues
  report                    Generate comprehensive health report
  duplicates [--fix]        Handle duplicate images
  orphaned [--fix]          Handle orphaned images  
  references [--fix]        Handle incorrect references
  help                      Show this help message

OPTIONS:
  --fix                     Automatically fix detected issues
  --no-backup              Skip creating backups during correction
  --output <dir>           Specify output directory for reports

EXAMPLES:
  node imageInconsistencyManager.js detect
  node imageInconsistencyManager.js correct --no-backup
  node imageInconsistencyManager.js duplicates --fix
  node imageInconsistencyManager.js report
`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {
    fix: args.includes('--fix'),
    noBackup: args.includes('--no-backup'),
    output: args.includes('--output') ? args[args.indexOf('--output') + 1] : null
  };

  const manager = new ImageInconsistencyManager();

  // Override output directory if specified
  if (options.output) {
    manager.outputDir = path.resolve(options.output);
    manager.ensureOutputDir();
  }

  console.log('🖼️  Image Inconsistency Manager\n');

  try {
    switch (command) {
      case 'detect':
        await manager.detectAll();
        break;
        
      case 'correct':
        await manager.correctAll({
          createBackups: !options.noBackup
        });
        break;
        
      case 'report':
        await manager.generateHealthReport();
        break;
        
      case 'duplicates':
        await manager.handleDuplicates(options.fix);
        break;
        
      case 'orphaned':
        await manager.handleOrphaned(options.fix);
        break;
        
      case 'references':
        await manager.handleReferences(options.fix);
        break;
        
      case 'help':
      case '--help':
      case '-h':
        manager.printUsage();
        break;
        
      default:
        console.log('❌ Unknown command:', command);
        manager.printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    logger.backend.error('Fatal error in imageInconsistencyManager:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export default ImageInconsistencyManager;