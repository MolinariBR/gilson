#!/usr/bin/env node

/**
 * Configuration Validation Script for TOMATO Food Delivery App
 * 
 * This script validates that all URLs and environment variables are properly configured
 * Usage: node scripts/validate-config.js [environment]
 */

const fs = require('fs');
const path = require('path');

const environment = process.argv[2] || 'development';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });

  return env;
}

function validateUrl(url, name) {
  if (!url) {
    console.error(`❌ ${name} is not set`);
    return false;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error(`❌ ${name} must be a valid HTTP/HTTPS URL: ${url}`);
    return false;
  }

  if (environment === 'production' && url.startsWith('http://')) {
    console.warn(`⚠️  ${name} should use HTTPS in production: ${url}`);
  }

  console.log(`✅ ${name}: ${url}`);
  return true;
}

function validateBackendConfig() {
  console.log('\n🔍 Validating Backend Configuration...');
  const backendEnv = loadEnvFile(path.join(__dirname, '../backend/.env'));
  
  let valid = true;
  
  // Required URLs
  valid &= validateUrl(backendEnv.FRONTEND_URL, 'FRONTEND_URL');
  valid &= validateUrl(backendEnv.BACKEND_URL, 'BACKEND_URL');
  valid &= validateUrl(backendEnv.ADMIN_URL, 'ADMIN_URL');

  // Required variables
  const requiredVars = ['JWT_SECRET', 'MONGO_URL', 'MERCADOPAGO_ACCESS_TOKEN'];
  requiredVars.forEach(varName => {
    if (!backendEnv[varName]) {
      console.error(`❌ ${varName} is not set`);
      valid = false;
    } else if (backendEnv[varName].includes('your_') || backendEnv[varName].includes('_here')) {
      console.error(`❌ ${varName} contains placeholder value`);
      valid = false;
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });

  // Environment-specific validations
  if (environment === 'production') {
    if (backendEnv.JWT_SECRET && backendEnv.JWT_SECRET.length < 32) {
      console.error('❌ JWT_SECRET should be at least 32 characters for production');
      valid = false;
    }

    if (backendEnv.MERCADOPAGO_ACCESS_TOKEN && !backendEnv.MERCADOPAGO_ACCESS_TOKEN.startsWith('APP_USR-')) {
      console.warn('⚠️  Consider using production MercadoPago token (APP_USR-*) for production');
    }
  }

  return valid;
}

function validateFrontendConfig() {
  console.log('\n🔍 Validating Frontend Configuration...');
  const frontendEnv = loadEnvFile(path.join(__dirname, '../frontend/.env'));
  
  return validateUrl(frontendEnv.VITE_BACKEND_URL, 'VITE_BACKEND_URL (Frontend)');
}

function validateAdminConfig() {
  console.log('\n🔍 Validating Admin Configuration...');
  const adminEnv = loadEnvFile(path.join(__dirname, '../admin/.env'));
  
  return validateUrl(adminEnv.VITE_BACKEND_URL, 'VITE_BACKEND_URL (Admin)');
}

function validateCorsConfiguration() {
  console.log('\n🔍 Validating CORS Configuration...');
  
  const backendEnv = loadEnvFile(path.join(__dirname, '../backend/.env'));
  const frontendEnv = loadEnvFile(path.join(__dirname, '../frontend/.env'));
  const adminEnv = loadEnvFile(path.join(__dirname, '../admin/.env'));

  let valid = true;

  // Check if frontend URL matches backend's FRONTEND_URL
  if (frontendEnv.VITE_BACKEND_URL !== backendEnv.BACKEND_URL) {
    console.warn('⚠️  Frontend VITE_BACKEND_URL should match backend BACKEND_URL for consistency');
  }

  // Check if admin URL matches backend's BACKEND_URL
  if (adminEnv.VITE_BACKEND_URL !== backendEnv.BACKEND_URL) {
    console.warn('⚠️  Admin VITE_BACKEND_URL should match backend BACKEND_URL for consistency');
  }

  console.log('✅ CORS configuration appears valid');
  return valid;
}

function main() {
  console.log(`🚀 Validating configuration for ${environment} environment...\n`);

  const backendValid = validateBackendConfig();
  const frontendValid = validateFrontendConfig();
  const adminValid = validateAdminConfig();
  const corsValid = validateCorsConfiguration();

  const allValid = backendValid && frontendValid && adminValid && corsValid;

  console.log('\n' + '='.repeat(50));
  
  if (allValid) {
    console.log('✅ All configurations are valid!');
    
    if (environment === 'production') {
      console.log('\n📋 Production Deployment Checklist:');
      console.log('- [ ] All URLs use HTTPS');
      console.log('- [ ] MercadoPago webhook configured in dashboard');
      console.log('- [ ] MongoDB connection tested');
      console.log('- [ ] JWT secret is secure and unique');
      console.log('- [ ] Production MercadoPago token is used');
      console.log('- [ ] Environment variables are not in version control');
    }
  } else {
    console.log('❌ Configuration validation failed!');
    console.log('Please fix the issues above before deploying.');
    process.exit(1);
  }
}

main();