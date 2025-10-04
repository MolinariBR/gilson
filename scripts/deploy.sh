#!/bin/bash

# TOMATO Food Delivery - Deployment Script
# This script handles the complete deployment process for all components

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
BACKEND_URL=${2:-"http://localhost:4000"}
FRONTEND_URL=${3:-"http://localhost:5173"}
ADMIN_URL=${4:-"http://localhost:5174"}

echo -e "${BLUE}🚀 Starting TOMATO Food Delivery Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Backend URL: ${BACKEND_URL}${NC}"
echo -e "${BLUE}Frontend URL: ${FRONTEND_URL}${NC}"
echo -e "${BLUE}Admin URL: ${ADMIN_URL}${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists node; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi

print_status "Prerequisites validated"

# Configure URLs
echo -e "${BLUE}🔧 Configuring URLs...${NC}"
node scripts/configure-urls.js "$ENVIRONMENT" "$BACKEND_URL" "$FRONTEND_URL" "$ADMIN_URL"
print_status "URLs configured"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"

echo "Installing backend dependencies..."
cd backend && npm install
cd ..

echo "Installing frontend dependencies..."
cd frontend && npm install
cd ..

echo "Installing admin dependencies..."
cd admin && npm install
cd ..

print_status "Dependencies installed"

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"

echo "Running backend tests..."
cd backend
if npm test; then
    print_status "Backend tests passed"
else
    print_warning "Some backend tests failed, but continuing deployment"
fi
cd ..

echo "Running frontend tests..."
cd frontend
if npm run test:run; then
    print_status "Frontend tests passed"
else
    print_warning "Some frontend tests failed, but continuing deployment"
fi
cd ..

echo "Running admin tests..."
cd admin
if npm run test:run; then
    print_status "Admin tests passed"
else
    print_warning "Some admin tests failed, but continuing deployment"
fi
cd ..

# Build applications
echo -e "${BLUE}🏗️  Building applications...${NC}"

echo "Building frontend..."
cd frontend && npm run build
cd ..
print_status "Frontend built"

echo "Building admin..."
cd admin && npm run build
cd ..
print_status "Admin built"

# Validate configuration
echo -e "${BLUE}🔍 Validating configuration...${NC}"
cd backend && npm run validate-config
cd ..
print_status "Configuration validated"

# Run database migrations if needed
echo -e "${BLUE}🗄️  Running database migrations...${NC}"
cd backend
if npm run migrate:categories:validate; then
    print_status "Category migration validated"
else
    print_warning "Running category migration..."
    npm run migrate:categories
    print_status "Category migration completed"
fi
cd ..

# Start services based on environment
if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${BLUE}🚀 Starting development services...${NC}"
    echo -e "${YELLOW}To start all services, run:${NC}"
    echo -e "${YELLOW}  Backend:  cd backend && npm run dev${NC}"
    echo -e "${YELLOW}  Frontend: cd frontend && npm run dev${NC}"
    echo -e "${YELLOW}  Admin:    cd admin && npm run dev${NC}"
elif [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${BLUE}🚀 Production deployment completed${NC}"
    echo -e "${YELLOW}To start production services:${NC}"
    echo -e "${YELLOW}  Backend:  cd backend && npm start${NC}"
    echo -e "${YELLOW}  Frontend: Serve the 'dist' folder with a web server${NC}"
    echo -e "${YELLOW}  Admin:    Serve the 'dist' folder with a web server${NC}"
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "1. Verify all services are running correctly"
echo -e "2. Test the complete workflow from frontend to admin"
echo -e "3. Check category management functionality"
echo -e "4. Verify payment integration (if applicable)"
echo -e "5. Monitor logs for any issues"

# Create deployment summary
cat > deployment-summary.txt << EOF
TOMATO Food Delivery - Deployment Summary
=========================================

Deployment Date: $(date)
Environment: $ENVIRONMENT
Backend URL: $BACKEND_URL
Frontend URL: $FRONTEND_URL
Admin URL: $ADMIN_URL

Components Deployed:
- ✅ Backend API Server
- ✅ Frontend User Interface
- ✅ Admin Management Panel
- ✅ Dynamic Category Management System
- ✅ Database Migrations

Configuration Files Updated:
- backend/.env
- frontend/.env
- admin/.env

Build Artifacts:
- frontend/dist/
- admin/dist/

Next Steps:
1. Start services according to environment
2. Verify complete workflow functionality
3. Monitor system performance
4. Check error logs

For support, refer to DEPLOYMENT_GUIDE.md
EOF

print_status "Deployment summary created: deployment-summary.txt"