const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Uploads directory - same resolution as index.js
const uploadsDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR, 'images')
    : path.join(__dirname, '..', 'uploads', 'images');

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
        console.log('📸 Starting profile picture save for user:', userId);
        console.log('📁 Uploads directory:', uploadsDir);
        console.log('📁 __dirname:', __dirname);
        console.log('📁 Directory exists:', fs.existsSync(uploadsDir));

        // Ensure directory exists and is writable
        if (!fs.existsSync(uploadsDir)) {
            console.log('📁 Creating uploads directory:', uploadsDir);
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log('✅ Created uploads directory');
        }

        // Verify directory is writable
        try {
            fs.accessSync(uploadsDir, fs.constants.W_OK);
            console.log('✅ Uploads directory is writable');
        } catch (accessError) {
            console.error('❌ Uploads directory is NOT writable!');
            console.error('❌ Directory path:', uploadsDir);
            throw new Error(`Uploads directory is not writable: ${accessError.message}`);
        }

        // Extract image format and data
        const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            console.error('❌ Invalid base64 image format');
            throw new Error('Invalid base64 image format');
        }

        const imageFormat = matches[1]; // jpeg, png, etc.
        const imageData = matches[2]; // base64 data without prefix

        console.log('📸 Image format:', imageFormat);
        console.log('📸 Image data length:', imageData.length);

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const filename = `profile_${userId}_${timestamp}_${randomStr}.${imageFormat}`;
        const filepath = path.join(uploadsDir, filename);

        console.log('📸 Filename:', filename);
        console.log('📸 Full file path:', filepath);

        // Convert base64 to buffer and save
        const buffer = Buffer.from(imageData, 'base64');
        console.log('📸 Buffer size:', buffer.length, 'bytes');

        // Write file with explicit error handling and ensure it's flushed to disk
        try {
            console.log('📸 Attempting to write file...');
            console.log('📸 File path:', filepath);
            console.log('📸 Buffer length:', buffer.length, 'bytes');

            // Ensure parent directory exists
            const parentDir = path.dirname(filepath);
            if (!fs.existsSync(parentDir)) {
                console.log('📁 Creating parent directory:', parentDir);
                fs.mkdirSync(parentDir, { recursive: true });
                console.log('✅ Parent directory created');
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
                console.log('✅ File synced to disk');
            } catch (syncError) {
                console.warn('⚠️  Could not sync file (non-critical):', syncError.message);
                // Continue anyway - file should still be written
            }

            console.log('✅ File write operation completed');

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
                console.error('❌ File verification failed after retries');
                console.error('❌ Expected path:', filepath);
                console.error('❌ File exists:', fs.existsSync(filepath));
                if (fs.existsSync(filepath)) {
                    const actualStats = fs.statSync(filepath);
                    console.error('❌ Actual file size:', actualStats.size);
                    console.error('❌ Expected file size:', buffer.length);
                }
                throw new Error('File was not created or verified on disk');
            }

            console.log('✅ File write verified - size matches buffer:', fileStats.size, 'bytes');
        } catch (writeError) {
            console.error('❌ Write error code:', writeError.code);
            console.error('❌ Write error message:', writeError.message);
            console.error('❌ Write error path:', filepath);
            console.error('❌ Write error stack:', writeError.stack);
            throw writeError;
        }

        // Final verification - ensure file exists and is readable
        console.log('📸 Final verification - checking file exists and is readable...');
        if (!fs.existsSync(filepath)) {
            console.error('❌ CRITICAL: File does not exist after write and verification!');
            console.error('❌ File path:', filepath);
            console.error('❌ Directory exists:', fs.existsSync(path.dirname(filepath)));
            console.error('❌ Files in directory:', fs.existsSync(path.dirname(filepath)) ? fs.readdirSync(path.dirname(filepath)).slice(0, 5) : 'N/A');
            throw new Error('File was not created on disk');
        }

        // Verify file is readable and has correct size
        try {
            const finalStats = fs.statSync(filepath);
            console.log('✅ File size:', finalStats.size, 'bytes');
            console.log('✅ Expected size:', buffer.length, 'bytes');

            if (finalStats.size === 0) {
                console.error('❌ CRITICAL: File exists but is empty (0 bytes)!');
                throw new Error('File was created but is empty');
            }

            if (finalStats.size !== buffer.length) {
                console.error('❌ CRITICAL: File size mismatch in final verification!');
                console.error('❌ Expected:', buffer.length, 'bytes');
                console.error('❌ Actual:', finalStats.size, 'bytes');
                throw new Error(`File size mismatch: expected ${buffer.length} bytes, got ${finalStats.size} bytes`);
                }

            // Try to read the file to ensure it's actually accessible
            const testRead = fs.readFileSync(filepath);
            if (testRead.length !== buffer.length) {
                throw new Error('File read size does not match expected size');
            }
            console.log('✅ File is readable and size matches');
        } catch (verifyError) {
            console.error('❌ Final verification failed:', verifyError.message);
            throw verifyError;
        }

        // Return the URL path (relative to /uploads)
        const urlPath = `/uploads/images/${filename}`;
        console.log('✅ Profile picture saved successfully to:', filepath);
        console.log('✅ Profile picture URL path:', urlPath);
        return urlPath;
    } catch (error) {
        console.error('❌ Error saving profile picture:', error);
        console.error('❌ Error stack:', error.stack);
        throw error;
    }
}

