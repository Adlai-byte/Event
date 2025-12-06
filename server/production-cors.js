/**
 * Production CORS Configuration
 * 
 * Replace the CORS configuration in server/index.js with this for production.
 * 
 * Update the 'origin' array with your actual domains.
 */

const cors = require('cors');

// Production CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // List of allowed origins
    const allowedOrigins = [
      'https://yourdomain.com',
      'https://www.yourdomain.com',
      'https://api.yourdomain.com',
      // Add your mobile app domains if needed
      // 'https://app.yourdomain.com',
    ];

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // In development, you might want to allow localhost
      if (process.env.NODE_ENV === 'development') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

module.exports = corsOptions;

/**
 * USAGE:
 * 
 * In server/index.js, replace:
 * 
 * app.use(cors({
 *     origin: true, // Allow all origins
 *     credentials: true,
 *     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
 *     allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
 * }));
 * 
 * With:
 * 
 * const corsOptions = require('./production-cors');
 * app.use(cors(corsOptions));
 * 
 * Don't forget to update the allowedOrigins array with your actual domains!
 */

