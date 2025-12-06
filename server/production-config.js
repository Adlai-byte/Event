/**
 * Production Configuration Helper
 * 
 * This file contains production-ready configurations for your server.
 * Update server/index.js to use these settings in production.
 */

// Production CORS configuration
// Replace 'yourdomain.com' with your actual domain
const productionCorsConfig = {
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    'https://api.yourdomain.com', // If using subdomain
    // Add your Expo web app URL if deployed
    // 'https://yourapp.expo.dev',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

// Development CORS configuration (current setting)
const developmentCorsConfig = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

// Get CORS config based on environment
function getCorsConfig() {
  return process.env.NODE_ENV === 'production' 
    ? productionCorsConfig 
    : developmentCorsConfig;
}

module.exports = {
  getCorsConfig,
  productionCorsConfig,
  developmentCorsConfig,
};

