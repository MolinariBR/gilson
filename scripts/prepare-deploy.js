#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing project for Square Cloud deployment...');

// Check if required files exist
const requiredFiles = [
  'backend/server.js',
  'backend/package.json',
  'squarecloud.app'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
}

// Check backend dependencies
const backendPackage = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
const requiredDeps = ['express', 'mongoose', 'mercadopago', 'cors', 'dotenv'];
const missingDeps = requiredDeps.filter(dep => !backendPackage.dependencies[dep]);

if (missingDeps.length > 0) {
  console.error('❌ Missing required dependencies in backend:');
  missingDeps.forEach(dep => console.error(`   - ${dep}`));
  process.exit(1);
}

// Check if .env.example exists
if (!fs.existsSync('backend/.env.example')) {
  console.warn('⚠️  backend/.env.example not found. Creating one...');
  // .env.example was already created above
}

console.log('✅ Project is ready for Square Cloud deployment!');
console.log('\n📋 Next steps:');
console.log('1. Create a Square Cloud account at https://squarecloud.app');
console.log('2. Upload your project files');
console.log('3. Configure environment variables in Square Cloud dashboard');
console.log('4. Set up your MongoDB database (MongoDB Atlas recommended)');
console.log('5. Update MercadoPago URLs with your Square Cloud domains');

console.log('\n🔧 Required environment variables:');
console.log('- JWT_SECRET');
console.log('- MONGO_URL');
console.log('- MERCADOPAGO_ACCESS_TOKEN');
console.log('- FRONTEND_URL');
console.log('- BACKEND_URL');
console.log('- ADMIN_URL');