// Load environment variables
const path = require('path');
// Load .env from root directory (parent of server)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');

// Route modules
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const notificationsRoutes = require('./routes/notifications');
const messagingRoutes = require('./routes/messaging');
const usersRoutes = require('./routes/users');
const servicesRoutes = require('./routes/services');
const packagesRoutes = require('./routes/packages');
const hiringRoutes = require('./routes/hiring');
const bookingsRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
// Use environment variable if set, otherwise use default relative to server directory
const uploadsDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR, 'images')
    : path.join(__dirname, 'uploads', 'images');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads/images directory:', uploadsDir);
} else {
    console.log('Uploads directory exists:', uploadsDir);
}

// CORS configuration - allow all origins (including all Vercel deployments)
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
}));

// Set Cross-Origin-Opener-Policy to allow window.opener communication
// This is needed for payment popups and Google OAuth popups
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
});

// Increase body parser limit to handle large base64 images (50MB limit)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Error handling middleware for PayloadTooLargeError
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large' || err.name === 'PayloadTooLargeError') {
        console.error('Payload too large error:', err.message);
        return res.status(413).json({
            ok: false,
            error: 'File size too large. Please compress your images or use smaller files. Maximum size is 5MB per image.'
        });
    }
    next(err);
});

// Serve static files (payment success/failure pages)
app.use(express.static('server/public'));

// Serve uploaded images with proper headers
console.log('Configuring static file serving from:', uploadsDir);
app.use('/uploads/images', express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
        } else if (filePath.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
        }
    }
}));

// Also serve from /uploads root for backward compatibility
const uploadsRootDir = path.dirname(uploadsDir);
app.use('/uploads', express.static(uploadsRootDir));

// Mount route modules
app.use('/api/admin', adminRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', notificationsRoutes);
app.use('/api', messagingRoutes);
app.use('/api', usersRoutes);
app.use('/api', servicesRoutes);
app.use('/api', packagesRoutes);
app.use('/api', hiringRoutes);
app.use('/api', bookingsRoutes);

// Root - helpful message instead of "Cannot GET /"
app.get('/', (_req, res) => {
    return res.type('text').send('Event API is running. Try GET /api/health or POST /api/register');
});

// Health check
app.get('/api/health', (_req, res) => {
    return res.json({ ok: true });
});

// 404 handler for undefined routes
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
        ok: false,
        error: `Route not found: ${req.method} ${req.path}`,
        availableRoutes: [
            'POST /api/users/apply-provider',
            'GET /api/health',
            'POST /api/register',
            'POST /api/notifications/register-token',
            'POST /api/notifications/test-push',
            'GET /api/notifications/push-tokens/:email'
        ]
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`API server listening on http://localhost:${PORT}`);
    console.log(`Server accessible from network on port ${PORT}`);
    console.log(`For Android emulator: http://10.0.2.2:${PORT}`);
    console.log(`For physical devices: http://YOUR_IP:${PORT}`);
});
