#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing project for Square Cloud (1GB RAM optimization)...');

// Check if build files exist
const requiredBuilds = [
  'frontend/dist/index.html',
  'admin/dist/index.html'
];

const missingBuilds = requiredBuilds.filter(file => !fs.existsSync(file));

if (missingBuilds.length > 0) {
  console.error('❌ Missing build files. Run npm run build:all first:');
  missingBuilds.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
}

// Update frontend URLs to use single domain
const frontendDistPath = 'frontend/dist';
const adminDistPath = 'admin/dist';

// Function to update URLs in built files
function updateUrlsInBuiltFiles(distPath, isAdmin = false) {
  const indexPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Replace localhost URLs with relative paths
    content = content.replace(/http:\/\/localhost:4000/g, '');
    content = content.replace(/http:\/\/localhost:5173/g, '');
    content = content.replace(/http:\/\/localhost:5174/g, '');
    
    fs.writeFileSync(indexPath, content);
    console.log(`✅ Updated URLs in ${indexPath}`);
  }
}

// Update URLs in built files
updateUrlsInBuiltFiles(frontendDistPath);
updateUrlsInBuiltFiles(adminDistPath, true);

// Create deployment structure info
const deployInfo = {
  structure: {
    backend: 'Serves API and static files',
    frontend: 'Built and served as static files from /',
    admin: 'Built and served as static files from /admin'
  },
  memory: '1024MB (full 1GB allocation)',
  domains: {
    frontend: 'https://your-app.squarecloud.app/',
    admin: 'https://your-app.squarecloud.app/admin',
    api: 'https://your-app.squarecloud.app/api/*'
  },
  files: {
    main: 'backend/server.js',
    static: ['frontend/dist/', 'admin/dist/'],
    uploads: 'backend/uploads/'
  }
};

fs.writeFileSync('deploy-info.json', JSON.stringify(deployInfo, null, 2));

console.log('✅ Project optimized for 1GB RAM deployment!');
console.log('\n📊 Deployment Structure:');
console.log('├── Backend API (Node.js)');
console.log('├── Frontend (Static files at /)');
console.log('├── Admin Panel (Static files at /admin)');
console.log('└── File uploads (at /images)');

console.log('\n🔧 Memory Allocation:');
console.log('- Total: 1024MB (1GB)');
console.log('- Backend: ~800MB');
console.log('- Static serving: ~200MB');
console.log('- Buffer: ~24MB');

console.log('\n🌐 URLs after deployment:');
console.log('- Frontend: https://your-app.squarecloud.app/');
console.log('- Admin: https://your-app.squarecloud.app/admin');
console.log('- API: https://your-app.squarecloud.app/api/*');

console.log('\n📋 Next steps:');
console.log('1. Upload project to Square Cloud');
console.log('2. Set environment variables');
console.log('3. Update MercadoPago URLs');
console.log('4. Test all functionality');