# TOMATO - Food Ordering Website

This repository hosts the source code for TOMATO, a dynamic food ordering website built with the MERN Stack. It offers a user-friendly platform for seamless online food ordering.

## Demo

- User Panel: [https://food-delivery-frontend-s2l9.onrender.com/](https://food-delivery-frontend-s2l9.onrender.com/)
- Admin Panel: [https://food-delivery-admin-wrme.onrender.com/](https://food-delivery-admin-wrme.onrender.com/)

## Features

- User Panel
- Admin Panel
- Simplified Name-based Authentication (No passwords required)
- JWT Session Management
- MercadoPago Payment Integration
- Delivery Zone Management
- Structured Address System
- Login with Name Only
- Add to Cart
- Place Order
- Order Management
- Products Management
- Zone and Neighborhood Management
- Filter Food Products
- Authenticated APIs
- REST APIs
- Role-Based Identification
- Beautiful Alerts
- Automated URL Configuration

## Screenshots

![Hero](https://i.ibb.co/59cwY75/food-hero.png)
- Hero Section

![Products](https://i.ibb.co/JnNQPyQ/food-products.png)
- Products Section

![Cart](https://i.ibb.co/t2LrQ8p/food-cart.png)
- Cart Page

![Login](https://i.ibb.co/s6PgwkZ/food-login.png)
- Login Popup

## Quick Start

### Automated Setup (Recommended)

Clone the project
```bash
git clone https://github.com/Mshandev/Food-Delivery
cd Food-Delivery
```

Configure for development
```bash
npm run configure:dev
```

Install all dependencies
```bash
npm run install:all
```

Setup environment variables
```bash
# Copy example files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env

# Edit backend/.env with your values:
# JWT_SECRET=your_secure_jwt_secret_minimum_32_characters
# MONGO_URL=mongodb://localhost:27017/tomato-delivery
# MERCADOPAGO_ACCESS_TOKEN=TEST-your_test_token_here
```

Start all services
```bash
npm run dev:backend    # Terminal 1
npm run dev:frontend   # Terminal 2
npm run dev:admin      # Terminal 3
```

### Manual Setup

Install dependencies for each component:
```bash
cd backend && npm install
cd ../frontend && npm install
cd ../admin && npm install
```

Configure environment variables manually in each `.env` file.

Start each service individually:
```bash
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && npm run dev

# Admin
cd admin && npm run dev
```

## Production Deployment

For production deployment, see the [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

Quick production setup:
```bash
# Configure production URLs
node scripts/configure-urls.js production https://api.yourdomain.com https://yourdomain.com https://admin.yourdomain.com

# Build applications
npm run build:frontend
npm run build:admin
```
## Tech Stack
* [React](https://reactjs.org/) - Frontend framework
* [Node.js](https://nodejs.org/en) - Backend runtime
* [Express.js](https://expressjs.com/) - Web framework
* [MongoDB](https://www.mongodb.com/) - Database
* [MercadoPago](https://www.mercadopago.com/) - Payment processing
* [JWT](https://jwt.io/introduction) - Authentication
* [Multer](https://www.npmjs.com/package/multer) - File uploads
* [Vite](https://vitejs.dev/) - Build tool

## Deployment

The application is deployed on Render.

## Contributing

Contributions are always welcome!
Just raise an issue, and we will discuss it.

## Feedback

If you have any feedback, please reach out to me [here](https://www.linkedin.com/in/muhammad-shan-full-stack-developer/)
# Deploy trigger
