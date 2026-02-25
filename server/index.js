// Load environment variables
const path = require('path');
// Load .env from root directory (parent of server)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const { setupSocket } = require('./socket');
const helmet = require('helmet');
const logger = require('./lib/logger');
const requestId = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter, registerLimiter } = require('./middleware/rateLimiter');

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
const uploadsDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR, 'images')
    : path.join(__dirname, 'uploads', 'images');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.info('Created uploads/images directory', { path: uploadsDir });
} else {
    logger.debug('Uploads directory exists', { path: uploadsDir });
}

// Security headers via Helmet
app.use(helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // CSP managed separately for flexibility
}));

// Request ID and logging middleware
app.use(requestId);
app.use(requestLogger);

// Global rate limiter (200 req/min per IP)
app.use(apiLimiter);

// CORS configuration
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : true;

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Request-Id'],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Request-Id'],
    maxAge: 86400,
}));

// Body parser with reduced limit (was 50mb, now 10mb)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Error handling for PayloadTooLargeError
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large' || err.name === 'PayloadTooLargeError') {
        logger.warn('Payload too large', { requestId: req.requestId, size: req.headers['content-length'] });
        return res.status(413).json({
            ok: false,
            error: 'File size too large. Maximum size is 5MB per image.'
        });
    }
    next(err);
});

// Serve static files (payment success/failure pages)
app.use(express.static('server/public'));

// Serve uploaded images with proper headers
logger.debug('Configuring static file serving', { path: uploadsDir });
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

// Backward-compatible /uploads root
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

// Root
app.get('/', (_req, res) => {
    return res.type('text').send('Event API is running. Try GET /api/health or POST /api/register');
});

// Health check
app.get('/api/health', (_req, res) => {
    return res.json({ ok: true, timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    logger.debug('Route not found', { method: req.method, path: req.path, requestId: req.requestId });
    res.status(404).json({
        ok: false,
        error: `Route not found: ${req.method} ${req.path}`,
    });
});

// Global error handler
app.use((err, req, res, _next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        requestId: req.requestId,
    });
    res.status(err.status || 500).json({
        ok: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
});

// Export app for testing (before listen)
module.exports = { app };

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    app.set('io', io);
    setupSocket(io);

    server.listen(PORT, '0.0.0.0', () => {
        logger.info(`API server listening on http://localhost:${PORT}`);
        logger.info('Socket.io attached on same port');
        logger.info(`For Android emulator: http://10.0.2.2:${PORT}`);
    });
}
