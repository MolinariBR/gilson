#!/usr/bin/env node

/**
 * Configuration Validation Script
 * 
 * This script validates that all required environment variables are properly configured
 * for production deployment of the TOMATO food delivery application.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const validateConfig = () => {
  console.log('🔍 Validating TOMATO Application Configuration...\n');

  let hasErrors = false;
  const warnings = [];

  // Required environment variables
  const requiredVars = {
    'JWT_SECRET': {
      validator: (value) => value && value.length >= 32,
      error: 'JWT_SECRET must be at least 32 characters long'
    },
    'MONGO_URL': {
      validator: (value) => value && (value.startsWith('mongodb://') || value.startsWith('mongodb+srv://')),
      error: 'MONGO_URL must be a valid MongoDB connection string'
    },

    'FRONTEND_URL': {
      validator: (value) => value && (value.startsWith('http://') || value.startsWith('https://')),
      error: 'FRONTEND_URL must be a valid HTTP/HTTPS URL'
    },
    'BACKEND_URL': {
      validator: (value) => value && (value.startsWith('http://') || value.startsWith('https://')),
      error: 'BACKEND_URL must be a valid HTTP/HTTPS URL'
    }
  };

  // Check required variables
  for (const [varName, config] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    
    if (!value) {
      console.log(`❌ ${varName}: Missing`);
      hasErrors = true;
    } else if (!config.validator(value)) {
      console.log(`❌ ${varName}: ${config.error}`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName}: Valid`);
    }
  }

  // Check optional variables
  const optionalVars = ['ADMIN_URL', 'PORT', 'NODE_ENV', 'MERCADOPAGO_ACCESS_TOKEN'];
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value}`);
    } else {
      console.log(`⚠️  ${varName}: Not set (using default)`);
    }
  });

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    console.log('\n🏭 Production Environment Checks:');
    
    // Check for HTTPS in production
    if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('https://')) {
      warnings.push('FRONTEND_URL should use HTTPS in production');
    }
    
    if (process.env.BACKEND_URL && !process.env.BACKEND_URL.startsWith('https://')) {
      warnings.push('BACKEND_URL should use HTTPS in production');
    }
    
    // Check for production MercadoPago token
    if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
      if (process.env.MERCADOPAGO_ACCESS_TOKEN.startsWith('TEST-')) {
        warnings.push('Using TEST MercadoPago token in production environment');
      }
      if (process.env.MERCADOPAGO_ACCESS_TOKEN.includes('your_mercadopago_access_token_here')) {
        warnings.push('MercadoPago token contains placeholder value');
      }
    } else {
      warnings.push('MercadoPago not configured - payment functionality will be disabled');
    }
    
    // Check for localhost URLs
    if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('localhost')) {
      warnings.push('FRONTEND_URL contains localhost in production');
    }
    
    if (process.env.BACKEND_URL && process.env.BACKEND_URL.includes('localhost')) {
      warnings.push('BACKEND_URL contains localhost in production');
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ Configuration validation FAILED');
    console.log('Please fix the errors above before deploying.');
    process.exit(1);
  } else {
    console.log('✅ Configuration validation PASSED');
    if (warnings.length > 0) {
      console.log(`⚠️  ${warnings.length} warning(s) found - review before production deployment`);
    }
    console.log('Your application is ready to start!');
  }
};

// Run validation
validateConfig();