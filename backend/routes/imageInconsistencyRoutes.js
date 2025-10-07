/**
 * Image Inconsistency API Routes
 * 
 * API endpoints for image inconsistency detection and correction functionality.
 * Provides admin access to system health monitoring and maintenance tools.
 * 
 * Requirements: 4.3, 6.4
 */

import express from 'express';
import ImageInconsistencyService from '../services/imageInconsistencyService.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const inconsistencyService = new ImageInconsistencyService();

/**
 * @route GET /api/admin/image-health/status
 * @desc Get system health status
 * @access Admin
 */
router.get('/status', adminAuth, async (req, res) => {
  try {
    const result = await inconsistencyService.getSystemHealth();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    logger.backend.error('Error in health status endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/image-health/report
 * @desc Get detailed health report
 * @access Admin
 */
router.get('/report', adminAuth, async (req, res) => {
  try {
    const result = await inconsistencyService.getDetailedHealthReport();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    logger.backend.error('Error in health report endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/image-health/detect/duplicates
 * @desc Detect duplicate images
 * @access Admin
 */
router.get('/detect/duplicates', adminAuth, async (req, res) => {
  try {
    const result = await inconsistencyService.detectDuplicates();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    logger.backend.error('Error in detect duplicates endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/image-health/detect/orphaned
 * @desc Detect orphaned images
 * @access Admin
 */
router.get('/detect/orphaned', adminAuth, async (req, res) => {
  try {
    const result = await inconsistencyService.detectOrphaned();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    logger.backend.error('Error in detect orphaned endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/image-health/detect/references
 * @desc Detect incorrect references
 * @access Admin
 */
router.get('/detect/references', adminAuth, async (req, res) => {
  try {
    const result = await inconsistencyService.detectIncorrectReferences();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    logger.backend.error('Error in detect references endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/image-health/correct/duplicates
 * @desc Correct duplicate images
 * @access Admin
 */
router.post('/correct/duplicates', adminAuth, async (req, res) => {
  try {
    const { createBackup = true } = req.body;
    
    const result = await inconsistencyService.correctDuplicates(createBackup);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    logger.backend.error('Error in correct duplicates endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/image-health/correct/orphaned
 * @desc Correct orphaned images
 * @access Admin
 */
router.post('/correct/orphaned', adminAuth, async (req, res) => {
  try {
    const { createBackup = true } = req.body;
    
    const result = await inconsistencyService.correctOrphaned(createBackup);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    logger.backend.error('Error in correct orphaned endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/image-health/correct/references
 * @desc Correct incorrect references
 * @access Admin
 */
router.post('/correct/references', adminAuth, async (req, res) => {
  try {
    const result = await inconsistencyService.correctIncorrectReferences();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    logger.backend.error('Error in correct references endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/image-health/correct/all
 * @desc Run comprehensive automatic correction
 * @access Admin
 */
router.post('/correct/all', adminAuth, async (req, res) => {
  try {
    const {
      correctDuplicates = true,
      correctOrphaned = true,
      correctReferences = true,
      createBackups = true
    } = req.body;
    
    const options = {
      correctDuplicates,
      correctOrphaned,
      correctReferences,
      createBackups
    };
    
    const result = await inconsistencyService.runComprehensiveCorrection(options);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    logger.backend.error('Error in comprehensive correction endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/image-health/storage
 * @desc Get storage statistics
 * @access Admin
 */
router.get('/storage', adminAuth, async (req, res) => {
  try {
    const result = await inconsistencyService.getStorageStatistics();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    logger.backend.error('Error in storage statistics endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/image-health/integrity
 * @desc Validate system integrity
 * @access Admin
 */
router.get('/integrity', adminAuth, async (req, res) => {
  try {
    const result = await inconsistencyService.validateSystemIntegrity();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    logger.backend.error('Error in integrity validation endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

export default router;