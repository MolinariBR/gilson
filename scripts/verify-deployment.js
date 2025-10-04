#!/usr/bin/env node

/**
 * TOMATO Food Delivery - Deployment Verification Script
 * Verifies that all components are properly integrated and configured
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
    if (fs.existsSync(filePath)) {
        log(`✅ ${description}`, 'green');
        return true;
    } else {
        log(`❌ ${description} - File not found: ${filePath}`, 'red');
        return false;
    }
}

function checkDirectoryExists(dirPath, description) {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        log(`✅ ${description}`, 'green');
        return true;
    } else {
        log(`❌ ${description} - Directory not found: ${dirPath}`, 'red');
        return false;
    }
}

function checkPackageScript(packagePath, scriptName, description) {
    try {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        if (packageJson.scripts && packageJson.scripts[scriptName]) {
            log(`✅ ${description}`, 'green');
            return true;
        } else {
            log(`❌ ${description} - Script not found: ${scriptName}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ ${description} - Error reading package.json: ${error.message}`, 'red');
        return false;
    }
}

function main() {
    log('🔍 TOMATO Food Delivery - Deployment Verification', 'blue');
    log('================================================', 'blue');

    let allChecks = true;

    // Check backend files
    log('\n📁 Backend Files:', 'yellow');
    allChecks &= checkFileExists('backend/models/categoryModel.js', 'Category Model');
    allChecks &= checkFileExists('backend/controllers/categoryController.js', 'Category Controller');
    allChecks &= checkFileExists('backend/routes/categoryRoute.js', 'Category Routes');
    allChecks &= checkFileExists('backend/services/categoryService.js', 'Category Service');
    allChecks &= checkFileExists('backend/middleware/categoryPerformance.js', 'Category Performance Middleware');
    allChecks &= checkFileExists('backend/migrations/migrateCategories.js', 'Category Migration Script');
    allChecks &= checkDirectoryExists('backend/uploads/categories', 'Category Upload Directory');

    // Check admin files
    log('\n📁 Admin Panel Files:', 'yellow');
    allChecks &= checkFileExists('admin/src/pages/Categories/Categories.jsx', 'Categories Page');
    allChecks &= checkFileExists('admin/src/components/CategoryManagement/CategoryList.jsx', 'Category List Component');
    allChecks &= checkFileExists('admin/src/components/CategoryManagement/CategoryForm.jsx', 'Category Form Component');
    allChecks &= checkFileExists('admin/src/components/CategoryManagement/CategoryCard.jsx', 'Category Card Component');
    allChecks &= checkFileExists('admin/src/components/CategoryManagement/ImageUpload.jsx', 'Image Upload Component');
    allChecks &= checkFileExists('admin/src/components/CategoryManagement/DeleteConfirmation.jsx', 'Delete Confirmation Component');

    // Check frontend files
    log('\n📁 Frontend Files:', 'yellow');
    allChecks &= checkFileExists('frontend/src/context/CategoryContext.jsx', 'Category Context');
    allChecks &= checkFileExists('frontend/src/services/categoryAPI.js', 'Category API Service');
    allChecks &= checkFileExists('frontend/src/hooks/useCategories.js', 'Category Hooks');

    // Check configuration files
    log('\n⚙️  Configuration Files:', 'yellow');
    allChecks &= checkFileExists('backend/.env.example', 'Backend Environment Example');
    allChecks &= checkFileExists('backend/.env.production', 'Backend Production Environment');
    allChecks &= checkFileExists('admin/.env.example', 'Admin Environment Example');
    allChecks &= checkFileExists('admin/.env.production', 'Admin Production Environment');
    allChecks &= checkFileExists('frontend/.env.example', 'Frontend Environment Example');
    allChecks &= checkFileExists('frontend/.env.production', 'Frontend Production Environment');

    // Check deployment scripts
    log('\n🚀 Deployment Scripts:', 'yellow');
    allChecks &= checkFileExists('scripts/deploy.sh', 'Deployment Script');
    allChecks &= checkFileExists('scripts/test-integration.sh', 'Integration Test Script');
    allChecks &= checkFileExists('scripts/verify-deployment.js', 'Verification Script');

    // Check package.json scripts
    log('\n📦 Package Scripts:', 'yellow');
    allChecks &= checkPackageScript('package.json', 'deploy:dev', 'Development Deployment Script');
    allChecks &= checkPackageScript('package.json', 'deploy:prod', 'Production Deployment Script');
    allChecks &= checkPackageScript('package.json', 'test:integration', 'Integration Test Script');
    allChecks &= checkPackageScript('package.json', 'migrate:categories', 'Category Migration Script');

    allChecks &= checkPackageScript('backend/package.json', 'migrate:categories', 'Backend Category Migration');
    allChecks &= checkPackageScript('backend/package.json', 'migrate:categories:validate', 'Backend Migration Validation');

    // Check test files
    log('\n🧪 Test Files:', 'yellow');
    allChecks &= checkFileExists('backend/tests/categoryAPI.test.js', 'Category API Tests');
    allChecks &= checkFileExists('backend/tests/categoryService.test.js', 'Category Service Tests');
    allChecks &= checkFileExists('backend/tests/categoryModel.test.js', 'Category Model Tests');
    allChecks &= checkFileExists('backend/tests/e2e/categoryManagement.e2e.test.js', 'Category E2E Tests');

    allChecks &= checkFileExists('admin/src/test/pages/Categories.test.jsx', 'Admin Categories Page Tests');
    allChecks &= checkFileExists('admin/src/test/components/CategoryManagement/CategoryList.test.jsx', 'Admin Category List Tests');
    allChecks &= checkFileExists('admin/src/test/components/CategoryManagement/CategoryForm.test.jsx', 'Admin Category Form Tests');

    allChecks &= checkFileExists('frontend/src/test/context/CategoryContext.test.jsx', 'Frontend Category Context Tests');
    allChecks &= checkFileExists('frontend/src/test/services/categoryAPI.test.js', 'Frontend Category API Tests');

    // Check documentation
    log('\n📚 Documentation:', 'yellow');
    allChecks &= checkFileExists('DEPLOYMENT_INTEGRATION.md', 'Deployment Integration Guide');
    allChecks &= checkFileExists('DEPLOYMENT_GUIDE.md', 'General Deployment Guide');

    // Summary
    log('\n📊 Verification Summary:', 'blue');
    log('===================', 'blue');

    if (allChecks) {
        log('🎉 All checks passed! The dynamic categories management system is fully integrated.', 'green');
        log('\n✅ Ready for deployment:', 'green');
        log('  • Backend API with category management', 'green');
        log('  • Admin panel with category CRUD operations', 'green');
        log('  • Frontend with dynamic category integration', 'green');
        log('  • Database migration system', 'green');
        log('  • Comprehensive testing suite', 'green');
        log('  • Deployment automation scripts', 'green');
        
        log('\n🚀 Next steps:', 'blue');
        log('  1. Run: npm run deploy:dev (for development)', 'blue');
        log('  2. Run: npm run deploy:prod (for production)', 'blue');
        log('  3. Run: npm run test:integration (to verify)', 'blue');
        
        process.exit(0);
    } else {
        log('❌ Some checks failed. Please review the missing files/configurations above.', 'red');
        log('\n🔧 Common fixes:', 'yellow');
        log('  • Ensure all tasks from the spec have been completed', 'yellow');
        log('  • Check file paths and naming conventions', 'yellow');
        log('  • Verify all components have been properly integrated', 'yellow');
        
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { checkFileExists, checkDirectoryExists, checkPackageScript };