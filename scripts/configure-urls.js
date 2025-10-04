#!/usr/bin/env node

/**
 * URL Configuration Script for TOMATO Food Delivery App
 * 
 * This script helps configure URLs for different environments
 * Usage: node scripts/configure-urls.js [environment] [backend-url] [frontend-url] [admin-url]
 * 
 * Examples:
 * node scripts/configure-urls.js development
 * node scripts/configure-urls.js production https://api.yourdomain.com https://yourdomain.com https://admin.yourdomain.com
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const environment = args[0] || 'development';
const backendUrl = args[1];
const frontendUrl = args[2];
const adminUrl = args[3];

// Default URLs for development
const defaultUrls = {
  development: {
    backend: 'http://localhost:4000',
    frontend: 'http://localhost:5173',
    admin: 'http://localhost:5174'
  }
};

function updateEnvFile(filePath, updates) {
  if (!fs.existsSync(filePath)) {
    console.log(`Creating ${filePath}...`);
    fs.writeFileSync(filePath, '');
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  Object.entries(updates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const line = `${key}=${value}`;
    
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
  });

  fs.writeFileSync(filePath, content.trim() + '\n');
  console.log(`Updated ${filePath}`);
}

function configureUrls() {
  console.log(`Configuring URLs for ${environment} environment...`);

  const urls = {
    backend: backendUrl || defaultUrls.development.backend,
    frontend: frontendUrl || defaultUrls.development.frontend,
    admin: adminUrl || defaultUrls.development.admin
  };

  // Update backend .env
  updateEnvFile(path.join(__dirname, '../backend/.env'), {
    'FRONTEND_URL': urls.frontend,
    'BACKEND_URL': urls.backend,
    'ADMIN_URL': urls.admin,
    'NODE_ENV': environment
  });

  // Update frontend .env
  updateEnvFile(path.join(__dirname, '../frontend/.env'), {
    'VITE_BACKEND_URL': urls.backend,
    'VITE_NODE_ENV': environment
  });

  // Update admin .env
  updateEnvFile(path.join(__dirname, '../admin/.env'), {
    'VITE_BACKEND_URL': urls.backend,
    'VITE_NODE_ENV': environment
  });

  console.log('\n✅ URL configuration completed!');
  console.log(`Backend URL: ${urls.backend}`);
  console.log(`Frontend URL: ${urls.frontend}`);
  console.log(`Admin URL: ${urls.admin}`);
  console.log(`Environment: ${environment}`);

  if (environment === 'production') {
    console.log('\n⚠️  Production Configuration Checklist:');
    console.log('- Ensure all URLs use HTTPS');
    console.log('- Configure MercadoPago webhook URL in dashboard');
    console.log('- Update MongoDB connection string');
    console.log('- Set secure JWT secret');
    console.log('- Use production MercadoPago access token');
  }
}

// Validate arguments for production
if (environment === 'production' && (!backendUrl || !frontendUrl)) {
  console.error('❌ Error: Production environment requires backend and frontend URLs');
  console.log('Usage: node scripts/configure-urls.js production <backend-url> <frontend-url> [admin-url]');
  console.log('Example: node scripts/configure-urls.js production https://api.yourdomain.com https://yourdomain.com https://admin.yourdomain.com');
  process.exit(1);
}

configureUrls();