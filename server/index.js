// Load environment variables
const path = require('path');
// Load .env from root directory (parent of server)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { getPool } = require('./db');
const { createInstaPayPayment, createGCashPayment, createPaymentLink, createCheckoutSession, parsePaymentStatus } = require('./services/paymongo');
const { generateInvoicePDF } = require('./services/invoice');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const notificationsRoutes = require('./routes/notifications');
const messagingRoutes = require('./routes/messaging');
const usersRoutes = require('./routes/users');
const servicesRoutes = require('./routes/services');
const packagesRoutes = require('./routes/packages');
const hiringRoutes = require('./routes/hiring');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
// Use environment variable if set, otherwise use default relative to server directory
const uploadsDir = process.env.UPLOADS_DIR 
    ? path.resolve(process.env.UPLOADS_DIR, 'images')
    : path.join(__dirname, 'uploads', 'images');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('âœ… Created uploads/images directory:', uploadsDir);
} else {
    console.log('âœ… Uploads directory exists:', uploadsDir);
}

// Helper function to save base64 image to file
function saveBase64Image(base64String, serviceId) {
    try {
        // Extract image format and data
        const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 image format');
        }
        
        const imageFormat = matches[1]; // jpeg, png, etc.
        const imageData = matches[2]; // base64 data without prefix
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const filename = `service_${serviceId}_${timestamp}_${randomStr}.${imageFormat}`;
        const filepath = path.join(uploadsDir, filename);
        
        // Convert base64 to buffer and save
        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(filepath, buffer);
        
        // Return the URL path (relative to /uploads)
        return `/uploads/images/${filename}`;
    } catch (error) {
        console.error('Error saving image file:', error);
        throw error;
    }
}

// Helper function to save provider document
function saveProviderDocument(base64String, userId, documentType) {
    try {
        // Extract image format and data
        const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 image format');
        }
        
        const imageFormat = matches[1]; // jpeg, png, etc.
        const imageData = matches[2]; // base64 data without prefix
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const filename = `provider_${userId}_${documentType}_${timestamp}_${randomStr}.${imageFormat}`;
        const filepath = path.join(uploadsDir, filename);
        
        // Convert base64 to buffer and save
        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(filepath, buffer);
        
        // Return the URL path (relative to /uploads)
        return `/uploads/images/${filename}`;
    } catch (error) {
        console.error('Error saving provider document:', error);
        throw error;
    }
}

// Helper function to save profile picture
function saveProfilePicture(base64String, userId) {
    try {
        console.log('ðŸ“¸ Starting profile picture save for user:', userId);
        console.log('ðŸ“ Uploads directory:', uploadsDir);
        console.log('ðŸ“ __dirname:', __dirname);
        console.log('ðŸ“ Directory exists:', fs.existsSync(uploadsDir));
        
        // Ensure directory exists and is writable
        if (!fs.existsSync(uploadsDir)) {
            console.log('ðŸ“ Creating uploads directory:', uploadsDir);
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log('âœ… Created uploads directory');
        }
        
        // Verify directory is writable
        try {
            fs.accessSync(uploadsDir, fs.constants.W_OK);
            console.log('âœ… Uploads directory is writable');
        } catch (accessError) {
            console.error('âŒ Uploads directory is NOT writable!');
            console.error('âŒ Directory path:', uploadsDir);
            throw new Error(`Uploads directory is not writable: ${accessError.message}`);
        }
        
        // Extract image format and data
        const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            console.error('âŒ Invalid base64 image format');
            throw new Error('Invalid base64 image format');
        }
        
        const imageFormat = matches[1]; // jpeg, png, etc.
        const imageData = matches[2]; // base64 data without prefix
        
        console.log('ðŸ“¸ Image format:', imageFormat);
        console.log('ðŸ“¸ Image data length:', imageData.length);
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const filename = `profile_${userId}_${timestamp}_${randomStr}.${imageFormat}`;
        const filepath = path.join(uploadsDir, filename);
        
        console.log('ðŸ“¸ Filename:', filename);
        console.log('ðŸ“¸ Full file path:', filepath);
        
        // Convert base64 to buffer and save
        const buffer = Buffer.from(imageData, 'base64');
        console.log('ðŸ“¸ Buffer size:', buffer.length, 'bytes');
        
        // Write file with explicit error handling and ensure it's flushed to disk
        try {
            console.log('ðŸ“¸ Attempting to write file...');
            console.log('ðŸ“¸ File path:', filepath);
            console.log('ðŸ“¸ Buffer length:', buffer.length, 'bytes');
            
            // Ensure parent directory exists
            const parentDir = path.dirname(filepath);
            if (!fs.existsSync(parentDir)) {
                console.log('ðŸ“ Creating parent directory:', parentDir);
                fs.mkdirSync(parentDir, { recursive: true });
                console.log('âœ… Parent directory created');
            }
            
            // Write file using writeFileSync with explicit options
            fs.writeFileSync(filepath, buffer, { 
                flag: 'w', 
                mode: 0o666,
                encoding: null // Write as binary
            });
            
            // Force sync to ensure data is written to disk
            try {
                const fd = fs.openSync(filepath, 'r+');
                fs.fsyncSync(fd);
                fs.closeSync(fd);
                console.log('âœ… File synced to disk');
            } catch (syncError) {
                console.warn('âš ï¸  Could not sync file (non-critical):', syncError.message);
                // Continue anyway - file should still be written
            }
            
            console.log('âœ… File write operation completed');
            
            // Verify the file was written (with retries for Windows file system)
            let retries = 10;
            let fileExists = false;
            let fileStats = null;
            
            while (retries > 0) {
                if (fs.existsSync(filepath)) {
                    fileStats = fs.statSync(filepath);
                    if (fileStats.size === buffer.length && fileStats.size > 0) {
                        fileExists = true;
                        break;
                    }
                }
                // Small delay for Windows file system to update
                const start = Date.now();
                while (Date.now() - start < 50) { /* wait 50ms */ }
                retries--;
            }
            
            if (!fileExists || !fileStats) {
                console.error('âŒ File verification failed after retries');
                console.error('âŒ Expected path:', filepath);
                console.error('âŒ File exists:', fs.existsSync(filepath));
                if (fs.existsSync(filepath)) {
                    const actualStats = fs.statSync(filepath);
                    console.error('âŒ Actual file size:', actualStats.size);
                    console.error('âŒ Expected file size:', buffer.length);
                }
                throw new Error('File was not created or verified on disk');
            }
            
            console.log('âœ… File write verified - size matches buffer:', fileStats.size, 'bytes');
        } catch (writeError) {
            console.error('âŒ Write error code:', writeError.code);
            console.error('âŒ Write error message:', writeError.message);
            console.error('âŒ Write error path:', filepath);
            console.error('âŒ Write error stack:', writeError.stack);
            throw writeError;
        }
        
        // Final verification - ensure file exists and is readable
        console.log('ðŸ“¸ Final verification - checking file exists and is readable...');
        if (!fs.existsSync(filepath)) {
            console.error('âŒ CRITICAL: File does not exist after write and verification!');
            console.error('âŒ File path:', filepath);
            console.error('âŒ Directory exists:', fs.existsSync(path.dirname(filepath)));
            console.error('âŒ Files in directory:', fs.existsSync(path.dirname(filepath)) ? fs.readdirSync(path.dirname(filepath)).slice(0, 5) : 'N/A');
            throw new Error('File was not created on disk');
        }
        
        // Verify file is readable and has correct size
        try {
            const finalStats = fs.statSync(filepath);
            console.log('âœ… Final verification - file exists');
            console.log('âœ… File size:', finalStats.size, 'bytes');
            console.log('âœ… Expected size:', buffer.length, 'bytes');
            
            if (finalStats.size === 0) {
                console.error('âŒ CRITICAL: File exists but is empty (0 bytes)!');
                throw new Error('File was created but is empty');
            }
            
            if (finalStats.size !== buffer.length) {
                console.error('âŒ CRITICAL: File size mismatch in final verification!');
                console.error('âŒ Expected:', buffer.length, 'bytes');
                console.error('âŒ Actual:', finalStats.size, 'bytes');
                throw new Error(`File size mismatch: expected ${buffer.length} bytes, got ${finalStats.size} bytes`);
                }
            
            // Try to read the file to ensure it's actually accessible
            const testRead = fs.readFileSync(filepath);
            if (testRead.length !== buffer.length) {
                throw new Error('File read size does not match expected size');
            }
            console.log('âœ… File is readable and size matches');
        } catch (verifyError) {
            console.error('âŒ Final verification failed:', verifyError.message);
            throw verifyError;
        }
        
        // Return the URL path (relative to /uploads)
        const urlPath = `/uploads/images/${filename}`;
        console.log('âœ… Profile picture saved successfully to:', filepath);
        console.log('âœ… Profile picture URL path:', urlPath);
        return urlPath;
    } catch (error) {
        console.error('âŒ Error saving profile picture:', error);
        console.error('âŒ Error stack:', error.stack);
        throw error;
    }
}

// CORS configuration - allow all origins (including all Vercel deployments)
// Simple configuration that allows all origins
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
    // Allow same-origin-allow-popups for popup windows (payment, OAuth)
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
});

