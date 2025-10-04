# Environment Configuration Setup

This document explains how to configure the environment variables for the TOMATO food delivery application backend.

## Required Environment Variables

### 1. JWT Configuration
```bash
JWT_SECRET=your_secure_jwt_secret_key_here
```
- **Purpose**: Used for signing and verifying JWT tokens for user authentication
- **Requirements**: Must be at least 32 characters long for security
- **Example**: Generate using `openssl rand -base64 32`

### 2. MongoDB Configuration
```bash
MONGO_URL=mongodb://localhost:27017/tomato-delivery
```
- **Purpose**: Connection string for MongoDB database
- **Local Development**: `mongodb://localhost:27017/tomato-delivery`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/tomato-delivery`

### 3. MercadoPago Configuration
```bash
MERCADOPAGO_ACCESS_TOKEN=your_mercadopago_access_token_here
```
- **Purpose**: Access token for MercadoPago payment processing
- **How to get**: Visit [MercadoPago Developers Panel](https://www.mercadopago.com/developers/panel)
- **Note**: Use test credentials for development, production credentials for live environment

### 4. Frontend URL Configuration
```bash
FRONTEND_URL=http://localhost:5173
```
- **Purpose**: Used for MercadoPago payment redirects
- **Development**: `http://localhost:5173`
- **Production**: `https://yourdomain.com`

### 5. Server Configuration
```bash
PORT=4000
```
- **Purpose**: Port number for the backend server
- **Default**: 4000 if not specified

## Setup Instructions

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Update the values** in `.env` with your actual credentials

3. **Validate configuration**: The server will automatically validate all environment variables on startup

## Environment Validation

The server includes automatic validation that checks:
- ✅ All required variables are present
- ✅ MongoDB URL format is valid
- ✅ Frontend URL format is valid
- ✅ MercadoPago token is not the default placeholder
- ✅ JWT secret is secure (minimum 32 characters)

If validation fails, the server will display clear error messages and exit.

## Security Notes

- Never commit your `.env` file to version control
- Use different credentials for development and production
- Regularly rotate your JWT secret and API tokens
- Use MongoDB Atlas or secure your local MongoDB instance
- Enable HTTPS in production environments

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running locally or your Atlas cluster is accessible
- Check your connection string format
- Verify network connectivity and firewall settings

### MercadoPago Issues
- Verify your access token is valid and not expired
- Check if you're using the correct environment (sandbox vs production)
- Ensure your MercadoPago account has the necessary permissions

### JWT Issues
- Make sure your JWT secret is long enough (32+ characters)
- Don't use easily guessable secrets
- Consider using environment-specific secrets