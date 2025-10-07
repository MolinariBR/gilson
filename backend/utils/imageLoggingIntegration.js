import { imageLogger } from './logger.js';
import imageMonitoring from './imageMonitoring.js';

/**
 * Integration between image logging and monitoring systems
 */
class ImageLoggingIntegration {
  constructor() {
    this.setupIntegration();
  }

  /**
   * Setup integration between logger and monitoring
   */
  setupIntegration() {
    // Connect monitoring functions to imageLogger
    imageLogger.recordUploadMetrics = (success, duration, size) => {
      imageMonitoring.recordUpload(success, duration, size);
    };

    imageLogger.recordServingMetrics = (status, duration, size) => {
      imageMonitoring.recordServing(status, duration, size);
    };

    imageLogger.recordValidationMetrics = (passed, failureType) => {
      imageMonitoring.recordValidation(passed, failureType);
    };

    imageLogger.recordMaintenanceMetrics = (operation, filesAffected, spaceFreed) => {
      imageMonitoring.recordMaintenance(operation, filesAffected, spaceFreed);
    };

    // Add monitoring methods to imageLogger for convenience
    imageLogger.getMetrics = () => imageMonitoring.getMetricsSummary();
    imageLogger.resetMetrics = () => imageMonitoring.resetMetrics();
    imageLogger.getAlerts = () => imageMonitoring.alerts.history;
  }

  /**
   * Get comprehensive image system status
   * @returns {Object} - Complete system status
   */
  getSystemStatus() {
    const metrics = imageMonitoring.getMetricsSummary();
    const recentAlerts = imageMonitoring.alerts.history.slice(-10);
    
    return {
      status: this.determineSystemHealth(metrics, recentAlerts),
      metrics,
      alerts: {
        recent: recentAlerts,
        critical: recentAlerts.filter(alert => alert.severity === 'critical'),
        warnings: recentAlerts.filter(alert => alert.severity === 'warning')
      },
      recommendations: this.generateRecommendations(metrics, recentAlerts)
    };
  }