// Increase body parser limit to handle large base64 images (50MB limit)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // For webhook callbacks

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
// Use the same uploadsDir variable that's used for saving files
console.log('ðŸ“ Configuring static file serving from:', uploadsDir);
app.use('/uploads/images', express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
        // Set CORS headers for images
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        // Set proper content type
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
// Use parent directory of uploadsDir (which is already 'images')
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

// Root - helpful message instead of "Cannot GET /"
app.get('/', (_req, res) => {
    return res.type('text').send('Event API is running. Try GET /api/health or POST /api/register');
});

// Health check
app.get('/api/health', (_req, res) => {
	return res.json({ ok: true });
});


// User routes moved to ./routes/users.js


// Test endpoint to save a test image
app.post('/api/test-save-image', (req, res) => {
    try {
        const { base64Data, userId } = req.body;
        if (!base64Data || !userId) {
            return res.status(400).json({ ok: false, error: 'base64Data and userId required' });
        }
        
        console.log('ðŸ§ª Test: Saving test image...');
        const result = saveProfilePicture(base64Data, userId);
        
        // Verify file exists
        const filename = result.replace('/uploads/images/', '');
        const filepath = path.join(uploadsDir, filename);
        const exists = fs.existsSync(filepath);
        
        return res.json({
            ok: true,
            path: result,
            filepath: filepath,
            exists: exists,
            uploadsDir: uploadsDir,
            __dirname: __dirname
        });
    } catch (error) {
        console.error('ðŸ§ª Test save failed:', error);
        return res.status(500).json({
            ok: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Test endpoint to verify image file exists and can be served
app.get('/api/test-image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    console.log('ðŸ” Testing image file:', filename);
    console.log('ðŸ” Looking in:', filePath);
    console.log('ðŸ” Uploads directory:', uploadsDir);
    console.log('ðŸ” __dirname:', __dirname);
    console.log('ðŸ” Directory exists:', fs.existsSync(uploadsDir));
    console.log('ðŸ” File exists:', fs.existsSync(filePath));
    
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return res.json({
            ok: true,
            exists: true,
            path: filePath,
            size: stats.size,
            url: `/uploads/images/${filename}`,
            uploadsDir: uploadsDir,
            __dirname: __dirname,
            staticServingFrom: uploadsDir,
            message: 'File exists. Try accessing: http://' + req.get('host') + '/uploads/images/' + filename
        });
    } else {
        // List files in directory for debugging
        let filesInDir = [];
        try {
            if (fs.existsSync(uploadsDir)) {
                filesInDir = fs.readdirSync(uploadsDir);
            }
        } catch (e) {
            console.error('Error reading directory:', e);
        }
        
        return res.json({
            ok: true,
            exists: false,
            path: filePath,
            searchedIn: uploadsDir,
            __dirname: __dirname,
            filesInDir: filesInDir.slice(0, 10), // First 10 files
            message: 'File not found. Check the path above.'
        });
    }
});

// Direct image serving endpoint (fallback if static serving fails)
app.get('/api/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    console.log('ðŸ–¼ï¸  Direct image request:', filename);
    console.log('ðŸ–¼ï¸  File path:', filePath);
    
    if (fs.existsSync(filePath)) {
        // Determine content type
        let contentType = 'image/jpeg';
        if (filename.endsWith('.png')) contentType = 'image/png';
        else if (filename.endsWith('.gif')) contentType = 'image/gif';
        else if (filename.endsWith('.webp')) contentType = 'image/webp';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        
        return res.sendFile(path.resolve(filePath));
    } else {
        return res.status(404).json({ ok: false, error: 'Image not found' });
    }
});


// Admin routes (provider-applications, analytics) moved to ./routes/admin.js
// User and register routes moved to ./routes/users.js


// Service routes moved to ./routes/services.js
// Package routes moved to ./routes/packages.js
// ============================================
// BOOKINGS API ENDPOINTS
// ============================================

// Get all bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT b.*, 
                   CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                   u.u_email as client_email
            FROM booking b
            LEFT JOIN user u ON b.b_client_id = u.iduser
            ORDER BY b.b_created_at DESC
        `);
        
        // Get services for each booking
        for (const booking of rows) {
            const [services] = await pool.query(`
                SELECT s.s_name, bs.bs_quantity, bs.bs_unit_price, bs.bs_total_price
                FROM booking_service bs
                LEFT JOIN service s ON bs.bs_service_id = s.idservice
                WHERE bs.bs_booking_id = ?
            `, [booking.idbooking]);
            booking.services = services.map(s => s.s_name);
        }
        
        return res.json({ ok: true, rows });
    } catch (err) {
        console.error('List bookings failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get user's bookings
app.get('/api/user/bookings', async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ ok: false, error: 'Email required' });
    }
    try {
        const pool = getPool();
        // Get user ID from email
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [email]);
        if (userRows.length === 0) {
            return res.json({ ok: true, rows: [] });
        }
        const userId = userRows[0].iduser;
        
        // Get bookings for this user with payment status (including cancelled and completed)
        const [rows] = await pool.query(`
            SELECT b.*, 
                   CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                   u.u_email as client_email,
                   CASE WHEN EXISTS (
                       SELECT 1 FROM payment p 
                       WHERE p.p_booking_id = b.idbooking 
                       AND p.p_status = 'completed'
                   ) THEN 1 ELSE 0 END as is_paid
            FROM booking b
            LEFT JOIN user u ON b.b_client_id = u.iduser
            WHERE b.b_client_id = ?
            ORDER BY b.b_event_date DESC, b.b_created_at DESC
        `, [userId]);
        
        // Get services for each booking with images and full details
        for (const booking of rows) {
            const [services] = await pool.query(`
                SELECT s.idservice, s.s_name, s.s_description, s.s_base_price, s.s_category, 
                       s.s_duration, s.s_max_capacity, s.s_city, s.s_state, s.s_address,
                       bs.bs_quantity, bs.bs_unit_price, bs.bs_total_price,
                       (SELECT si.si_image_url 
                        FROM service_image si 
                        WHERE si.si_service_id = s.idservice 
                        AND si.si_is_primary = 1 
                        LIMIT 1) as primary_image
                FROM booking_service bs
                LEFT JOIN service s ON bs.bs_service_id = s.idservice
                WHERE bs.bs_booking_id = ?
            `, [booking.idbooking]);
            // Store both service names (for suppliers list) and full service details
            booking.services = services.map(s => s.s_name);
            booking.serviceDetails = services.map(s => ({
                serviceId: s.idservice,
                name: s.s_name,
                description: s.s_description,
                price: s.s_base_price,
                category: s.s_category,
                duration: s.s_duration,
                capacity: s.s_max_capacity,
                location: s.s_city ? `${s.s_city}${s.s_state ? ', ' + s.s_state : ''}` : (s.s_address || ''),
                quantity: s.bs_quantity,
                unitPrice: s.bs_unit_price,
                totalPrice: s.bs_total_price,
                image: s.primary_image
            }));
            // Get the first service's image as the booking image
            if (services.length > 0 && services[0].primary_image) {
                booking.primary_image = services[0].primary_image;
            }
        }
        
        return res.json({ ok: true, rows });
    } catch (err) {
        console.error('Get user bookings failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get user's bookings count
app.get('/api/user/bookings/count', async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ ok: false, error: 'Email required' });
    }
    try {
        const pool = getPool();
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [email]);
        if (userRows.length === 0) {
            return res.json({ ok: true, count: 0 });
        }
        const userId = userRows[0].iduser;
        const [countRows] = await pool.query(
            'SELECT COUNT(*) as count FROM booking WHERE b_client_id = ? AND b_status != ?',
            [userId, 'cancelled']
        );
        return res.json({ ok: true, count: countRows[0].count || 0 });
    } catch (err) {
        console.error('Get bookings count failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get user's unread messages count
// Get user payment methods
app.get('/api/user/payment-methods', async (req, res) => {
    const email = req.query.email;
    
    if (!email) {
        return res.status(400).json({ ok: false, error: 'Email is required' });
    }
    
    try {
        const pool = getPool();
        
        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [email]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;
        
        // Get payment methods
        const [paymentMethods] = await pool.query(
            `SELECT 
                idpayment_method as id,
                pm_type as type,
                pm_account_name as account_name,
                pm_account_number as account_number,
                pm_is_default as is_default,
                pm_created_at as created_at
             FROM payment_method
             WHERE pm_user_id = ?
             ORDER BY pm_is_default DESC, pm_created_at DESC`,
            [userId]
        );
        
        return res.json({ ok: true, paymentMethods });
    } catch (err) {
        console.error('Get payment methods failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Add payment method
app.post('/api/user/payment-methods', async (req, res) => {
    const { userEmail, type, account_name, account_number, is_default } = req.body || {};
    
    if (!userEmail || !type || !account_name || !account_number) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    
    try {
        const pool = getPool();
        
        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;
        
        // If setting as default, unset other defaults
        if (is_default) {
            await pool.query(
                'UPDATE payment_method SET pm_is_default = 0 WHERE pm_user_id = ?',
                [userId]
            );
        }
        
        // Insert payment method
        await pool.query(
            `INSERT INTO payment_method 
             (pm_user_id, pm_type, pm_account_name, pm_account_number, pm_is_default)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, type, account_name.trim(), account_number.trim(), is_default ? 1 : 0]
        );
        
        return res.json({ ok: true, message: 'Payment method added successfully' });
    } catch (err) {
        console.error('Add payment method failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Set default payment method
app.post('/api/user/payment-methods/:id/set-default', async (req, res) => {
    const id = Number(req.params.id);
    const { userEmail } = req.body || {};
    
    if (!Number.isFinite(id) || !userEmail) {
        return res.status(400).json({ ok: false, error: 'Invalid request' });
    }
    
    try {
        const pool = getPool();
        
        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;
        
        // Verify payment method belongs to user
        const [pmRows] = await pool.query(
            'SELECT idpayment_method FROM payment_method WHERE idpayment_method = ? AND pm_user_id = ?',
            [id, userId]
        );
        if (pmRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Payment method not found' });
        }
        
        // Unset all defaults for this user
        await pool.query(
            'UPDATE payment_method SET pm_is_default = 0 WHERE pm_user_id = ?',
            [userId]
        );
        
        // Set this one as default
        await pool.query(
            'UPDATE payment_method SET pm_is_default = 1 WHERE idpayment_method = ?',
            [id]
        );
        
        return res.json({ ok: true, message: 'Default payment method updated' });
    } catch (err) {
        console.error('Set default payment method failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Delete payment method
app.delete('/api/user/payment-methods/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { userEmail } = req.body || {};
    
    if (!Number.isFinite(id) || !userEmail) {
        return res.status(400).json({ ok: false, error: 'Invalid request' });
    }
    
    try {
        const pool = getPool();
        
        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;
        
        // Verify payment method belongs to user
        const [pmRows] = await pool.query(
            'SELECT idpayment_method FROM payment_method WHERE idpayment_method = ? AND pm_user_id = ?',
            [id, userId]
        );
        if (pmRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Payment method not found' });
        }
        
        // Delete payment method
        await pool.query(
            'DELETE FROM payment_method WHERE idpayment_method = ?',
            [id]
        );
        
        return res.json({ ok: true, message: 'Payment method deleted successfully' });
    } catch (err) {
        console.error('Delete payment method failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Messaging routes moved to ./routes/messaging.js

// ============================================
// PAYMENT PROCESSING API ENDPOINT
// ============================================

// Create PayMongo payment using API
app.post('/api/bookings/:bookingId/pay', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const { userEmail } = req.body || {};
    
    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }
    
    if (isNaN(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }
    
    try {
        const pool = getPool();
        
        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;
        
        // Verify booking exists and belongs to user
        const [bookingRows] = await pool.query(
            'SELECT idbooking, b_total_cost, b_status, b_event_name FROM booking WHERE idbooking = ? AND b_client_id = ?',
            [bookingId, userId]
        );
        
        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        
        const booking = bookingRows[0];
        
        // Check if booking is confirmed
        if (booking.b_status !== 'confirmed') {
            return res.status(400).json({ 
                ok: false, 
                error: 'Booking must be confirmed before payment' 
            });
        }
        
        // Check if already paid
        const [existingPayment] = await pool.query(
            'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status = "completed"',
            [bookingId]
        );
        
        if (existingPayment.length > 0) {
            return res.status(400).json({ 
                ok: false, 
                error: 'This booking has already been paid' 
            });
        }
        
        const amount = parseFloat(booking.b_total_cost);
        const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
        
        // Create success and failed redirect URLs
        const successUrl = `${apiBaseUrl}/api/payments/paymongo/success?bookingId=${bookingId}&userEmail=${encodeURIComponent(userEmail)}`;
        const failedUrl = `${apiBaseUrl}/api/payments/paymongo/failed?bookingId=${bookingId}&userEmail=${encodeURIComponent(userEmail)}`;
        
        // Create pending payment record first
        const transactionId = `EVT-${bookingId}-${Date.now()}`;
        const connection = await pool.getConnection();
        let paymentId = null;
        
        try {
            await connection.beginTransaction();
            
            // Check if there's already a pending payment
            const [existingPendingPayment] = await connection.query(
                'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status IN ("pending", "processing")',
                [bookingId]
            );
            
            if (existingPendingPayment.length === 0) {
                const [paymentResult] = await connection.query(
                    `INSERT INTO payment 
                     (p_booking_id, p_user_id, p_amount, p_currency, p_status, p_payment_method, p_transaction_id)
                     VALUES (?, ?, ?, 'PHP', 'pending', 'PayMongo GCash', ?)`,
                    [bookingId, userId, amount, transactionId]
                );
                paymentId = paymentResult.insertId;
            } else {
                paymentId = existingPendingPayment[0].idpayment;
            }
            
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
        
        // Get provider's PayMongo credentials from the booking's services
        const [providerRows] = await pool.query(`
            SELECT DISTINCT u.u_paymongo_secret_key, u.u_paymongo_public_key, u.u_paymongo_mode, u.u_email, u.u_fname, u.u_lname
            FROM booking_service bs
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            INNER JOIN user u ON s.s_provider_id = u.iduser
            WHERE bs.bs_booking_id = ?
        `, [bookingId]);
        
        console.log(`[Payment] Found ${providerRows.length} provider(s) for booking ${bookingId}`);
        
        let providerCredentials = null;
        if (providerRows.length > 0) {
            // If multiple providers, use the first one with credentials, or first one if none have credentials
            const providerWithCredentials = providerRows.find(p => p.u_paymongo_secret_key) || providerRows[0];
            
            if (providerWithCredentials.u_paymongo_secret_key) {
                providerCredentials = {
                    secretKey: providerWithCredentials.u_paymongo_secret_key,
                    publicKey: providerWithCredentials.u_paymongo_public_key,
                    mode: providerWithCredentials.u_paymongo_mode || (providerWithCredentials.u_paymongo_secret_key.startsWith('sk_test_') ? 'test' : 'live'),
                    providerEmail: providerWithCredentials.u_email,
                    providerName: `${providerWithCredentials.u_fname || ''} ${providerWithCredentials.u_lname || ''}`.trim(),
                };
                console.log('âœ… Using provider PayMongo credentials:', {
                    providerName: providerCredentials.providerName,
                    providerEmail: providerCredentials.providerEmail,
                    mode: providerCredentials.mode,
                    secretKeyPrefix: providerCredentials.secretKey.substring(0, 10) + '...',
                });
            } else {
                // Provider found but no payment setup - return error
                const providerName = `${providerWithCredentials.u_fname || ''} ${providerWithCredentials.u_lname || ''}`.trim() || providerWithCredentials.u_email;
                console.log('âŒ Provider found but no PayMongo credentials configured:', {
                    providerEmail: providerWithCredentials.u_email,
                    providerName: providerName,
                });
                return res.status(400).json({ 
                    ok: false, 
                    error: 'Provider not yet set up his payment' 
                });
            }
        } else {
            console.log('âš ï¸  No provider found for booking');
            return res.status(400).json({ 
                ok: false, 
                error: 'Provider not yet set up his payment' 
            });
        }
        
        // Try to create PayMongo Checkout Session first (recommended by PayMongo docs)
        // If that fails, try Payment Link, then fall back to provider's configured payment link
        let paymentData;
        let paymentMethod = 'PayMongo Checkout Session';
        
        try {
            // Try Checkout Session first (recommended API method)
            paymentData = await createCheckoutSession({
                amount: amount,
                description: `Payment for booking: ${booking.b_event_name || 'Event Booking'}`,
                successUrl: successUrl,
                failedUrl: failedUrl,
                metadata: {
                    booking_id: bookingId.toString(),
                    user_id: userId.toString(),
                    payment_id: paymentId?.toString(),
                    transaction_id: transactionId,
                },
                secretKey: providerCredentials?.secretKey,
                mode: providerCredentials?.mode,
            });
            
            // Update payment record with PayMongo session ID
            if (paymentId && paymentData.sessionId) {
                await pool.query(
                    'UPDATE payment SET p_transaction_id = ?, p_payment_method = ? WHERE idpayment = ?',
                    [`${transactionId}|${paymentData.sessionId}`, paymentMethod, paymentId]
                );
            }
            
            console.log('PayMongo Checkout Session created:', {
                bookingId,
                amount,
                checkoutUrl: paymentData.checkoutUrl,
                sessionId: paymentData.sessionId,
            });
        } catch (checkoutError) {
            console.error('Checkout Session creation failed, trying Payment Link:', checkoutError.message);
            
            try {
                // Fallback to Payment Link API
                paymentData = await createPaymentLink({
                    amount: amount,
                    description: `Payment for booking: ${booking.b_event_name || 'Event Booking'}`,
                    successUrl: successUrl,
                    failedUrl: failedUrl,
                    metadata: {
                        booking_id: bookingId.toString(),
                        user_id: userId.toString(),
                        payment_id: paymentId?.toString(),
                        transaction_id: transactionId,
                    },
                    secretKey: providerCredentials?.secretKey,
                    mode: providerCredentials?.mode,
                });
                
                paymentMethod = 'PayMongo Payment Link';
                
                // Update payment record with PayMongo link ID
                if (paymentId && paymentData.linkId) {
                    await pool.query(
                        'UPDATE payment SET p_transaction_id = ?, p_payment_method = ? WHERE idpayment = ?',
                        [`${transactionId}|${paymentData.linkId}`, paymentMethod, paymentId]
                    );
                }
                
                console.log('PayMongo Payment Link created:', {
                    bookingId,
                    amount,
                    checkoutUrl: paymentData.checkoutUrl,
                    linkId: paymentData.linkId,
                });
            } catch (linkError) {
                console.error('Payment Link API creation failed, trying provider payment link:', linkError.message);
                
                // Final fallback to provider's configured payment link
                // Use the providerRows we already fetched, or fetch again if needed
                let providerLinkRows = providerRows;
                if (!providerLinkRows || providerLinkRows.length === 0) {
                    [providerLinkRows] = await pool.query(`
                    SELECT DISTINCT u.u_paymongo_payment_link
                    FROM booking_service bs
                    INNER JOIN service s ON bs.bs_service_id = s.idservice
                    INNER JOIN user u ON s.s_provider_id = u.iduser
                    WHERE bs.bs_booking_id = ?
                    LIMIT 1
                `, [bookingId]);
                }
                
                if (providerLinkRows.length > 0 && providerLinkRows[0].u_paymongo_payment_link) {
                    const providerLink = providerLinkRows[0].u_paymongo_payment_link;
                    paymentMethod = 'PayMongo Provider Link';
                    
                    // Append amount as query parameter if possible
                    let finalLink = providerLink;
                    try {
                        const url = new URL(providerLink);
                        url.searchParams.set('amount', amount.toString());
                        finalLink = url.toString();
                    } catch (e) {
                        // If URL parsing fails, use original link
                        const separator = providerLink.includes('?') ? '&' : '?';
                        finalLink = `${providerLink}${separator}amount=${amount}`;
                    }
                    
                    paymentData = {
                        linkId: null,
                        sessionId: null,
                        checkoutUrl: finalLink,
                        status: 'pending',
                        amount: amountInCents,
                        currency: 'PHP',
                    };
                    
                    console.log('Using provider payment link as final fallback:', {
                        bookingId,
                        amount,
                        checkoutUrl: finalLink,
                    });
                } else {
                    throw new Error(`Payment creation failed. Checkout Session: ${checkoutError.message}, Payment Link: ${linkError.message}. Provider payment link also not configured.`);
                }
            }
        }
        
        return res.json({
            ok: true,
            paymentUrl: paymentData.checkoutUrl,
            sessionId: paymentData.sessionId || null,
            linkId: paymentData.linkId || null,
            sourceId: paymentData.sourceId || null,
            paymentIntentId: paymentData.paymentIntentId || null,
            amount: amount,
            paymentId: paymentId,
        });
    } catch (err) {
        console.error('Create PayMongo payment failed:', err);
        return res.status(500).json({ 
            ok: false, 
            error: err.message || 'Failed to create payment. Please try again.'
        });
    }
});

// Process cash payment
app.post('/api/bookings/:bookingId/pay-cash', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const { userEmail } = req.body || {};
    
    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }
    
    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }
    
    try {
        const pool = getPool();
        
        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;
        
        // Get booking details
        const [bookingRows] = await pool.query(
            'SELECT b_client_id, b_total_cost, b_status FROM booking WHERE idbooking = ?',
            [bookingId]
        );
        
        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        
        const booking = bookingRows[0];
        
        // Verify booking belongs to user
        if (booking.b_client_id !== userId) {
            return res.status(403).json({ ok: false, error: 'You can only pay for your own bookings' });
        }
        
        // Check if booking is already paid
        const [existingPayment] = await pool.query(
            'SELECT idpayment, p_status FROM payment WHERE p_booking_id = ? AND p_status = "completed"',
            [bookingId]
        );
        
        if (existingPayment.length > 0) {
            return res.status(400).json({ ok: false, error: 'This booking has already been paid' });
        }
        
        const amount = parseFloat(booking.b_total_cost) || 0;
        
        // Create cash payment record
        const connection = await pool.getConnection();
        let paymentId = null;
        
        try {
            await connection.beginTransaction();
            
            // Check if there's already a pending cash payment
            const [existingPendingPayment] = await connection.query(
                'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status IN ("pending", "processing") AND p_payment_method = "Cash on Hand"',
                [bookingId]
            );
            
            if (existingPendingPayment.length === 0) {
                // Create new cash payment record
                const [paymentResult] = await connection.query(
                    `INSERT INTO payment 
                     (p_booking_id, p_user_id, p_amount, p_currency, p_status, p_payment_method, p_transaction_id)
                     VALUES (?, ?, ?, 'PHP', 'pending', 'Cash on Hand', ?)`,
                    [bookingId, userId, amount, `CASH-${Date.now()}-${bookingId}`]
                );
                paymentId = paymentResult.insertId;
            } else {
                paymentId = existingPendingPayment[0].idpayment;
            }
            
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
        
        console.log(`âœ“ Cash payment recorded for booking ${bookingId} (Payment ID: ${paymentId})`);
        
        return res.json({ 
            ok: true, 
            message: 'Cash payment recorded successfully',
            paymentId: paymentId
        });
    } catch (err) {
        console.error('Process cash payment failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// PayMongo payment success redirect handler
app.get('/api/payments/paymongo/success', async (req, res) => {
    const { bookingId, userEmail } = req.query || {};
    
    if (!bookingId || !userEmail) {
        return res.status(400).send(`
            <html>
                <body>
                    <h1>Payment Error</h1>
                    <p>Missing required parameters.</p>
                </body>
            </html>
        `);
    }
    
    try {
        const pool = getPool();
        
        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).send(`
                <html>
                    <body>
                        <h1>Payment Error</h1>
                        <p>User not found.</p>
                    </body>
                </html>
            `);
        }
        const userId = userRows[0].iduser;
        
        // Update payment status to completed
        const [updateResult] = await pool.query(
            `UPDATE payment 
             SET p_status = 'completed', 
                 p_paid_at = NOW()
             WHERE p_booking_id = ? 
             AND p_user_id = ? 
             AND p_status IN ('pending', 'processing')`,
            [parseInt(bookingId), userId]
        );
        
        if (updateResult.affectedRows > 0) {
            console.log('Payment marked as completed for booking:', bookingId);
        }
        
        // Redirect to user homepage (configurable via environment variable)
        const homepageUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        
        // Set headers to allow popup communication
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
        
        return res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Payment Success</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="refresh" content="2;url=${homepageUrl}">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            margin: 0;
                            background: #f5f5f5;
                        }
                        .container {
                            background: white;
                            padding: 40px;
                            border-radius: 10px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            text-align: center;
                            max-width: 400px;
                        }
                        .success-icon {
                            font-size: 64px;
                            color: #10b981;
                            margin-bottom: 20px;
                        }
                        h1 {
                            color: #10b981;
                            margin-bottom: 10px;
                        }
                        p {
                            color: #666;
                            margin-bottom: 30px;
                        }
                        .loading {
                            color: #10b981;
                            font-size: 14px;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="success-icon">âœ“</div>
                        <h1>Payment Successful!</h1>
                        <p>Your payment has been processed successfully.</p>
                        <p class="loading">Redirecting to homepage...</p>
                    </div>
                    <script>
                        // Redirect immediately
                        setTimeout(() => {
                            window.location.href = '${homepageUrl}';
                        }, 1000);
                        
                        // Also try to notify parent window if opened in popup
                        if (window.opener) {
                            window.opener.postMessage('payment-success', '*');
                            setTimeout(() => {
                                window.close();
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
    } catch (err) {
        console.error('Payment success handler error:', err);
        return res.status(500).send(`
            <html>
                <body>
                    <h1>Payment Processing Error</h1>
                    <p>An error occurred while processing your payment. Please contact support.</p>
                </body>
            </html>
        `);
    }
});

// PayMongo payment failed redirect handler
app.get('/api/payments/paymongo/failed', async (req, res) => {
    const { bookingId, userEmail } = req.query || {};
    
    try {
        if (bookingId && userEmail) {
            const pool = getPool();
            
            // Get user ID
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
            if (userRows.length > 0) {
                const userId = userRows[0].iduser;
                
                // Update payment status to failed
                await pool.query(
                    `UPDATE payment 
                     SET p_status = 'failed'
                     WHERE p_booking_id = ? 
                     AND p_user_id = ? 
                     AND p_status IN ('pending', 'processing')`,
                    [parseInt(bookingId), userId]
                );
                
                console.log('Payment marked as failed for booking:', bookingId);
            }
        }
    } catch (err) {
        console.error('Payment failed handler error:', err);
    }
    
    // Redirect to user homepage (configurable via environment variable)
    const homepageUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    
    // Set headers to allow popup communication
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    
    // Return failed page with redirect
    return res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Payment Failed</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="refresh" content="3;url=${homepageUrl}">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        text-align: center;
                        max-width: 400px;
                    }
                    .error-icon {
                        font-size: 64px;
                        color: #ef4444;
                        margin-bottom: 20px;
                    }
                    h1 {
                        color: #ef4444;
                        margin-bottom: 10px;
                    }
                    p {
                        color: #666;
                        margin-bottom: 30px;
                    }
                    .loading {
                        color: #ef4444;
                        font-size: 14px;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">âœ•</div>
                    <h1>Payment Failed</h1>
                    <p>Your payment could not be processed.</p>
                    <p>Please try again or contact support if the problem persists.</p>
                    <p class="loading">Redirecting to homepage...</p>
                </div>
                <script>
                    // Redirect after 2 seconds
                    setTimeout(() => {
                        window.location.href = '${homepageUrl}';
                    }, 2000);
                    
                    // Also try to notify parent window if opened in popup
                    try {
                        if (window.opener && !window.opener.closed) {
                            window.opener.postMessage({ type: 'payment-failed', bookingId: '${bookingId}' }, '*');
                            setTimeout(() => {
                                if (!window.opener.closed) {
                                    window.close();
                                }
                            }, 500);
                        }
                    } catch (e) {
                        // Ignore COOP errors - just redirect
                        console.log('Popup communication blocked, redirecting normally');
                    }
                </script>
            </body>
        </html>
    `);
});

// Mark payment as completed (can be called manually or via webhook)
app.post('/api/bookings/:bookingId/payment/complete', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const { userEmail } = req.body || {};
    
    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }
    
    if (isNaN(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }
    
    try {
        const pool = getPool();
        
        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;
        
        // Verify booking exists and belongs to user
        const [bookingRows] = await pool.query(
            'SELECT idbooking FROM booking WHERE idbooking = ? AND b_client_id = ?',
            [bookingId, userId]
        );
        
        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        
        // Update payment status to completed
        const [updateResult] = await pool.query(
            `UPDATE payment 
             SET p_status = 'completed', 
                 p_paid_at = NOW()
             WHERE p_booking_id = ? 
             AND p_user_id = ? 
             AND p_status IN ('pending', 'processing')`,
            [bookingId, userId]
        );
        
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ 
                ok: false, 
                error: 'No pending payment found for this booking' 
            });
        }
        
        console.log('Payment marked as completed for booking:', bookingId);
        
        return res.json({
            ok: true,
            message: 'Payment marked as completed',
            bookingId: bookingId
        });
    } catch (err) {
        console.error('Mark payment complete failed:', err.code, err.message);
        return res.status(500).json({ 
            ok: false, 
            error: err.message || 'Database error'
        });
    }
});

// Get provider's bookings (bookings for services owned by the provider)
// Get provider bookings with client details
app.get('/api/provider/bookings', async (req, res) => {
    const providerId = req.query.providerId; // Firebase UID
    const providerEmail = req.query.providerEmail;
    
    if (!providerId && !providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider ID or email is required' });
    }
    
    try {
        const pool = getPool();
        
        // Get provider's database user ID
        let userId;
        if (providerEmail) {
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
            if (userRows.length === 0) {
                return res.json({ ok: true, rows: [] });
            }
            userId = userRows[0].iduser;
        } else if (providerId) {
            // If providerId is a Firebase UID, we need to find by email or create a mapping
            // For now, let's try to find by email if the UID format matches
            // Otherwise, we'll need to store Firebase UID in the user table
            // Let's use a workaround: check if providerId looks like an email
            if (providerId.includes('@')) {
                const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerId]);
                if (userRows.length === 0) {
                    return res.json({ ok: true, rows: [] });
                }
                userId = userRows[0].iduser;
            } else {
                // If it's a Firebase UID, we need to get the email from the user object
                // For now, return empty - we'll need to add Firebase UID to user table or use email
                return res.json({ ok: true, rows: [] });
            }
        }
        
        // Get bookings for services owned by this provider with payment information and client details
        const [rows] = await pool.query(`
            SELECT DISTINCT
                b.idbooking,
                b.b_event_name,
                b.b_event_date,
                b.b_start_time,
                b.b_end_time,
                b.b_location,
                b.b_total_cost,
                b.b_status,
                b.b_created_at,
                CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                u.u_email as client_email,
                u.u_phone as client_phone,
                CONCAT(
                    COALESCE(u.u_address, ''), 
                    CASE WHEN u.u_address IS NOT NULL AND u.u_address != '' AND u.u_city IS NOT NULL AND u.u_city != '' THEN ', ' ELSE '' END,
                    COALESCE(u.u_city, ''),
                    CASE WHEN u.u_city IS NOT NULL AND u.u_city != '' AND u.u_state IS NOT NULL AND u.u_state != '' THEN ', ' ELSE '' END,
                    COALESCE(u.u_state, ''),
                    CASE WHEN u.u_zip_code IS NOT NULL AND u.u_zip_code != '' THEN ' ' ELSE '' END,
                    COALESCE(u.u_zip_code, '')
                ) as client_address,
                GROUP_CONCAT(DISTINCT s.s_name SEPARATOR ', ') as service_name,
                MAX(CASE WHEN p.p_payment_method = 'Cash on Hand' AND p.p_status = 'pending' THEN p.p_payment_method ELSE NULL END) as payment_method,
                MAX(CASE WHEN p.p_payment_method = 'Cash on Hand' AND p.p_status = 'pending' THEN p.p_status ELSE NULL END) as payment_status,
                MAX(CASE 
                    WHEN p.p_payment_method = 'Cash on Hand' AND p.p_status = 'pending' THEN 1
                    ELSE 0
                END) as has_pending_cash_payment,
                MAX(CASE WHEN p.p_status = 'completed' THEN 1 ELSE 0 END) as is_paid
            FROM booking b
            INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            LEFT JOIN user u ON b.b_client_id = u.iduser
            LEFT JOIN payment p ON b.idbooking = p.p_booking_id
            WHERE s.s_provider_id = ?
            GROUP BY b.idbooking, b.b_event_name, b.b_event_date, b.b_start_time, b.b_end_time, 
                     b.b_location, b.b_total_cost, b.b_status, b.b_created_at, 
                     u.u_fname, u.u_lname, u.u_email, u.u_phone, u.u_address, u.u_city, u.u_state, u.u_zip_code
            ORDER BY b.b_event_date DESC, b.b_created_at DESC
        `, [userId]);
        
        // Process rows: if status is 'completed' but not paid, change to 'cancelled'
        const processedRows = rows.map(row => {
            if (row.b_status === 'completed' && row.is_paid !== 1) {
                // Update in database
                pool.query('UPDATE booking SET b_status = ? WHERE idbooking = ?', ['cancelled', row.idbooking]).catch(err => {
                    console.error('Error updating booking status:', err);
                });
                return {
                    ...row,
                    b_status: 'cancelled'
                };
            }
            return row;
        });
        
        return res.json({ ok: true, rows: processedRows });
    } catch (err) {
        console.error('Get provider bookings failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Mark cash payment as paid (for providers)
app.post('/api/provider/bookings/:bookingId/mark-payment-paid', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const { providerEmail } = req.body || {};
    
    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }
    
    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }
    
    try {
        const pool = getPool();
        
        // Get provider's database user ID
        const [providerRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
        if (providerRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }
        const providerId = providerRows[0].iduser;
        
        // Verify that this booking belongs to a service owned by this provider
        const [bookingRows] = await pool.query(`
            SELECT b.idbooking
            FROM booking b
            INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            WHERE b.idbooking = ? AND s.s_provider_id = ?
            LIMIT 1
        `, [bookingId, providerId]);
        
        if (bookingRows.length === 0) {
            return res.status(403).json({ ok: false, error: 'You can only mark payments for your own bookings' });
        }
        
        // Update cash payment status to completed
        const [updateResult] = await pool.query(
            `UPDATE payment 
             SET p_status = 'completed', 
                 p_paid_at = NOW()
             WHERE p_booking_id = ? 
             AND p_payment_method = 'Cash on Hand'
             AND p_status = 'pending'`,
            [bookingId]
        );
        
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ 
                ok: false, 
                error: 'No pending cash payment found for this booking' 
            });
        }
        
        console.log(`âœ“ Cash payment marked as paid for booking ${bookingId} by provider ${providerEmail}`);
        
        // Get payment details for invoice
        const [paymentRows] = await pool.query(
            'SELECT p_payment_method, p_status, p_paid_at, p_transaction_id FROM payment WHERE p_booking_id = ? AND p_status = "completed" ORDER BY p_paid_at DESC LIMIT 1',
            [bookingId]
        );
        
        return res.json({
            ok: true,
            message: 'Payment marked as paid successfully',
            payment: paymentRows.length > 0 ? paymentRows[0] : null
        });
    } catch (err) {
        console.error('Mark payment as paid failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Generate and download invoice PDF
app.get('/api/provider/bookings/:bookingId/invoice', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const providerEmail = req.query.providerEmail;
    
    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }
    
    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }
    
    try {
        const pool = getPool();
        
        // Get provider's database user ID
        const [providerRows] = await pool.query('SELECT iduser, u_fname, u_lname, u_email, u_address, u_city, u_state FROM `user` WHERE u_email = ?', [providerEmail]);
        if (providerRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }
        const provider = providerRows[0];
        
        // Get booking details
        const [bookingRows] = await pool.query(`
            SELECT b.*, 
                   CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                   u.u_email as client_email,
                   u.u_address as client_address,
                   u.u_city as client_city,
                   u.u_state as client_state
            FROM booking b
            LEFT JOIN user u ON b.b_client_id = u.iduser
            WHERE b.idbooking = ?
        `, [bookingId]);
        
        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        
        const booking = bookingRows[0];
        
        // Verify booking belongs to provider
        const [serviceRows] = await pool.query(`
            SELECT s.idservice
            FROM booking_service bs
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            WHERE bs.bs_booking_id = ? AND s.s_provider_id = ?
            LIMIT 1
        `, [bookingId, provider.iduser]);
        
        if (serviceRows.length === 0) {
            return res.status(403).json({ ok: false, error: 'You can only generate invoices for your own bookings' });
        }
        
        // Get services
        const [services] = await pool.query(`
            SELECT s.s_name as name,
                   bs.bs_quantity as quantity,
                   bs.bs_unit_price as unitPrice,
                   bs.bs_total_price as totalPrice
            FROM booking_service bs
            LEFT JOIN service s ON bs.bs_service_id = s.idservice
            WHERE bs.bs_booking_id = ?
        `, [bookingId]);
        
        // Get payment information
        const [paymentRows] = await pool.query(
            'SELECT p_payment_method, p_status, p_paid_at, p_transaction_id FROM payment WHERE p_booking_id = ? AND p_status = "completed" ORDER BY p_paid_at DESC LIMIT 1',
            [bookingId]
        );
        
        if (paymentRows.length === 0) {
            return res.status(400).json({ ok: false, error: 'No completed payment found for this booking' });
        }
        
        const payment = paymentRows[0];
        
        // Format dates
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        };
        
        const formatTime = (timeStr) => {
            if (!timeStr) return '';
            const time = timeStr.toString().slice(0, 5);
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        };
        
        // Prepare invoice data
        const invoiceData = {
            booking: {
                id: booking.idbooking,
                eventName: booking.b_event_name,
                date: formatDate(booking.b_event_date),
                time: `${formatTime(booking.b_start_time)} - ${formatTime(booking.b_end_time)}`,
                location: booking.b_location,
                totalCost: parseFloat(booking.b_total_cost) || 0
            },
            client: {
                name: booking.client_name || 'Client',
                email: booking.client_email || '',
                address: [booking.client_address, booking.client_city, booking.client_state].filter(Boolean).join(', ') || ''
            },
            provider: {
                name: `${provider.u_fname} ${provider.u_lname}`.trim() || 'Service Provider',
                email: provider.u_email || '',
                address: [provider.u_address, provider.u_city, provider.u_state].filter(Boolean).join(', ') || ''
            },
            payment: {
                method: payment.p_payment_method || 'Cash on Hand',
                status: payment.p_status || 'completed',
                paidAt: formatDate(payment.p_paid_at),
                transactionId: payment.p_transaction_id || ''
            },
            services: services.map(s => ({
                name: s.name || 'Service',
                quantity: s.quantity || 1,
                unitPrice: parseFloat(s.unitPrice) || 0,
                totalPrice: parseFloat(s.totalPrice) || 0
            }))
        };
        
        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);
        
        // Set response headers
        const invoiceNumber = `INV-${bookingId}-${Date.now()}`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send PDF
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Generate invoice failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Failed to generate invoice: ' + err.message });
    }
});

// Generate and download invoice PDF for user
app.get('/api/user/bookings/:bookingId/invoice', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const userEmail = req.query.userEmail;
    
    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }
    
    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }
    
    try {
        const pool = getPool();
        
        // Get user's database user ID
        const [userRows] = await pool.query('SELECT iduser, u_fname, u_lname, u_email, u_address, u_city, u_state FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const user = userRows[0];
        
        // Get booking details
        const [bookingRows] = await pool.query(`
            SELECT b.*
            FROM booking b
            WHERE b.idbooking = ? AND b.b_client_id = ?
        `, [bookingId, user.iduser]);
        
        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found or does not belong to you' });
        }
        
        const booking = bookingRows[0];
        
        // Get provider information from the booking's services
        const [providerRows] = await pool.query(`
            SELECT DISTINCT u.u_fname, u.u_lname, u.u_email, u.u_address, u.u_city, u.u_state
            FROM booking_service bs
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            INNER JOIN user u ON s.s_provider_id = u.iduser
            WHERE bs.bs_booking_id = ?
            LIMIT 1
        `, [bookingId]);
        
        const provider = providerRows.length > 0 ? providerRows[0] : {
            u_fname: 'Service',
            u_lname: 'Provider',
            u_email: '',
            u_address: '',
            u_city: '',
            u_state: ''
        };
        
        // Get services
        const [services] = await pool.query(`
            SELECT s.s_name as name,
                   bs.bs_quantity as quantity,
                   bs.bs_unit_price as unitPrice,
                   bs.bs_total_price as totalPrice
            FROM booking_service bs
            LEFT JOIN service s ON bs.bs_service_id = s.idservice
            WHERE bs.bs_booking_id = ?
        `, [bookingId]);
        
        // Get payment information
        const [paymentRows] = await pool.query(
            'SELECT p_payment_method, p_status, p_paid_at, p_transaction_id FROM payment WHERE p_booking_id = ? AND p_status = "completed" ORDER BY p_paid_at DESC LIMIT 1',
            [bookingId]
        );
        
        if (paymentRows.length === 0) {
            return res.status(400).json({ ok: false, error: 'No completed payment found for this booking' });
        }
        
        const payment = paymentRows[0];
        
        // Format dates
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        };
        
        const formatTime = (timeStr) => {
            if (!timeStr) return '';
            const time = timeStr.toString().slice(0, 5);
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        };
        
        // Prepare invoice data
        const invoiceData = {
            booking: {
                id: booking.idbooking,
                eventName: booking.b_event_name,
                date: formatDate(booking.b_event_date),
                time: `${formatTime(booking.b_start_time)} - ${formatTime(booking.b_end_time)}`,
                location: booking.b_location,
                totalCost: parseFloat(booking.b_total_cost) || 0
            },
            client: {
                name: `${user.u_fname} ${user.u_lname}`.trim() || 'Client',
                email: user.u_email || '',
                address: [user.u_address, user.u_city, user.u_state].filter(Boolean).join(', ') || ''
            },
            provider: {
                name: `${provider.u_fname} ${provider.u_lname}`.trim() || 'Service Provider',
                email: provider.u_email || '',
                address: [provider.u_address, provider.u_city, provider.u_state].filter(Boolean).join(', ') || ''
            },
            payment: {
                method: payment.p_payment_method || 'Cash on Hand',
                status: payment.p_status || 'completed',
                paidAt: formatDate(payment.p_paid_at),
                transactionId: payment.p_transaction_id || ''
            },
            services: services.map(s => ({
                name: s.name || 'Service',
                quantity: s.quantity || 1,
                unitPrice: parseFloat(s.unitPrice) || 0,
                totalPrice: parseFloat(s.totalPrice) || 0
            }))
        };
        
        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);
        
        // Set response headers
        const invoiceNumber = `INV-${bookingId}-${Date.now()}`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send PDF
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Generate user invoice failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Failed to generate invoice: ' + err.message });
    }
});

// Get booking by ID
app.get('/api/bookings/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT b.*, 
                   CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                   u.u_email as client_email
            FROM booking b
            LEFT JOIN user u ON b.b_client_id = u.iduser
            WHERE b.idbooking = ?
        `, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        const booking = rows[0];
        
        // Get services for booking
        const [services] = await pool.query(`
            SELECT s.s_name, bs.bs_quantity, bs.bs_unit_price, bs.bs_total_price
            FROM booking_service bs
            LEFT JOIN service s ON bs.bs_service_id = s.idservice
            WHERE bs.bs_booking_id = ?
        `, [id]);
        booking.services = services;
        
        return res.json({ ok: true, booking });
    } catch (err) {
        console.error('Get booking failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
    const { clientEmail, serviceId, eventName, eventDate, startTime, endTime, location, attendees, notes } = req.body || {};
    
    if (!clientEmail || !serviceId || !eventName || !eventDate || !startTime || !endTime || !location) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    
    try {
        const pool = getPool();
        
        // Get client user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [clientEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const clientId = userRows[0].iduser;
        
        // Parse date range from notes if it's a multi-day booking
        let dateRangeInfo = null;
        let checkDates = [eventDate];
        
        if (notes) {
            try {
                dateRangeInfo = JSON.parse(notes);
                if (dateRangeInfo.startDate && dateRangeInfo.endDate && dateRangeInfo.allDates) {
                    // For multi-day bookings, check all dates in the range
                    checkDates = dateRangeInfo.allDates;
                    console.log(`Multi-day booking detected: ${dateRangeInfo.startDate} to ${dateRangeInfo.endDate} (${checkDates.length} days)`);
                }
            } catch (e) {
                // Notes is not JSON, treat as regular notes
            }
        }
        
        // Check for overlapping bookings for all dates in the range
        for (const checkDate of checkDates) {
        const [overlappingBookings] = await pool.query(
            `SELECT b.b_start_time, b.b_end_time, b.b_event_name, b.b_status
             FROM booking b
             INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
             WHERE bs.bs_service_id = ?
             AND b.b_event_date = ?
             AND b.b_status IN ('pending', 'confirmed')
             AND (
                 (b.b_start_time < ? AND b.b_end_time > ?) OR
                 (b.b_start_time < ? AND b.b_end_time > ?) OR
                     (b.b_start_time >= ? AND b.b_end_time <= ?) OR
                     (b.b_start_time = '00:00:00' AND b.b_end_time = '23:59:59' AND ? = '00:00:00' AND ? = '23:59:59')
             )`,
                [serviceId, checkDate, endTime, startTime, startTime, endTime, startTime, endTime, startTime, endTime]
        );
        
        if (overlappingBookings.length > 0) {
            const conflict = overlappingBookings[0];
            const conflictStart = conflict.b_start_time.toString().slice(0, 5);
            const conflictEnd = conflict.b_end_time.toString().slice(0, 5);
                const conflictDate = new Date(checkDate).toLocaleDateString();
                console.log(`Overlap detected for service ${serviceId} on ${checkDate}: ${conflictStart} - ${conflictEnd}`);
            return res.status(409).json({ 
                ok: false, 
                    error: `This time slot overlaps with an existing booking on ${conflictDate} (${conflictStart} - ${conflictEnd}). Please select a different time.`,
                conflict: {
                    start: conflict.b_start_time,
                    end: conflict.b_end_time,
                        eventName: conflict.b_event_name,
                        date: checkDate
                }
            });
            }
        }
        
        console.log(`No overlap detected for service ${serviceId} on date range: ${checkDates.join(', ')} (${startTime} - ${endTime})`);
        
        // Get service details for pricing and provider info
        const [serviceRows] = await pool.query(`
            SELECT s.s_base_price, s.s_duration, s.s_category, s.s_provider_id, s.s_name,
                   u.iduser as provider_user_id, u.u_email as provider_email, u.u_fname as provider_fname, u.u_lname as provider_lname
            FROM service s
            LEFT JOIN user u ON s.s_provider_id = u.iduser
            WHERE s.idservice = ?
        `, [serviceId]);
        if (serviceRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Service not found' });
        }
        const basePrice = parseFloat(serviceRows[0].s_base_price) || 0;
        const serviceDuration = parseInt(serviceRows[0].s_duration) || 60; // Default to 60 minutes
        const serviceCategory = serviceRows[0].s_category || '';
        const providerUserId = serviceRows[0].provider_user_id;
        const providerEmail = serviceRows[0].provider_email;
        const providerName = `${serviceRows[0].provider_fname || ''} ${serviceRows[0].provider_lname || ''}`.trim() || 'Provider';
        const serviceName = serviceRows[0].s_name || 'Service';
        
        let calculatedCost = 0;
        
        // For catering services, calculate based on attendees (per pax)
        if (serviceCategory.toLowerCase() === 'catering') {
            const numAttendees = parseInt(attendees) || 1;
            calculatedCost = basePrice * numAttendees;
        } else {
            const MINUTES_PER_DAY = 1440; // 24 hours * 60 minutes
            
            // If we have date range info (multi-day booking), use it for calculation
            if (dateRangeInfo && dateRangeInfo.totalDays) {
                // For multi-day bookings, calculate based on number of days in the range
                calculatedCost = basePrice * dateRangeInfo.totalDays;
                console.log(`Multi-day booking cost: ${basePrice} * ${dateRangeInfo.totalDays} = ${calculatedCost}`);
            } else if (serviceDuration >= MINUTES_PER_DAY) {
                // If service is per day (1440 minutes = 24 hours) but no dateRangeInfo, calculate based on time duration
                // Calculate duration from start and end time
                const startParts = startTime.split(':').map(Number);
                const endParts = endTime.split(':').map(Number);
                const startMinutes = startParts[0] * 60 + startParts[1];
                const endMinutes = endParts[0] * 60 + endParts[1];
                const selectedDurationMinutes = endMinutes - startMinutes;
                
                // Calculate how many days the selected duration covers
                const selectedDays = Math.ceil(selectedDurationMinutes / MINUTES_PER_DAY);
                // Each day is 1 unit of the base price
                calculatedCost = basePrice * selectedDays;
                console.log(`Per-day booking cost: ${basePrice} * ${selectedDays} = ${calculatedCost} (duration: ${selectedDurationMinutes} minutes)`);
            } else {
                // For hourly or shorter services, calculate based on duration ratio
                // Calculate duration from start and end time
                const startParts = startTime.split(':').map(Number);
                const endParts = endTime.split(':').map(Number);
                const startMinutes = startParts[0] * 60 + startParts[1];
                const endMinutes = endParts[0] * 60 + endParts[1];
                const selectedDurationMinutes = endMinutes - startMinutes;
                
                // Calculate cost: (selected_duration_minutes / service_duration_minutes) * base_price
                // Example: If service is 60 minutes and user selects 9 hours (540 minutes)
                // Cost = (540 / 60) * price = 9 * price
                calculatedCost = (selectedDurationMinutes / serviceDuration) * basePrice;
                console.log(`Hourly booking cost: (${selectedDurationMinutes} / ${serviceDuration}) * ${basePrice} = ${calculatedCost}`);
            }
        }
        
        // Create booking
        const [result] = await pool.query(
            `INSERT INTO booking 
             (b_client_id, b_event_name, b_event_date, b_start_time, b_end_time, b_location, b_total_cost, b_attendees, b_notes, b_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [clientId, eventName, eventDate, startTime, endTime, location, calculatedCost, attendees || null, notes || null]
        );
        
        const bookingId = result.insertId;
        
        // Link service to booking
        await pool.query(
            `INSERT INTO booking_service 
             (bs_booking_id, bs_service_id, bs_quantity, bs_unit_price, bs_total_price)
             VALUES (?, ?, 1, ?, ?)`,
            [bookingId, serviceId, basePrice, calculatedCost]
        );
        
        // Create notification for provider about new booking
        if (providerUserId) {
            try {
                // Ensure notification table exists
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS \`notification\` (
                        \`idnotification\` INT(11) NOT NULL AUTO_INCREMENT,
                        \`n_user_id\` INT(11) NOT NULL,
                        \`n_title\` VARCHAR(255) NOT NULL,
                        \`n_message\` TEXT NOT NULL,
                        \`n_type\` VARCHAR(50) NOT NULL DEFAULT 'info',
                        \`n_is_read\` TINYINT(1) NOT NULL DEFAULT 0,
                        \`n_created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (\`idnotification\`),
                        INDEX \`idx_user\` (\`n_user_id\`),
                        INDEX \`idx_read\` (\`n_is_read\`),
                        INDEX \`idx_created\` (\`n_created_at\`),
                        FOREIGN KEY (\`n_user_id\`) REFERENCES \`user\`(\`iduser\`) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                `);
                
                // Get client name for notification
                const [clientRows] = await pool.query(
                    'SELECT CONCAT(u_fname, " ", u_lname) as client_name FROM `user` WHERE iduser = ?',
                    [clientId]
                );
                const clientName = clientRows.length > 0 ? clientRows[0].client_name : 'A client';
                
                const formattedDate = new Date(eventDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                const formattedStartTime = new Date(`2000-01-01T${startTime}`).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hour12: true 
                });
                const formattedEndTime = new Date(`2000-01-01T${endTime}`).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hour12: true 
                });
                
                const notificationTitle = 'New Booking Received';
                const notificationMessage = `${clientName} has booked "${serviceName}" for ${formattedDate} from ${formattedStartTime} to ${formattedEndTime}.\n\nEvent: ${eventName}\nLocation: ${location}${attendees ? `\nAttendees: ${attendees}` : ''}`;
                
                // Create notification entry
                await pool.query(
                    'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                    [
                        providerUserId,
                        notificationTitle,
                        notificationMessage,
                        'new_booking',
                        0
                    ]
                );
                
                console.log(`âœ… Notification created for provider user ID ${providerUserId}`);
                
                // Send push notification to provider
                try {
                    if (global.sendPushNotification && providerEmail) {
                        await global.sendPushNotification(
                            providerEmail,
                            notificationTitle,
                            `${clientName} booked "${serviceName}" for ${formattedDate}`,
                            {
                                type: 'new_booking',
                                bookingId: bookingId.toString(),
                                serviceId: serviceId.toString(),
                            }
                        );
                        console.log(`âœ… Push notification sent to provider ${providerEmail}`);
                    }
                } catch (pushErr) {
                    console.error('âš ï¸ Failed to send push notification to provider (non-critical):', pushErr);
                }
            } catch (notifErr) {
                console.error('âš ï¸ Failed to create notification for provider (non-critical):', notifErr);
            }
        }
        
        return res.json({ ok: true, id: bookingId, message: 'Booking created successfully' });
    } catch (err) {
        console.error('Create booking failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// ============================================
// SERVICE RATINGS API ENDPOINTS
// ============================================

// Submit a rating for a service in a completed booking
app.post('/api/bookings/:bookingId/services/:serviceId/rate', async (req, res) => {
    const bookingId = Number(req.params.bookingId);
    const serviceId = Number(req.params.serviceId);
    const { userEmail, rating, comment } = req.body || {};
    
    if (!Number.isFinite(bookingId) || !Number.isFinite(serviceId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking or service ID' });
    }
    
    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }
    
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ ok: false, error: 'Rating must be between 1 and 5' });
    }
    
    try {
        const pool = getPool();
        
        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;
        
        // Verify booking exists and is completed, and belongs to this user
        const [bookingRows] = await pool.query(
            'SELECT b_client_id, b_status FROM booking WHERE idbooking = ?',
            [bookingId]
        );
        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        const booking = bookingRows[0];
        
        if (booking.b_client_id !== userId) {
            return res.status(403).json({ ok: false, error: 'You can only rate services for your own bookings' });
        }
        
        if (booking.b_status !== 'completed') {
            return res.status(400).json({ ok: false, error: 'You can only rate services for completed bookings' });
        }
        
        // Verify service is part of this booking
        const [serviceRows] = await pool.query(
            'SELECT bs_service_id FROM booking_service WHERE bs_booking_id = ? AND bs_service_id = ?',
            [bookingId, serviceId]
        );
        if (serviceRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Service not found in this booking' });
        }
        
        // Check if user has already rated this service for this booking
        const [existingRating] = await pool.query(
            'SELECT idreview FROM service_review WHERE sr_booking_id = ? AND sr_service_id = ? AND sr_user_id = ?',
            [bookingId, serviceId, userId]
        );
        
        if (existingRating.length > 0) {
            // Update existing rating
            await pool.query(
                'UPDATE service_review SET sr_rating = ?, sr_comment = ?, sr_updated_at = NOW() WHERE idreview = ?',
                [rating, comment || null, existingRating[0].idreview]
            );
        } else {
            // Create new rating
            await pool.query(
                'INSERT INTO service_review (sr_service_id, sr_booking_id, sr_user_id, sr_rating, sr_comment) VALUES (?, ?, ?, ?, ?)',
                [serviceId, bookingId, userId, rating, comment || null]
            );
        }
        
        // Update service average rating and review count
        const [ratingStats] = await pool.query(`
            SELECT AVG(sr_rating) as avg_rating, COUNT(*) as review_count
            FROM service_review
            WHERE sr_service_id = ?
        `, [serviceId]);
        
        if (ratingStats.length > 0) {
            const avgRating = parseFloat(ratingStats[0].avg_rating) || 0;
            const reviewCount = parseInt(ratingStats[0].review_count) || 0;
            
            await pool.query(
                'UPDATE service SET s_rating = ?, s_review_count = ? WHERE idservice = ?',
                [avgRating, reviewCount, serviceId]
            );
        }
        
        return res.json({ ok: true, message: 'Rating submitted successfully' });
    } catch (err) {
        console.error('Submit rating failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get rating for a service in a booking
app.get('/api/bookings/:bookingId/services/:serviceId/rating', async (req, res) => {
    const bookingId = Number(req.params.bookingId);
    const serviceId = Number(req.params.serviceId);
    const userEmail = req.query.email;
    
    if (!Number.isFinite(bookingId) || !Number.isFinite(serviceId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking or service ID' });
    }
    
    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }
    
    try {
        const pool = getPool();
        
        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.json({ ok: true, rating: null });
        }
        const userId = userRows[0].iduser;
        
        // Get rating
        const [ratingRows] = await pool.query(
            'SELECT sr_rating, sr_comment, sr_created_at, sr_updated_at FROM service_review WHERE sr_booking_id = ? AND sr_service_id = ? AND sr_user_id = ?',
            [bookingId, serviceId, userId]
        );
        
        if (ratingRows.length === 0) {
            return res.json({ ok: true, rating: null });
        }
        
        return res.json({ ok: true, rating: {
            rating: ratingRows[0].sr_rating,
            comment: ratingRows[0].sr_comment,
            createdAt: ratingRows[0].sr_created_at,
            updatedAt: ratingRows[0].sr_updated_at
        }});
    } catch (err) {
        console.error('Get rating failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get all reviews for a service
// Service reviews route moved to ./routes/services.js

// Update booking status
app.post('/api/bookings/:id/status', async (req, res) => {
    const id = Number(req.params.id);
    const { status, userEmail, cancellation_reason } = req.body || {};
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!Number.isFinite(id) || !validStatuses.includes(status)) {
        return res.status(400).json({ ok: false, error: 'Invalid parameters' });
    }
    try {
        const pool = getPool();
        
        // If userEmail is provided, verify the booking belongs to the user
        if (userEmail) {
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
            if (userRows.length === 0) {
                return res.status(404).json({ ok: false, error: 'User not found' });
            }
            const userId = userRows[0].iduser;
            
            const [bookingRows] = await pool.query(
                'SELECT idbooking FROM booking WHERE idbooking = ? AND b_client_id = ?',
                [id, userId]
            );
            if (bookingRows.length === 0) {
                return res.status(403).json({ ok: false, error: 'You do not have permission to update this booking' });
            }
        }
        
        // If status is 'completed', check if booking is paid
        // If not paid, automatically set status to 'cancelled'
        let finalStatus = status;
        if (status === 'completed') {
            const [paymentRows] = await pool.query(
                'SELECT p_status FROM payment WHERE p_booking_id = ? AND p_status = ? LIMIT 1',
                [id, 'completed']
            );
            // Check if there's a completed payment
            if (paymentRows.length === 0) {
                // No completed payment found, check is_paid flag in booking
                const [bookingCheck] = await pool.query(
                    'SELECT is_paid FROM booking WHERE idbooking = ?',
                    [id]
                );
                if (bookingCheck.length > 0 && bookingCheck[0].is_paid !== 1) {
                    // Not paid, change to cancelled
                    finalStatus = 'cancelled';
                    console.log(`Booking ${id} is completed but not paid, changing status to cancelled`);
                }
            }
        }
        
        // Update booking status and store cancellation reason if provided
        if (finalStatus === 'cancelled' && cancellation_reason) {
            // Store cancellation reason in b_notes
            await pool.query('UPDATE booking SET b_status = ?, b_notes = ? WHERE idbooking = ?', 
                [finalStatus, cancellation_reason, id]);
        } else {
        await pool.query('UPDATE booking SET b_status = ? WHERE idbooking = ?', [finalStatus, id]);
        }
        
        // Get booking details and send push notifications
        const [bookingDetails] = await pool.query(`
            SELECT b.b_event_name, b.b_client_id, b.b_event_date,
                   CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                   u.u_email as client_email,
                   u.iduser as client_user_id,
                   s.s_provider_id,
                   CONCAT(p.u_fname, ' ', p.u_lname) as provider_name,
                   p.u_email as provider_email,
                   p.iduser as provider_user_id
            FROM booking b
            INNER JOIN user u ON b.b_client_id = u.iduser
            INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            INNER JOIN user p ON s.s_provider_id = p.iduser
            WHERE b.idbooking = ?
            LIMIT 1
        `, [id]);
        
        if (bookingDetails.length > 0) {
            const booking = bookingDetails[0];
            
            // Ensure notification table exists
            await pool.query(`
                CREATE TABLE IF NOT EXISTS \`notification\` (
                    \`idnotification\` INT(11) NOT NULL AUTO_INCREMENT,
                    \`n_user_id\` INT(11) NOT NULL,
                    \`n_title\` VARCHAR(255) NOT NULL,
                    \`n_message\` TEXT NOT NULL,
                    \`n_type\` VARCHAR(50) NOT NULL DEFAULT 'info',
                    \`n_is_read\` TINYINT(1) NOT NULL DEFAULT 0,
                    \`n_created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (\`idnotification\`),
                    INDEX \`idx_user\` (\`n_user_id\`),
                    INDEX \`idx_read\` (\`n_is_read\`),
                    INDEX \`idx_created\` (\`n_created_at\`),
                    FOREIGN KEY (\`n_user_id\`) REFERENCES \`user\`(\`iduser\`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            
            if (finalStatus === 'cancelled') {
                // Create cancellation message with reason
                const cancellationMessage = cancellation_reason 
                    ? `Your booking "${booking.b_event_name}" has been cancelled.\n\nReason: ${cancellation_reason}`
                    : `Your booking "${booking.b_event_name}" has been cancelled.`;
                
                const providerCancellationMessage = cancellation_reason
                    ? `${booking.client_name}'s booking "${booking.b_event_name}" has been cancelled.\n\nReason: ${cancellation_reason}`
                    : `${booking.client_name}'s booking "${booking.b_event_name}" has been cancelled.`;
                
                // Create database notification for client
                if (booking.client_user_id) {
                    try {
                        await pool.query(
                            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                            [
                                booking.client_user_id,
                                'Booking Cancelled',
                                cancellationMessage,
                                'booking_cancelled',
                                0
                            ]
                        );
                        console.log(`âœ… Notification created for client user ID ${booking.client_user_id}`);
                    } catch (notifErr) {
                        console.error('âš ï¸ Failed to create notification for client (non-critical):', notifErr);
                    }
                }
                
                // Create database notification for provider
                if (booking.provider_user_id && booking.provider_user_id !== booking.client_user_id) {
                    try {
                        await pool.query(
                            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                            [
                                booking.provider_user_id,
                                'Booking Cancelled',
                                providerCancellationMessage,
                                'booking_cancelled',
                                0
                            ]
                        );
                        console.log(`âœ… Notification created for provider user ID ${booking.provider_user_id}`);
                    } catch (notifErr) {
                        console.error('âš ï¸ Failed to create notification for provider (non-critical):', notifErr);
                    }
                }
                
                // Send push notifications
                if (booking.client_email) {
                    sendPushNotification(
                        booking.client_email,
                        'Booking Cancelled',
                        cancellationMessage,
                        {
                            type: 'booking_cancelled',
                            bookingId: id.toString(),
                            status: 'cancelled',
                        }
                    ).catch(err => console.error('Failed to send push notification to client:', err));
                }
                
                if (booking.provider_email && booking.provider_email !== booking.client_email) {
                    sendPushNotification(
                        booking.provider_email,
                        'Booking Cancelled',
                        providerCancellationMessage,
                        {
                            type: 'booking_cancelled',
                            bookingId: id.toString(),
                            status: 'cancelled',
                        }
                    ).catch(err => console.error('Failed to send push notification to provider:', err));
                }
            } else if (finalStatus === 'confirmed') {
                // Create confirmation message
                const confirmationMessage = `Your booking "${booking.b_event_name}" has been confirmed!`;
                const providerConfirmationMessage = `${booking.client_name}'s booking "${booking.b_event_name}" has been confirmed.`;
                
                // Create database notification for client
                if (booking.client_user_id) {
                    try {
                        await pool.query(
                            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                            [
                                booking.client_user_id,
                                'Booking Confirmed',
                                confirmationMessage,
                                'booking_confirmed',
                                0
                            ]
                        );
                        console.log(`âœ… Notification created for client user ID ${booking.client_user_id}`);
                    } catch (notifErr) {
                        console.error('âš ï¸ Failed to create notification for client (non-critical):', notifErr);
                    }
                }
                
                // Create database notification for provider
                if (booking.provider_user_id && booking.provider_user_id !== booking.client_user_id) {
                    try {
                        await pool.query(
                            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                            [
                                booking.provider_user_id,
                                'Booking Confirmed',
                                providerConfirmationMessage,
                                'booking_confirmed',
                                0
                            ]
                        );
                        console.log(`âœ… Notification created for provider user ID ${booking.provider_user_id}`);
                    } catch (notifErr) {
                        console.error('âš ï¸ Failed to create notification for provider (non-critical):', notifErr);
                    }
                }
                
                // Send push notifications
                if (booking.client_email) {
                    sendPushNotification(
                        booking.client_email,
                        'Booking Confirmed',
                        confirmationMessage,
                        {
                            type: 'booking_confirmed',
                            bookingId: id.toString(),
                            status: 'confirmed',
                        }
                    ).catch(err => console.error('Failed to send push notification to client:', err));
                }
                
                if (booking.provider_email && booking.provider_email !== booking.client_email) {
                    sendPushNotification(
                        booking.provider_email,
                        'Booking Confirmed',
                        providerConfirmationMessage,
                        {
                            type: 'booking_confirmed',
                            bookingId: id.toString(),
                            status: 'confirmed',
                        }
                    ).catch(err => console.error('Failed to send push notification to provider:', err));
                }
            } else {
                // For other statuses (completed, pending), use existing push notification logic
            const statusMessages = {
                'completed': 'Your booking has been completed.',
                'pending': 'Your booking is pending confirmation.'
            };
            
            if (booking.client_email) {
                sendPushNotification(
                    booking.client_email,
                    `Booking ${finalStatus.charAt(0).toUpperCase() + finalStatus.slice(1)}`,
                    statusMessages[finalStatus] || `Your booking status has been updated to ${finalStatus}`,
                    {
                        type: 'booking',
                        bookingId: id.toString(),
                        status: finalStatus,
                    }
                ).catch(err => console.error('Failed to send push notification to client:', err));
            }
            
            if (booking.provider_email && booking.provider_email !== booking.client_email) {
                sendPushNotification(
                    booking.provider_email,
                    `Booking ${finalStatus.charAt(0).toUpperCase() + finalStatus.slice(1)}`,
                    `${booking.client_name}'s booking has been ${finalStatus}`,
                    {
                        type: 'booking',
                        bookingId: id.toString(),
                        status: finalStatus,
                    }
                ).catch(err => console.error('Failed to send push notification to provider:', err));
                }
            }
        }
        
        return res.json({ ok: true });
    } catch (err) {
        console.error('Update booking status failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Update booking details
app.put('/api/bookings/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { userEmail, eventName, eventDate, startTime, endTime, location, attendees, notes } = req.body || {};
    
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }
    
    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }
    
    try {
        const pool = getPool();
        
        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;
        
        // Verify booking exists and belongs to user
        const [bookingRows] = await pool.query(
            'SELECT idbooking, b_status FROM booking WHERE idbooking = ? AND b_client_id = ?',
            [id, userId]
        );
        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        
        const booking = bookingRows[0];
        
        // Check if booking is paid
        const [paymentRows] = await pool.query(
            'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status = "completed"',
            [id]
        );
        if (paymentRows.length > 0) {
            return res.status(400).json({ ok: false, error: 'Cannot edit a booking that has been paid' });
        }
        
        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];
        
        if (eventName !== undefined) {
            updateFields.push('b_event_name = ?');
            updateValues.push(eventName);
        }
        if (eventDate !== undefined) {
            updateFields.push('b_event_date = ?');
            updateValues.push(eventDate);
        }
        if (startTime !== undefined) {
            updateFields.push('b_start_time = ?');
            updateValues.push(startTime);
        }
        if (endTime !== undefined) {
            updateFields.push('b_end_time = ?');
            updateValues.push(endTime);
        }
        if (location !== undefined) {
            updateFields.push('b_location = ?');
            updateValues.push(location);
        }
        if (attendees !== undefined) {
            updateFields.push('b_attendees = ?');
            updateValues.push(attendees || null);
        }
        if (notes !== undefined) {
            updateFields.push('b_notes = ?');
            updateValues.push(notes || null);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ ok: false, error: 'No fields to update' });
        }
        
        // Add updated_at
        updateFields.push('b_updated_at = NOW()');
        updateValues.push(id);
        
        // Check for overlapping bookings if date/time is being updated
        if (eventDate !== undefined || startTime !== undefined || endTime !== undefined) {
            const finalDate = eventDate || bookingRows[0].b_event_date;
            const finalStartTime = startTime || bookingRows[0].b_start_time;
            const finalEndTime = endTime || bookingRows[0].b_end_time;
            
            // Get services for this booking
            const [serviceRows] = await pool.query(
                'SELECT bs_service_id FROM booking_service WHERE bs_booking_id = ?',
                [id]
            );
            
            if (serviceRows.length > 0) {
                const serviceIds = serviceRows.map((r) => r.bs_service_id);
                
                // Check for overlapping bookings
                const [overlappingBookings] = await pool.query(`
                    SELECT b.b_start_time, b.b_end_time, b.b_event_name, b.b_status
                    FROM booking b
                    INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
                    WHERE bs.bs_service_id IN (${serviceIds.map(() => '?').join(',')})
                    AND b.idbooking != ?
                    AND b.b_event_date = ?
                    AND b.b_status IN ('pending', 'confirmed')
                    AND (
                        (b.b_start_time < ? AND b.b_end_time > ?) OR
                        (b.b_start_time < ? AND b.b_end_time > ?) OR
                        (b.b_start_time >= ? AND b.b_end_time <= ?)
                    )
                `, [...serviceIds, id, finalDate, finalStartTime, finalEndTime, finalStartTime, finalEndTime, finalStartTime, finalEndTime]);
                
                if (overlappingBookings.length > 0) {
                    const conflict = overlappingBookings[0];
                    const conflictStart = conflict.b_start_time.toString().slice(0, 5);
                    const conflictEnd = conflict.b_end_time.toString().slice(0, 5);
                    return res.status(409).json({ 
                        ok: false, 
                        error: `This time slot overlaps with an existing booking (${conflictStart} - ${conflictEnd}). Please select a different time.`,
                        conflict: {
                            start: conflict.b_start_time,
                            end: conflict.b_end_time,
                            eventName: conflict.b_event_name
                        }
                    });
                }
            }
        }
        
        const query = `UPDATE booking SET ${updateFields.join(', ')} WHERE idbooking = ?`;
        await pool.query(query, updateValues);
        
        return res.json({ ok: true, message: 'Booking updated successfully' });
    } catch (err) {
        console.error('Update booking failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});


// ============================================
// PROVIDER PAYMENT LINK API ENDPOINTS
// ============================================
// Provider payment-link and paymongo-credentials routes moved to ./routes/services.js

// Hiring, job postings, proposals, and job applications routes moved to ./routes/hiring.js

// Provider profile, search, and services routes moved to ./routes/services.js

// 404 handler for undefined routes
app.use((req, res) => {
    console.log(`âŒ 404 - Route not found: ${req.method} ${req.path}`);
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
	console.log(`âœ… API server listening on http://localhost:${PORT}`);
	console.log(`âœ… Server accessible from network on port ${PORT}`);
	console.log(`âœ… For Android emulator: http://10.0.2.2:${PORT}`);
	console.log(`âœ… For physical devices: http://YOUR_IP:${PORT}`);
	console.log(`âœ… Registered route: POST /api/users/apply-provider`);
});


