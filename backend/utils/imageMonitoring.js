import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fallback logger for testing and circular import issues
const logger = {
  system: {
    info: (message) => console.log(`⚙️ [SYSTEM] ${message}`),
    warn: (message) => console.warn(`🟡 [SYSTEM] ${message}`),
    error: (message, error = null) => console.error(`🔴 [SYSTEM] ${message}`, error || '')
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Image monitoring and alerting system
 */
class ImageMonitoring {
  constructor() {
    this.metrics = {
      uploads: {
        total: 0,
        successful: 0,
        failed: 0,
        totalSize: 0,
        averageDuration: 0,
        slowUploads: 0
      },
      serving: {
        total: 0,
        successful: 0,
        notFound: 0,
        errors: 0,
        totalSize: 0,
        averageDuration: 0,
        slowServing: 0
      },
      validation: {
        total: 0,
        passed: 0,
        failed: 0,
        typeFailures: 0,
        sizeFailures: 0,
        dimensionFailures: 0
      },
      maintenance: {
        cleanupOperations: 0,
        filesDeleted: 0,
        spaceFreed: 0,
        orphansDetected: 0
      }
    };
    
    this.alerts = {
      thresholds: {
        uploadFailureRate: 0.1, // 10% failure rate
        servingErrorRate: 0.05, // 5% error rate
        slowUploadThreshold: 5000, // 5 seconds
        slowServingThreshold: 1000, // 1 second
        diskUsageThreshold: 0.9, // 90% disk usage
        orphanFileThreshold: 10 // 10 orphan files
      },
      history: []
    };
    
    this.startTime = Date.now();
    
    // Start periodic monitoring
    this.startPeriodicMonitoring();
  }

  /**
   * Record upload metrics
   * @param {boolean} success - Whether upload was successful
   * @param {number} duration - Upload duration in ms
   * @param {number} size - File size in bytes
   */
  recordUpload(success, duration, size = 0) {
    this.metrics.uploads.total++;
    
    if (success) {
      this.metrics.uploads.successful++;
      this.metrics.uploads.totalSize += size;
    } else {
      this.metrics.uploads.failed++;
    }
    
    // Update average duration
    this.metrics.uploads.averageDuration = 
      (this.metrics.uploads.averageDuration * (this.metrics.uploads.total - 1) + duration) / 
      this.metrics.uploads.total;
    
    // Check for slow uploads
    if (duration > this.alerts.thresholds.slowUploadThreshold) {
      this.metrics.uploads.slowUploads++;
      this.checkUploadPerformanceAlert(duration);
    }
    
    // Check failure rate alert
    this.checkUploadFailureRateAlert();
  }

  /**
   * Record serving metrics
   * @param {string} status - 'success', 'notFound', or 'error'
   * @param {number} duration - Serving duration in ms
   * @param {number} size - File size in bytes
   */
  recordServing(status, duration, size = 0) {
    this.metrics.serving.total++;
    
    switch (status) {
      case 'success':
        this.metrics.serving.successful++;
        this.metrics.serving.totalSize += size;
        break;
      case 'notFound':
        this.metrics.serving.notFound++;
        break;
      case 'error':
        this.metrics.serving.errors++;
        break;
    }
    
    // Update average duration
    this.metrics.serving.averageDuration = 
      (this.metrics.serving.averageDuration * (this.metrics.serving.total - 1) + duration) / 
      this.metrics.serving.total;
    
    // Check for slow serving
    if (duration > this.alerts.thresholds.slowServingThreshold) {
      this.metrics.serving.slowServing++;
      this.checkServingPerformanceAlert(duration);
    }
    
    // Check error rate alert
    this.checkServingErrorRateAlert();
  }

  /**
   * Record validation metrics
   * @param {boolean} passed - Whether validation passed
   * @param {string} failureType - Type of failure if any
   */
  recordValidation(passed, failureType = null) {
    this.metrics.validation.total++;
    
    if (passed) {
      this.metrics.validation.passed++;
    } else {
      this.metrics.validation.failed++;
      
      switch (failureType) {
        case 'type':
          this.metrics.validation.typeFailures++;
          break;
        case 'size':
          this.metrics.validation.sizeFailures++;
          break;
        case 'dimensions':
          this.metrics.validation.dimensionFailures++;
          break;
      }
    }
  }

  /**
   * Record maintenance metrics
   * @param {string} operation - Type of maintenance operation
   * @param {number} filesAffected - Number of files affected
   * @param {number} spaceFreed - Space freed in bytes
   */
  recordMaintenance(operation, filesAffected = 0, spaceFreed = 0) {
    this.metrics.maintenance.cleanupOperations++;
    
    switch (operation) {
      case 'cleanup':
        this.metrics.maintenance.filesDeleted += filesAffected;
        this.metrics.maintenance.spaceFreed += spaceFreed;
        break;
      case 'orphan-detection':
        this.metrics.maintenance.orphansDetected += filesAffected;
        this.checkOrphanFilesAlert(filesAffected);
        break;
    }
  }

  /**
   * Check upload failure rate and trigger alert if needed
   */
  checkUploadFailureRateAlert() {
    if (this.metrics.uploads.total < 10) return; // Need minimum samples
    
    const failureRate = this.metrics.uploads.failed / this.metrics.uploads.total;
    
    if (failureRate > this.alerts.thresholds.uploadFailureRate) {
      this.triggerAlert('HIGH_UPLOAD_FAILURE_RATE', {
        failureRate: (failureRate * 100).toFixed(2) + '%',
        threshold: (this.alerts.thresholds.uploadFailureRate * 100).toFixed(2) + '%',
        totalUploads: this.metrics.uploads.total,
        failedUploads: this.metrics.uploads.failed
      });
    }
  }

  /**
   * Check serving error rate and trigger alert if needed
   */
  checkServingErrorRateAlert() {
    if (this.metrics.serving.total < 10) return; // Need minimum samples
    
    const errorRate = (this.metrics.serving.errors + this.metrics.serving.notFound) / this.metrics.serving.total;
    
    if (errorRate > this.alerts.thresholds.servingErrorRate) {
      this.triggerAlert('HIGH_SERVING_ERROR_RATE', {
        errorRate: (errorRate * 100).toFixed(2) + '%',
        threshold: (this.alerts.thresholds.servingErrorRate * 100).toFixed(2) + '%',
        totalRequests: this.metrics.serving.total,
        errors: this.metrics.serving.errors,
        notFound: this.metrics.serving.notFound
      });
    }
  }

  /**
   * Check upload performance and trigger alert if needed
   */
  checkUploadPerformanceAlert(duration) {
    this.triggerAlert('SLOW_UPLOAD_DETECTED', {
      duration: duration + 'ms',
      threshold: this.alerts.thresholds.slowUploadThreshold + 'ms',
      slowUploadsCount: this.metrics.uploads.slowUploads
    });
  }

  /**
   * Check serving performance and trigger alert if needed
   */
  checkServingPerformanceAlert(duration) {
    this.triggerAlert('SLOW_SERVING_DETECTED', {
      duration: duration + 'ms',
      threshold: this.alerts.thresholds.slowServingThreshold + 'ms',
      slowServingCount: this.metrics.serving.slowServing
    });
  }

  /**
   * Check orphan files and trigger alert if needed
   */
  checkOrphanFilesAlert(orphanCount) {
    if (orphanCount > this.alerts.thresholds.orphanFileThreshold) {
      this.triggerAlert('HIGH_ORPHAN_FILES', {
        orphanCount,
        threshold: this.alerts.thresholds.orphanFileThreshold,
        totalOrphans: this.metrics.maintenance.orphansDetected
      });
    }
  }

  /**
   * Check disk usage and trigger alert if needed
   */
  async checkDiskUsageAlert() {
    try {
      const uploadsPath = path.join(__dirname, '..', 'uploads');
      const stats = await this.getDiskUsage(uploadsPath);
      
      if (stats.usagePercentage > this.alerts.thresholds.diskUsageThreshold) {
        this.triggerAlert('HIGH_DISK_USAGE', {
          usagePercentage: (stats.usagePercentage * 100).toFixed(2) + '%',
          threshold: (this.alerts.thresholds.diskUsageThreshold * 100).toFixed(2) + '%',
          usedSpace: this.formatBytes(stats.used),
          totalSpace: this.formatBytes(stats.total),
          availableSpace: this.formatBytes(stats.available)
        });
      }
    } catch (error) {
      logger.system.error('Error checking disk usage:', error);
    }
  }

  /**
   * Trigger an alert
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   */
  triggerAlert(type, data) {
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      data,
      severity: this.getAlertSeverity(type)
    };
    
    this.alerts.history.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.history.length > 100) {
      this.alerts.history = this.alerts.history.slice(-100);
    }
    
    // Log alert
    const message = `ALERT [${type}]: ${this.formatAlertMessage(type, data)}`;
    
    switch (alert.severity) {
      case 'critical':
        logger.system.error(message);
        break;
      case 'warning':
        logger.system.warn(message);
        break;
      default:
        logger.system.info(message);
    }
    
    // Log alert to system log
  }

  /**
   * Get alert severity based on type
   * @param {string} type - Alert type
   * @returns {string} - Severity level
   */
  getAlertSeverity(type) {
    const severityMap = {
      'HIGH_UPLOAD_FAILURE_RATE': 'critical',
      'HIGH_SERVING_ERROR_RATE': 'critical',
      'HIGH_DISK_USAGE': 'critical',
      'SLOW_UPLOAD_DETECTED': 'warning',
      'SLOW_SERVING_DETECTED': 'warning',
      'HIGH_ORPHAN_FILES': 'warning'
    };
    
    return severityMap[type] || 'info';
  }

  /**
   * Format alert message
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   * @returns {string} - Formatted message
   */
  formatAlertMessage(type, data) {
    switch (type) {
      case 'HIGH_UPLOAD_FAILURE_RATE':
        return `Upload failure rate ${data.failureRate} exceeds threshold ${data.threshold} (${data.failedUploads}/${data.totalUploads} failed)`;
      case 'HIGH_SERVING_ERROR_RATE':
        return `Serving error rate ${data.errorRate} exceeds threshold ${data.threshold} (${data.errors + data.notFound}/${data.totalRequests} failed)`;
      case 'SLOW_UPLOAD_DETECTED':
        return `Slow upload detected: ${data.duration} (threshold: ${data.threshold}). Total slow uploads: ${data.slowUploadsCount}`;
      case 'SLOW_SERVING_DETECTED':
        return `Slow serving detected: ${data.duration} (threshold: ${data.threshold}). Total slow serving: ${data.slowServingCount}`;
      case 'HIGH_ORPHAN_FILES':
        return `High number of orphan files detected: ${data.orphanCount} (threshold: ${data.threshold}). Total orphans: ${data.totalOrphans}`;
      case 'HIGH_DISK_USAGE':
        return `Disk usage ${data.usagePercentage} exceeds threshold ${data.threshold}. Used: ${data.usedSpace}/${data.totalSpace}, Available: ${data.availableSpace}`;
      default:
        return JSON.stringify(data);
    }
  }

  /**
   * Get disk usage statistics
   * @param {string} dirPath - Directory path to check
   * @returns {Promise<Object>} - Disk usage stats
   */
  async getDiskUsage(dirPath) {
    return new Promise(async (resolve, reject) => {
      try {
        // Use dynamic import for child_process in ES modules
        const { exec } = await import('child_process');
        
        exec(`df -k "${dirPath}"`, (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          
          const lines = stdout.trim().split('\n');
          const data = lines[1].split(/\s+/);
          
          const total = parseInt(data[1]) * 1024; // Convert from KB to bytes
          const used = parseInt(data[2]) * 1024;
          const available = parseInt(data[3]) * 1024;
          const usagePercentage = used / total;
          
          resolve({
            total,
            used,
            available,
            usagePercentage
          });
        });
      } catch (importError) {
        reject(importError);
      }
    });
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes to format
   * @returns {string} - Formatted string
   */
  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get current metrics summary
   * @returns {Object} - Metrics summary
   */
  getMetricsSummary() {
    const uptime = Date.now() - this.startTime;
    
    return {
      uptime: this.formatDuration(uptime),
      uploads: {
        ...this.metrics.uploads,
        successRate: this.metrics.uploads.total > 0 ? 
          ((this.metrics.uploads.successful / this.metrics.uploads.total) * 100).toFixed(2) + '%' : '0%',
        averageSize: this.metrics.uploads.successful > 0 ? 
          this.formatBytes(this.metrics.uploads.totalSize / this.metrics.uploads.successful) : '0 Bytes'
      },
      serving: {
        ...this.metrics.serving,
        successRate: this.metrics.serving.total > 0 ? 
          ((this.metrics.serving.successful / this.metrics.serving.total) * 100).toFixed(2) + '%' : '0%',
        errorRate: this.metrics.serving.total > 0 ? 
          (((this.metrics.serving.errors + this.metrics.serving.notFound) / this.metrics.serving.total) * 100).toFixed(2) + '%' : '0%'
      },
      validation: {
        ...this.metrics.validation,
        passRate: this.metrics.validation.total > 0 ? 
          ((this.metrics.validation.passed / this.metrics.validation.total) * 100).toFixed(2) + '%' : '0%'
      },
      maintenance: this.metrics.maintenance,
      alerts: {
        total: this.alerts.history.length,
        recent: this.alerts.history.slice(-5) // Last 5 alerts
      }
    };
  }

  /**
   * Format duration to human readable format
   * @param {number} ms - Duration in milliseconds
   * @returns {string} - Formatted duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Start periodic monitoring tasks
   */
  startPeriodicMonitoring() {
    // Check disk usage every 5 minutes
    setInterval(() => {
      this.checkDiskUsageAlert();
    }, 5 * 60 * 1000);
    
    // Generate metrics report every hour
    setInterval(() => {
      this.generateMetricsReport();
    }, 60 * 60 * 1000);
  }

  /**
   * Generate and log metrics report
   */
  generateMetricsReport() {
    const summary = this.getMetricsSummary();
    
    logger.image.performance.metrics(
      'hourly_summary',
      summary.uploads.total + summary.serving.total,
      (summary.uploads.averageDuration + summary.serving.averageDuration) / 2,
      Math.max(summary.uploads.averageDuration, summary.serving.averageDuration),
      Math.min(summary.uploads.averageDuration, summary.serving.averageDuration)
    );
    
    logger.backend.info(`Image System Metrics Report:
      Uploads: ${summary.uploads.total} (${summary.uploads.successRate} success)
      Serving: ${summary.serving.total} (${summary.serving.successRate} success, ${summary.serving.errorRate} errors)
      Validation: ${summary.validation.total} (${summary.validation.passRate} pass)
      Maintenance: ${summary.maintenance.cleanupOperations} operations, ${summary.maintenance.filesDeleted} files deleted
      Alerts: ${summary.alerts.total} total
      Uptime: ${summary.uptime}`);
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics() {
    this.metrics = {
      uploads: { total: 0, successful: 0, failed: 0, totalSize: 0, averageDuration: 0, slowUploads: 0 },
      serving: { total: 0, successful: 0, notFound: 0, errors: 0, totalSize: 0, averageDuration: 0, slowServing: 0 },
      validation: { total: 0, passed: 0, failed: 0, typeFailures: 0, sizeFailures: 0, dimensionFailures: 0 },
      maintenance: { cleanupOperations: 0, filesDeleted: 0, spaceFreed: 0, orphansDetected: 0 }
    };
    
    this.startTime = Date.now();
    logger.system.info('Image monitoring metrics reset');
  }
}

// Create singleton instance
const imageMonitoring = new ImageMonitoring();

export default imageMonitoring;
export { ImageMonitoring };