  /**
   * Determine overall system health
   * @param {Object} metrics - System metrics
   * @param {Array} recentAlerts - Recent alerts
   * @returns {string} - Health status
   */
  determineSystemHealth(metrics, recentAlerts) {
    const criticalAlerts = recentAlerts.filter(alert => 
      alert.severity === 'critical' && 
      Date.now() - new Date(alert.timestamp).getTime() < 60 * 60 * 1000 // Last hour
    );

    if (criticalAlerts.length > 0) {
      return 'critical';
    }

    const warningAlerts = recentAlerts.filter(alert => 
      alert.severity === 'warning' && 
      Date.now() - new Date(alert.timestamp).getTime() < 60 * 60 * 1000 // Last hour
    );

    if (warningAlerts.length > 3) {
      return 'warning';
    }

    // Check metrics for health indicators
    const uploadSuccessRate = metrics.uploads.total > 0 ? 
      (metrics.uploads.successful / metrics.uploads.total) : 1;
    const servingSuccessRate = metrics.serving.total > 0 ? 
      (metrics.serving.successful / metrics.serving.total) : 1;

    if (uploadSuccessRate < 0.9 || servingSuccessRate < 0.95) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Generate system recommendations based on metrics and alerts
   * @param {Object} metrics - System metrics
   * @param {Array} recentAlerts - Recent alerts
   * @returns {Array} - Array of recommendations
   */
  generateRecommendations(metrics, recentAlerts) {
    const recommendations = [];

    // Upload performance recommendations
    if (metrics.uploads.slowUploads > metrics.uploads.total * 0.1) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Consider optimizing image processing pipeline - high number of slow uploads detected',
        action: 'Review image optimization settings and server resources'
      });
    }

    // Serving performance recommendations
    if (metrics.serving.slowServing > metrics.serving.total * 0.05) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Image serving performance is degraded',
        action: 'Check CDN configuration and server disk I/O performance'
      });
    }

    // Validation failure recommendations
    const validationFailureRate = metrics.validation.total > 0 ? 
      (metrics.validation.failed / metrics.validation.total) : 0;
    
    if (validationFailureRate > 0.2) {
      recommendations.push({
        type: 'validation',
        priority: 'high',
        message: 'High validation failure rate detected',
        action: 'Review image upload requirements and user education materials'
      });
    }

    // Maintenance recommendations
    if (metrics.maintenance.orphansDetected > 50) {
      recommendations.push({
        type: 'maintenance',
        priority: 'low',
        message: 'High number of orphan files detected',
        action: 'Schedule regular cleanup operations to maintain disk space'
      });
    }

    // Alert-based recommendations
    const diskUsageAlerts = recentAlerts.filter(alert => alert.type === 'HIGH_DISK_USAGE');
    if (diskUsageAlerts.length > 0) {
      recommendations.push({
        type: 'storage',
        priority: 'critical',
        message: 'Disk usage is critically high',
        action: 'Immediately clean up old files or expand storage capacity'
      });
    }

    return recommendations;
  }

  /**
   * Generate detailed performance report
   * @param {string} timeframe - Timeframe for report ('hour', 'day', 'week')
   * @returns {Object} - Performance report
   */
  generatePerformanceReport(timeframe = 'hour') {
    const metrics = imageMonitoring.getMetricsSummary();
    const alerts = imageMonitoring.alerts.history;
    
    // Filter alerts by timeframe
    const timeframeDuration = {
      'hour': 60 * 60 * 1000,
      'day': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000
    };
    
    const cutoffTime = Date.now() - (timeframeDuration[timeframe] || timeframeDuration.hour);
    const timeframeAlerts = alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime
    );

    return {
      timeframe,
      period: {
        start: new Date(cutoffTime).toISOString(),
        end: new Date().toISOString()
      },
      summary: {
        totalOperations: metrics.uploads.total + metrics.serving.total + metrics.validation.total,
        successRate: this.calculateOverallSuccessRate(metrics),
        averageResponseTime: this.calculateAverageResponseTime(metrics),
        alertsTriggered: timeframeAlerts.length
      },
      details: {
        uploads: {
          total: metrics.uploads.total,
          successful: metrics.uploads.successful,
          failed: metrics.uploads.failed,
          successRate: metrics.uploads.successRate,
          averageDuration: Math.round(metrics.uploads.averageDuration) + 'ms',
          slowUploads: metrics.uploads.slowUploads,
          totalDataProcessed: metrics.uploads.averageSize
        },
        serving: {
          total: metrics.serving.total,
          successful: metrics.serving.successful,
          errors: metrics.serving.errors + metrics.serving.notFound,
          successRate: metrics.serving.successRate,
          errorRate: metrics.serving.errorRate,
          averageDuration: Math.round(metrics.serving.averageDuration) + 'ms',
          slowServing: metrics.serving.slowServing
        },
        validation: {
          total: metrics.validation.total,
          passed: metrics.validation.passed,
          failed: metrics.validation.failed,
          passRate: metrics.validation.passRate,
          commonFailures: {
            type: metrics.validation.typeFailures,
            size: metrics.validation.sizeFailures,
            dimensions: metrics.validation.dimensionFailures
          }
        },
        maintenance: {
          operations: metrics.maintenance.cleanupOperations,
          filesDeleted: metrics.maintenance.filesDeleted,
          spaceFreed: imageMonitoring.formatBytes(metrics.maintenance.spaceFreed),
          orphansDetected: metrics.maintenance.orphansDetected
        }
      },
      alerts: {
        total: timeframeAlerts.length,
        bySeverity: {
          critical: timeframeAlerts.filter(a => a.severity === 'critical').length,
          warning: timeframeAlerts.filter(a => a.severity === 'warning').length,
          info: timeframeAlerts.filter(a => a.severity === 'info').length
        },
        byType: this.groupAlertsByType(timeframeAlerts)
      },
      recommendations: this.generateRecommendations(metrics, timeframeAlerts)
    };
  }

  /**
   * Calculate overall success rate across all operations
   * @param {Object} metrics - System metrics
   * @returns {string} - Success rate percentage
   */
  calculateOverallSuccessRate(metrics) {
    const totalOperations = metrics.uploads.total + metrics.serving.total;
    const successfulOperations = metrics.uploads.successful + metrics.serving.successful;
    
    if (totalOperations === 0) return '100%';
    
    return ((successfulOperations / totalOperations) * 100).toFixed(2) + '%';
  }

  /**
   * Calculate average response time across all operations
   * @param {Object} metrics - System metrics
   * @returns {string} - Average response time
   */
  calculateAverageResponseTime(metrics) {
    const totalOps = metrics.uploads.total + metrics.serving.total;
    if (totalOps === 0) return '0ms';
    
    const weightedAverage = (
      (metrics.uploads.averageDuration * metrics.uploads.total) +
      (metrics.serving.averageDuration * metrics.serving.total)
    ) / totalOps;
    
    return Math.round(weightedAverage) + 'ms';
  }

  /**
   * Group alerts by type for reporting
   * @param {Array} alerts - Array of alerts
   * @returns {Object} - Alerts grouped by type
   */
  groupAlertsByType(alerts) {
    const grouped = {};
    
    alerts.forEach(alert => {
      if (!grouped[alert.type]) {
        grouped[alert.type] = 0;
      }
      grouped[alert.type]++;
    });
    
    return grouped;
  }
}

// Create singleton instance
const imageLoggingIntegration = new ImageLoggingIntegration();

export default imageLoggingIntegration;
export { ImageLoggingIntegration };