// ============================================
// USER API ENDPOINTS
// ============================================

// Debug: list users (limited columns)
router.get('/users', async (_req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query("SELECT iduser, u_fname, u_lname, u_email, IFNULL(u_disabled, 0) AS u_disabled, IFNULL(u_role, 'user') AS u_role FROM `user` ORDER BY iduser DESC LIMIT 50");
        return res.json({ ok: true, rows });
    } catch (err) {
        console.error('List users failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Check user by email (blocked status and role)
router.get('/users/by-email', async (req, res) => {
    const email = (req.query.email || '').toString();
    if (!email) return res.status(400).json({ ok: false, error: 'Email required' });
    try {
        const pool = getPool();
        // Try to include all user fields including profile picture, but handle if column doesn't exist
        let query = "SELECT iduser, u_email, u_fname, u_mname, u_lname, u_suffix, u_password, IFNULL(u_disabled, 0) AS u_disabled, IFNULL(u_role, 'user') AS u_role, u_phone, u_date_of_birth, u_address, u_city, u_state, u_zip_code";
        try {
            // Try to add profile picture column
            query += ", u_profile_picture";
        } catch (e) {
            // Column might not exist, that's okay
        }
        query += " FROM `user` WHERE u_email = ? LIMIT 1";

        const [rows] = await pool.query(query, [email]);
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.json({ ok: true, exists: false });
        }
        const row = rows[0];
        return res.json({
            ok: true,
            exists: true,
            id: row.iduser,
            email: row.u_email,
            firstName: row.u_fname || null,
            middleName: row.u_mname || null,
            lastName: row.u_lname || null,
            suffix: row.u_suffix || null,
            phone: row.u_phone || null,
            dateOfBirth: row.u_date_of_birth || null,
            address: row.u_address || null,
            city: row.u_city || null,
            state: row.u_state || null,
            zipCode: row.u_zip_code || null,
            hasPassword: row.u_password !== null && row.u_password !== '',
            blocked: Number(row.u_disabled) === 1,
            role: row.u_role || 'user',
            profilePicture: row.u_profile_picture || null
        });
    } catch (err) {
        // If profile picture column doesn't exist, retry without it
        if (err && err.code === 'ER_BAD_FIELD_ERROR' && err.message.includes('u_profile_picture')) {
            try {
                const pool = getPool();
                const [rows] = await pool.query("SELECT iduser, u_email, u_fname, u_mname, u_lname, u_suffix, u_password, IFNULL(u_disabled, 0) AS u_disabled, IFNULL(u_role, 'user') AS u_role, u_phone, u_date_of_birth, u_address, u_city, u_state, u_zip_code FROM `user` WHERE u_email = ? LIMIT 1", [email]);
                if (!Array.isArray(rows) || rows.length === 0) {
                    return res.json({ ok: true, exists: false });
                }
                const row = rows[0];
                return res.json({
                    ok: true,
                    exists: true,
                    id: row.iduser,
                    email: row.u_email,
                    firstName: row.u_fname || null,
                    middleName: row.u_mname || null,
                    lastName: row.u_lname || null,
                    suffix: row.u_suffix || null,
                    phone: row.u_phone || null,
                    dateOfBirth: row.u_date_of_birth || null,
                    address: row.u_address || null,
                    city: row.u_city || null,
                    state: row.u_state || null,
                    zipCode: row.u_zip_code || null,
                    hasPassword: row.u_password !== null && row.u_password !== '',
                    blocked: Number(row.u_disabled) === 1,
                    role: row.u_role || 'user',
                    profilePicture: null
                });
            } catch (err2) {
                console.error('Lookup by email failed:', err2.code, err2.message);
                return res.status(500).json({ ok: false, error: 'Database error' });
            }
        }
        console.error('Lookup by email failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get user provider status and rejection reason
router.get('/user/provider-status', async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ ok: false, error: 'Email required' });
    }
    try {
        const pool = getPool();
        const [rows] = await pool.query(
            'SELECT u_provider_status, u_rejection_reason FROM `user` WHERE u_email = ? LIMIT 1',
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }

        return res.json({
            ok: true,
            status: rows[0].u_provider_status || null,
            rejectionReason: rows[0].u_rejection_reason || null
        });
    } catch (err) {
        // Handle missing columns gracefully
        if (err.code === 'ER_BAD_FIELD_ERROR') {
            return res.json({
                ok: true,
                status: null,
                rejectionReason: null
            });
        }
        console.error('Get provider status failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Add a user (admin action)
router.post('/users', async (req, res) => {
    const { firstName, middleName = '', lastName, suffix = '', email, password } = req.body || {};
    if (!firstName || !lastName || !email) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    try {
        const pool = getPool();
        const hashed = password ? await bcrypt.hash(password, 10) : null;
        const sql = "INSERT INTO `user` (u_fname, u_mname, u_lname, u_suffix, u_email, u_password) VALUES (?, ?, ?, ?, ?, ?)";
        const params = [firstName, middleName || null, lastName, suffix || null, email, hashed];
        const [result] = await pool.query(sql, params);
        return res.json({ ok: true, id: result.insertId });
    } catch (err) {
        console.error('Add user failed:', err.code, err.message);
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ ok: false, error: 'Email already exists' });
        }
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Apply as provider endpoint - now creates pending application with documents
// IMPORTANT: This route must come BEFORE /users/:id/block to avoid route conflicts
router.post('/users/apply-provider', async (req, res) => {
    console.log('📥 POST /api/users/apply-provider - Request received');
    console.log('📍 Request URL:', req.url);
    console.log('📍 Request method:', req.method);
    console.log('📍 Request headers:', JSON.stringify(req.headers));
    console.log('📋 Request body type:', typeof req.body);
    console.log('📋 Request body keys:', req.body ? Object.keys(req.body) : 'NO BODY');
    console.log('📧 Email:', req.body?.email ? 'Present' : 'Missing');
    console.log('📄 Business doc:', req.body?.businessDocument ? 'Present (' + (req.body?.businessDocument?.length || 0) + ' chars)' : 'Missing');
    console.log('🆔 Valid ID doc:', req.body?.validIdDocument ? 'Present (' + (req.body?.validIdDocument?.length || 0) + ' chars)' : 'Missing');

    // Ensure response is always sent - use timeout as backup
    let responseSent = false;
    const responseTimeout = setTimeout(() => {
        if (!responseSent) {
            console.error('⚠️ Response timeout - forcing response');
            responseSent = true;
            res.status(500).json({ ok: false, error: 'Request timeout' });
        }
    }, 30000); // 30 second timeout

    const sendResponse = (status, data) => {
        if (!responseSent) {
            clearTimeout(responseTimeout);
            responseSent = true;
            try {
                res.status(status).json(data);
                console.log('📤 Response sent:', status, data.ok ? 'OK' : 'ERROR', data.error || data.message || '');
            } catch (sendErr) {
                console.error('❌ Error sending response:', sendErr);
            }
        }
    };

    try {
        // Check if body was parsed
        if (!req.body || typeof req.body !== 'object') {
            console.error('❌ Request body not parsed correctly');
            return sendResponse(400, { ok: false, error: 'Invalid request body. Please ensure Content-Type is application/json.' });
        }

        const { email, businessDocument, validIdDocument } = req.body;

        // Validate required fields
        if (!email) {
            console.log('❌ Missing email');
            return sendResponse(400, { ok: false, error: 'Email is required' });
        }

        if (!businessDocument) {
            console.log('❌ Missing business document');
            return sendResponse(400, { ok: false, error: 'Business document is required' });
        }

        if (!validIdDocument) {
            console.log('❌ Missing valid ID document');
            return sendResponse(400, { ok: false, error: 'Valid ID document is required' });
        }

        // Validate base64 format
        if (!businessDocument.startsWith('data:image/')) {
            console.log('❌ Invalid business document format');
            return sendResponse(400, { ok: false, error: 'Business document must be a valid image file' });
        }

        if (!validIdDocument.startsWith('data:image/')) {
            console.log('❌ Invalid valid ID document format');
            return sendResponse(400, { ok: false, error: 'Valid ID document must be a valid image file' });
        }

        const pool = getPool();

        // Check if user exists
        console.log('🔍 Looking up user with email:', email);
        const [userRows] = await pool.query(
            'SELECT iduser, u_email, u_role, u_provider_status FROM `user` WHERE u_email = ?',
            [email]
        );

        if (userRows.length === 0) {
            console.log('❌ User not found for email:', email);
            return sendResponse(404, { ok: false, error: 'User not found' });
        }

        const user = userRows[0];
        console.log('✅ User found:', user.iduser, user.u_email, 'Role:', user.u_role, 'Status:', user.u_provider_status);

        // Check if user is already a provider
        if (user.u_role === 'provider') {
            console.log('❌ User is already a provider');
            return sendResponse(400, { ok: false, error: 'User is already a provider' });
        }

        // Check if user is an admin
        if (user.u_role === 'admin') {
            console.log('❌ Admin cannot apply as provider');
            return sendResponse(400, { ok: false, error: 'Admin users cannot apply as provider' });
        }

        // Check if already has pending application
        if (user.u_provider_status === 'pending') {
            console.log('❌ User already has pending application');
            return sendResponse(400, { ok: false, error: 'You already have a pending provider application' });
        }

        // If user was previously rejected, allow reapplication (status will be updated to pending)
        // This allows users to reapply after rejection

        // Ensure columns exist before proceeding
        console.log('🔧 Checking/creating database columns...');
        try {
            await pool.query('SELECT u_provider_status, u_business_document, u_valid_id_document FROM `user` LIMIT 1');
        } catch (checkErr) {
            if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Missing columns detected, creating them...');
                try {
                    if (checkErr.message.includes('u_provider_status')) {
                        await pool.query('ALTER TABLE `user` ADD COLUMN u_provider_status ENUM(\'pending\', \'approved\', \'rejected\') DEFAULT NULL');
                        console.log('✅ Added u_provider_status column');
                    }
                    if (checkErr.message.includes('u_business_document')) {
                        await pool.query('ALTER TABLE `user` ADD COLUMN u_business_document VARCHAR(500) DEFAULT NULL');
                        console.log('✅ Added u_business_document column');
                    }
                    if (checkErr.message.includes('u_valid_id_document')) {
                        await pool.query('ALTER TABLE `user` ADD COLUMN u_valid_id_document VARCHAR(500) DEFAULT NULL');
                        console.log('✅ Added u_valid_id_document column');
                    }
                } catch (alterErr) {
                    console.error('❌ Failed to add columns:', alterErr);
                    return sendResponse(500, { ok: false, error: 'Database setup error. Please contact support.' });
                }
            } else {
                throw checkErr;
            }
        }

        // Save documents to files
        console.log('💾 Saving documents...');
        let businessDocPath = null;
        let validIdDocPath = null;

        try {
            businessDocPath = saveProviderDocument(businessDocument, user.iduser, 'business');
            console.log('✅ Business document saved:', businessDocPath);

            validIdDocPath = saveProviderDocument(validIdDocument, user.iduser, 'id');
            console.log('✅ Valid ID document saved:', validIdDocPath);
        } catch (docErr) {
            console.error('❌ Error saving documents:', docErr);
            console.error('Document error details:', docErr.message, docErr.stack);
            return sendResponse(500, { ok: false, error: 'Failed to save documents: ' + docErr.message });
        }

        // Ensure u_provider_applied_at column exists
        try {
            await pool.query('SELECT u_provider_applied_at FROM `user` LIMIT 1');
        } catch (checkErr) {
            if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Missing u_provider_applied_at column, creating it...');
                try {
                    await pool.query('ALTER TABLE `user` ADD COLUMN u_provider_applied_at TIMESTAMP NULL DEFAULT NULL');
                    console.log('✅ Added u_provider_applied_at column');
                } catch (alterErr) {
                    console.error('❌ Failed to add u_provider_applied_at column:', alterErr);
                }
            }
        }

        // Update user record with application date (always update date on new application)
        console.log('💾 Updating user record with new application date...');
        const updateResult = await pool.query(
            'UPDATE `user` SET u_provider_status = ?, u_business_document = ?, u_valid_id_document = ?, u_provider_applied_at = NOW(), u_rejection_reason = NULL WHERE iduser = ?',
            ['pending', businessDocPath, validIdDocPath, user.iduser]
        );

        // Verify the update worked by checking the actual value in the database
        const [verifyRows] = await pool.query(
            'SELECT u_provider_applied_at FROM `user` WHERE iduser = ?',
            [user.iduser]
        );

        if (verifyRows.length > 0) {
            console.log(`✅ Application date updated to: ${verifyRows[0].u_provider_applied_at || 'NULL (check column exists!)'}`);
            if (!verifyRows[0].u_provider_applied_at) {
                console.error('⚠️ WARNING: u_provider_applied_at is NULL after update! Column may not exist.');
            }
        }

        console.log(`✅ User ${email} applied as provider (pending approval) with documents`);

        // Create notifications for all admin users about new provider application
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

            // Get all admin users
            const [adminRows] = await pool.query(
                'SELECT iduser, u_email, u_fname, u_lname FROM `user` WHERE u_role = ?',
                ['admin']
            );

            const applicantName = `${user.u_fname || ''} ${user.u_lname || ''}`.trim() || email;
            const notificationTitle = 'New Provider Application';
            const notificationMessage = `${applicantName} (${email}) has submitted a new provider application and is waiting for approval.`;

            // Create notification for each admin
            for (const admin of adminRows) {
                try {
                    await pool.query(
                        'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                        [
                            admin.iduser,
                            notificationTitle,
                            notificationMessage,
                            'new_provider_application',
                            0
                        ]
                    );

                    console.log(`✅ Notification created for admin user ID ${admin.iduser}`);

                    // Send push notification to admin
                    try {
                        if (global.sendPushNotification && admin.u_email) {
                            await global.sendPushNotification(
                                admin.u_email,
                                notificationTitle,
                                `${applicantName} submitted a provider application`,
                                {
                                    type: 'new_provider_application',
                                    userId: user.iduser.toString(),
                                    email: email,
                                }
                            );
                            console.log(`✅ Push notification sent to admin ${admin.u_email}`);
                        }
                    } catch (pushErr) {
                        console.error(`⚠️ Failed to send push notification to admin ${admin.u_email} (non-critical):`, pushErr);
                    }
                } catch (notifErr) {
                    console.error(`⚠️ Failed to create notification for admin ${admin.iduser} (non-critical):`, notifErr);
                }
            }
        } catch (notifErr) {
            console.error('⚠️ Failed to create notifications for admins (non-critical):', notifErr);
        }

        return sendResponse(200, {
            ok: true,
            message: 'Provider application submitted. Waiting for admin approval.',
            status: 'pending'
        });

    } catch (err) {
        console.error('❌ Error in apply-provider route:', err);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error code:', err.code);
        console.error('Error stack:', err.stack);

        // Ensure we always send a response
        if (!responseSent) {
            const errorMessage = err.message || 'An unexpected error occurred';
            return sendResponse(500, {
                ok: false,
                error: 'Server error: ' + errorMessage
            });
        }
    }
});

// Block / Unblock user (ensure u_disabled column exists)
router.post('/users/:id/block', async (req, res) => {
    const id = Number(req.params.id);
    const { blocked } = req.body || {};
    if (!Number.isFinite(id) || typeof blocked !== 'boolean') {
        return res.status(400).json({ ok: false, error: 'Invalid parameters' });
    }
    const pool = getPool();
    try {
        await pool.query('UPDATE `user` SET u_disabled = ? WHERE iduser = ?', [blocked ? 1 : 0, id]);
        return res.json({ ok: true });
    } catch (err) {
        // If column is missing, add it and retry once
        if (err && err.code === 'ER_BAD_FIELD_ERROR') {
            try {
                await pool.query('ALTER TABLE `user` ADD COLUMN u_disabled TINYINT(1) NOT NULL DEFAULT 0');
                await pool.query('UPDATE `user` SET u_disabled = ? WHERE iduser = ?', [blocked ? 1 : 0, id]);
                return res.json({ ok: true, createdColumn: true });
            } catch (e2) {
                console.error('Block user alter failed:', e2.code, e2.message);
            }
        }
        console.error('Block user failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Update user information
router.put('/users/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { firstName, middleName, lastName, suffix, email, password, phone, dateOfBirth, address, city, state, zipCode, profilePicture } = req.body || {};
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid user ID' });
    }
    if (!firstName || !lastName || !email) {
        return res.status(400).json({ ok: false, error: 'First name, last name, and email are required' });
    }
    try {
        const pool = getPool();
        // Check if user exists
        const [existing] = await pool.query('SELECT iduser, u_email, u_profile_picture FROM `user` WHERE iduser = ?', [id]);
        if (!Array.isArray(existing) || existing.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        // Check if email is being changed and if it's already taken
        if (email !== existing[0].u_email) {
            const [emailCheck] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ? AND iduser != ?', [email, id]);
            if (Array.isArray(emailCheck) && emailCheck.length > 0) {
                return res.status(409).json({ ok: false, error: 'Email already exists' });
            }
        }

        // Handle profile picture upload if provided
        let profilePicturePath = existing[0].u_profile_picture || null;
        let profilePictureSaveSuccessful = false; // Flag to track if save was successful
        console.log('📸 Profile picture received:', profilePicture ? (profilePicture.substring(0, 50) + '...') : 'null');
        console.log('📸 Profile picture type:', typeof profilePicture);
        console.log('📸 Profile picture length:', profilePicture ? profilePicture.length : 0);

        if (profilePicture && typeof profilePicture === 'string') {
            console.log('📸 Processing profile picture...');
            try {
                // If it's a base64 string, save it to file
                if (profilePicture.startsWith('data:image')) {
                    console.log('📸 Detected base64 image, saving to file...');
                    // Delete old profile picture if it exists (only after new one is confirmed saved)
                    const oldProfilePicturePath = profilePicturePath;

                    // Save new profile picture
                    console.log('📸 Calling saveProfilePicture function...');
                    console.log('📸 Profile picture data preview:', profilePicture.substring(0, 100));
                    try {
                        profilePicturePath = saveProfilePicture(profilePicture, id);
                        console.log('✅ Profile picture saved successfully:', profilePicturePath);

                        // Double-check file exists
                        // Extract filename from path (handle both /uploads/images/filename and just filename)
                        let filename = profilePicturePath;
                        if (filename.startsWith('/uploads/images/')) {
                            filename = filename.replace('/uploads/images/', '');
                        } else if (filename.startsWith('/uploads/')) {
                            filename = filename.replace('/uploads/', '');
                        }
                        const savedFilePath = path.join(uploadsDir, filename);
                        console.log('🔍 Checking file at:', savedFilePath);
                        console.log('🔍 Uploads dir:', uploadsDir);
                        console.log('🔍 __dirname:', __dirname);
                        console.log('🔍 Extracted filename:', filename);

                        if (fs.existsSync(savedFilePath)) {
                            const stats = fs.statSync(savedFilePath);
                            console.log('✅ File confirmed on disk:', savedFilePath);
                            console.log('✅ File size on disk:', stats.size, 'bytes');

                            // Only mark as successful if file exists and has content
                            if (stats.size > 0) {
                                profilePictureSaveSuccessful = true;

                                // Now delete old profile picture if it exists
                                if (oldProfilePicturePath && oldProfilePicturePath.startsWith('/uploads/')) {
                                    const oldFilePath = path.join(__dirname, '..', oldProfilePicturePath.replace('/uploads/', 'uploads/'));
                                    console.log('🗑️  Checking old profile picture:', oldFilePath);
                                    if (fs.existsSync(oldFilePath)) {
                                        try {
                                            fs.unlinkSync(oldFilePath);
                                            console.log('🗑️  Deleted old profile picture:', oldFilePath);
                                        } catch (deleteErr) {
                                            console.warn('⚠️  Could not delete old profile picture:', deleteErr.message);
                                        }
                                    } else {
                                        console.log('ℹ️  Old profile picture not found (already deleted or never existed)');
                                    }
                                }
                            } else {
                                console.error('❌ CRITICAL: File exists but is empty (0 bytes)!');
                                profilePicturePath = existing[0].u_profile_picture || null;
                                throw new Error('File was created but is empty');
                            }
                        } else {
                            console.error('❌ CRITICAL: File not found after save!');
                            console.error('❌ Expected path:', savedFilePath);
                            console.error('❌ Uploads directory exists:', fs.existsSync(uploadsDir));
                            console.error('❌ Files in uploads directory:', fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).slice(0, 5) : 'N/A');
                            // Don't update database with invalid path - keep old picture or set to null
                            console.error('⚠️  WARNING: File save failed, NOT updating database with invalid path');
                            profilePicturePath = existing[0].u_profile_picture || null;
                            throw new Error('File was not created on disk after save operation');
                        }
                    } catch (saveError) {
                        console.error('❌ Failed to save profile picture:', saveError);
                        console.error('❌ Error details:', saveError.message);
                        console.error('❌ Error stack:', saveError.stack);
                        console.error('❌ Error code:', saveError.code);
                        console.error('❌ Error syscall:', saveError.syscall);
                        console.error('❌ Error errno:', saveError.errno);
                        // Don't fail the entire request, but log the error
                        console.error('⚠️  WARNING: Profile picture save failed, keeping old picture');
                        profilePicturePath = existing[0].u_profile_picture || null;
                        profilePictureSaveSuccessful = false;

                        // Log additional diagnostic info
                        console.error('🔍 Diagnostic info:');
                        console.error('  - Uploads dir:', uploadsDir);
                        console.error('  - __dirname:', __dirname);
                        console.error('  - Directory exists:', fs.existsSync(uploadsDir));
                        if (fs.existsSync(uploadsDir)) {
                            try {
                                const testFile = path.join(uploadsDir, 'test_write.txt');
                                fs.writeFileSync(testFile, 'test');
                                fs.unlinkSync(testFile);
                                console.error('  - Directory is writable: YES');
                            } catch (testErr) {
                                console.error('  - Directory is writable: NO');
                                console.error('  - Test write error:', testErr.message);
                            }
                        }
                    }
                } else if (profilePicture.startsWith('/uploads/')) {
                    // Already a file path, use it as is
                    console.log('📸 Profile picture is already a file path:', profilePicture);
                    profilePicturePath = profilePicture;
                } else if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
                    // External URL, store as is
                    console.log('📸 Profile picture is external URL:', profilePicture);
                    profilePicturePath = profilePicture;
                } else {
                    console.warn('⚠️  Unknown profile picture format:', profilePicture.substring(0, 50));
                }
            } catch (imageErr) {
                console.error('❌ CRITICAL: Failed to process profile picture:', imageErr);
                console.error('❌ Error message:', imageErr.message);
                console.error('❌ Error stack:', imageErr.stack);
                // Re-throw to prevent database update with invalid path
                throw imageErr;
            }
        } else {
            console.log('ℹ️  No profile picture provided or invalid format');
        }

        // Helper function to check if column exists and add it if needed
        const ensureColumnExists = async (columnName, columnDefinition) => {
            try {
                const [columns] = await pool.query(`
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'user'
                    AND COLUMN_NAME = ?
                `, [columnName]);

                if (columns.length === 0) {
                    await pool.query(`ALTER TABLE \`user\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
                    console.log(`✅ Added column: ${columnName}`);
                    return true;
                }
                return true;
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    return true; // Column already exists
                }
                console.error(`Error checking/adding column ${columnName}:`, err.message);
                return false;
            }
        };

        // Build update query with required fields
        let updateFields = ['u_fname = ?', 'u_mname = ?', 'u_lname = ?', 'u_suffix = ?', 'u_email = ?'];
        let params = [firstName, middleName || null, lastName, suffix || null, email];

        // Add optional fields - ensure columns exist first
        if (phone !== undefined) {
            await ensureColumnExists('u_phone', 'VARCHAR(20) DEFAULT NULL');
            updateFields.push('u_phone = ?');
            params.push(phone || null);
        }
        if (dateOfBirth !== undefined) {
            await ensureColumnExists('u_date_of_birth', 'VARCHAR(50) DEFAULT NULL');
            updateFields.push('u_date_of_birth = ?');
            params.push(dateOfBirth || null);
        }
        if (address !== undefined) {
            await ensureColumnExists('u_address', 'VARCHAR(255) DEFAULT NULL');
            updateFields.push('u_address = ?');
            params.push(address || null);
        }
        if (city !== undefined) {
            await ensureColumnExists('u_city', 'VARCHAR(100) DEFAULT NULL');
            updateFields.push('u_city = ?');
            params.push(city || null);
        }
        if (state !== undefined) {
            await ensureColumnExists('u_state', 'VARCHAR(100) DEFAULT NULL');
            updateFields.push('u_state = ?');
            params.push(state || null);
        }
        if (zipCode !== undefined) {
            await ensureColumnExists('u_zip_code', 'VARCHAR(20) DEFAULT NULL');
            updateFields.push('u_zip_code = ?');
            params.push(zipCode || null);
        }
        // Only update profile picture in database if:
        // 1. We tried to save a base64 image AND it was successful, OR
        // 2. The profile picture is already a path/URL (not base64)
        if (profilePicturePath !== undefined) {
            if (profilePicture && profilePicture.startsWith('data:image')) {
                // We tried to save a base64 image - only update if save was successful
                if (profilePictureSaveSuccessful) {
            await ensureColumnExists('u_profile_picture', 'VARCHAR(500) DEFAULT NULL');
            updateFields.push('u_profile_picture = ?');
            params.push(profilePicturePath);
                    console.log('✅ Will update database with profile picture path:', profilePicturePath);
                } else {
                    console.warn('⚠️  NOT updating database - profile picture save failed, keeping old picture');
                }
            } else {
                // Profile picture is already a path/URL, safe to update
                await ensureColumnExists('u_profile_picture', 'VARCHAR(500) DEFAULT NULL');
                updateFields.push('u_profile_picture = ?');
                params.push(profilePicturePath);
                console.log('✅ Will update database with profile picture path:', profilePicturePath);
            }
        }

        // Only update password if provided
        if (password && password.trim() !== '') {
            const hashed = await bcrypt.hash(password, 10);
            updateFields.push('u_password = ?');
            params.push(hashed);
        }
        params.push(id);
        const sql = `UPDATE \`user\` SET ${updateFields.join(', ')} WHERE iduser = ?`;
        await pool.query(sql, params);

        // Return success with profile picture path if it was updated
        const response = { ok: true };
        if (profilePicturePath) {
            response.profilePicture = profilePicturePath;
            console.log('📸 Returning profile picture path:', profilePicturePath);
        }
        return res.json(response);
    } catch (err) {
        console.error('Update user failed:', err.code, err.message);
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ ok: false, error: 'Email already exists' });
        }
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Register endpoint: inserts into MySQL `event.user`
router.post('/register', async (req, res) => {
	const {
		firstName,
		middleName = '',
		lastName,
		suffix = '',
		email,
		password,
	} = req.body || {};

	console.log('POST /api/register', {
		firstName,
		middleName,
		lastName,
		suffix,
		email,
	});

	// For social sign-ins, password may be undefined/null
	if (!firstName || !lastName || !email) {
		return res.status(400).json({ ok: false, error: 'Missing required fields' });
	}

	try {
		const pool = getPool();

		// CHECK FIRST: Verify email doesn't already exist before attempting insert
		const [existingUsers] = await pool.query(
			"SELECT iduser, u_email FROM `user` WHERE u_email = ? LIMIT 1",
			[email]
		);

		if (Array.isArray(existingUsers) && existingUsers.length > 0) {
			console.log('Register failed: Email already exists', email);
			return res.status(409).json({
				ok: false,
				error: 'This email is already registered. Please use a different email or try logging in instead.'
			});
		}

		// Email doesn't exist, proceed with registration
		const hashed = password ? await bcrypt.hash(password, 10) : null;

		// Validate hash length (bcrypt hashes are 60 chars, but ensure it fits in VARCHAR(255))
		if (hashed && hashed.length > 255) {
			console.error('Password hash too long:', hashed.length, 'characters');
			return res.status(500).json({
				ok: false,
				error: 'Password hash generation error. Please try again.'
			});
		}

		console.log('Password hash length:', hashed ? hashed.length : 0);

		// Try to fix column size automatically if it fails
		let insertAttempts = 0;
		const maxAttempts = 2;
		let lastError = null;

		while (insertAttempts < maxAttempts) {
			try {
		// Align with schema: iduser (AI PK), u_fname, u_mname, u_lname, u_suffix, u_email, u_password
		const sql = `INSERT INTO \`user\` (u_fname, u_mname, u_lname, u_suffix, u_email, u_password)
			VALUES (?, ?, ?, ?, ?, ?)`;
		const params = [firstName, middleName || null, lastName, suffix || null, email, hashed];
		const [result] = await pool.query(sql, params);
		console.log('Register insert success', { insertId: result.insertId });
		return res.json({ ok: true, id: result.insertId });
			} catch (insertErr) {
				lastError = insertErr;
				// If error is "Data too long for column", try to fix the column size
				if (insertErr && insertErr.code === 'ER_DATA_TOO_LONG' && insertErr.message && insertErr.message.includes('u_password') && insertAttempts === 0) {
					console.warn('⚠️ Password column too small, attempting to fix...');
					try {
						await pool.query('ALTER TABLE `user` MODIFY COLUMN `u_password` VARCHAR(255) DEFAULT NULL');
						console.log('✅ Password column size updated to VARCHAR(255)');
						insertAttempts++;
						continue; // Retry the insert
					} catch (alterErr) {
						console.error('❌ Failed to update password column:', alterErr);
						// Don't throw here, let it fall through to re-throw original error
					}
				}
				// If we've exhausted attempts or it's not a fixable error, break and throw
				if (insertAttempts >= maxAttempts - 1) {
					break;
				}
				insertAttempts++;
			}
		}

		// If we get here, all attempts failed
		if (lastError) {
			throw lastError;
		}
		throw new Error('Registration failed after multiple attempts');
	} catch (err) {
		console.error('========================================');
		console.error('❌ REGISTER INSERT FAILED');
		console.error('========================================');
		console.error('Error Code:', err.code);
		console.error('Error Message:', err.message);
		console.error('Error Stack:', err.stack);
		console.error('Request Body:', JSON.stringify(req.body, null, 2));
		console.error('========================================');

		if (err && err.code === 'ER_DUP_ENTRY') {
			console.error('Duplicate entry detected for email:', email);
			return res.status(409).json({
				ok: false,
				error: 'This email is already registered. Please use a different email or try logging in instead.'
			});
		}

		// More detailed error response for debugging
		const errorMessage = err.message || 'Unknown database error';
		const errorCode = err.code || 'UNKNOWN_ERROR';
		console.error('Returning 500 error:', errorCode, errorMessage);

		return res.status(500).json({
			ok: false,
			error: 'Database error: ' + errorMessage,
			errorCode: errorCode,
			details: process.env.NODE_ENV === 'development' ? err.stack : undefined
		});
	}
});

module.exports = router;
