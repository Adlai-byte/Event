// Load environment variables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { getPool } = require('./db');
const { createInstaPayPayment, createGCashPayment, createPaymentLink, createCheckoutSession, parsePaymentStatus } = require('./services/paymongo');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'images');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads/images directory');
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
        const filename = `profile_${userId}_${timestamp}_${randomStr}.${imageFormat}`;
        const filepath = path.join(uploadsDir, filename);
        
        // Convert base64 to buffer and save
        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(filepath, buffer);
        
        // Return the URL path (relative to /uploads)
        return `/uploads/images/${filename}`;
    } catch (error) {
        console.error('Error saving profile picture:', error);
        throw error;
    }
}

app.use(cors());
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

// Serve uploaded images
app.use('/uploads', express.static('server/uploads'));

// Root - helpful message instead of "Cannot GET /"
app.get('/', (_req, res) => {
    return res.type('text').send('Event API is running. Try GET /api/health or POST /api/register');
});

// Health check
app.get('/api/health', (_req, res) => {
	return res.json({ ok: true });
});

// Debug: list users (limited columns)
app.get('/api/users', async (_req, res) => {
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
app.get('/api/users/by-email', async (req, res) => {
    const email = (req.query.email || '').toString();
    if (!email) return res.status(400).json({ ok: false, error: 'Email required' });
    try {
        const pool = getPool();
        // Try to include profile picture, but handle if column doesn't exist
        let query = "SELECT iduser, u_email, u_fname, u_mname, u_lname, u_suffix, u_password, IFNULL(u_disabled, 0) AS u_disabled, IFNULL(u_role, 'user') AS u_role";
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
                const [rows] = await pool.query("SELECT iduser, u_email, u_fname, u_mname, u_lname, u_suffix, u_password, IFNULL(u_disabled, 0) AS u_disabled, IFNULL(u_role, 'user') AS u_role FROM `user` WHERE u_email = ? LIMIT 1", [email]);
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

// Add a user (admin action)
app.post('/api/users', async (req, res) => {
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

// Block / Unblock user (ensure u_disabled column exists)
app.post('/api/users/:id/block', async (req, res) => {
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
app.put('/api/users/:id', async (req, res) => {
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
        if (profilePicture && typeof profilePicture === 'string') {
            try {
                // If it's a base64 string, save it to file
                if (profilePicture.startsWith('data:image')) {
                    // Delete old profile picture if it exists
                    if (profilePicturePath && profilePicturePath.startsWith('/uploads/')) {
                        const oldFilePath = path.join(__dirname, profilePicturePath.replace('/uploads/', 'uploads/'));
                        if (fs.existsSync(oldFilePath)) {
                            try {
                                fs.unlinkSync(oldFilePath);
                                console.log('🗑️  Deleted old profile picture:', oldFilePath);
                            } catch (deleteErr) {
                                console.warn('⚠️  Could not delete old profile picture:', deleteErr.message);
                            }
                        }
                    }
                    // Save new profile picture
                    profilePicturePath = saveProfilePicture(profilePicture, id);
                    console.log('✅ Profile picture saved:', profilePicturePath);
                } else if (profilePicture.startsWith('/uploads/')) {
                    // Already a file path, use it as is
                    profilePicturePath = profilePicture;
                } else if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
                    // External URL, store as is
                    profilePicturePath = profilePicture;
                }
            } catch (imageErr) {
                console.error('⚠️  Failed to save profile picture:', imageErr);
                // Don't fail the entire request if image save fails
            }
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
        if (profilePicturePath !== undefined) {
            await ensureColumnExists('u_profile_picture', 'VARCHAR(500) DEFAULT NULL');
            updateFields.push('u_profile_picture = ?');
            params.push(profilePicturePath);
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
        return res.json({ ok: true });
    } catch (err) {
        console.error('Update user failed:', err.code, err.message);
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ ok: false, error: 'Email already exists' });
        }
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Apply as provider endpoint - now creates pending application with documents
app.post('/api/users/apply-provider', async (req, res) => {
    const { email, businessDocument, validIdDocument } = req.body || {};
    
    if (!email) {
        return res.status(400).json({ ok: false, error: 'Email is required' });
    }
    
    if (!businessDocument) {
        return res.status(400).json({ ok: false, error: 'Business document is required' });
    }
    
    if (!validIdDocument) {
        return res.status(400).json({ ok: false, error: 'Valid ID document is required' });
    }
    
    try {
        const pool = getPool();
        
        // Check if user exists
        const [userRows] = await pool.query(
            'SELECT iduser, u_email, u_role, u_provider_status FROM `user` WHERE u_email = ?',
            [email]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        
        const user = userRows[0];
        
        // Check if user is already a provider
        if (user.u_role === 'provider') {
            return res.status(400).json({ ok: false, error: 'User is already a provider' });
        }
        
        // Check if user is an admin
        if (user.u_role === 'admin') {
            return res.status(400).json({ ok: false, error: 'Admin users cannot apply as provider' });
        }
        
        // Check if already has pending application
        if (user.u_provider_status === 'pending') {
            return res.status(400).json({ ok: false, error: 'You already have a pending provider application' });
        }
        
        // Save documents to files
        let businessDocPath = null;
        let validIdDocPath = null;
        
        try {
            businessDocPath = saveProviderDocument(businessDocument, user.iduser, 'business');
            validIdDocPath = saveProviderDocument(validIdDocument, user.iduser, 'id');
        } catch (docErr) {
            console.error('Error saving documents:', docErr);
            return res.status(500).json({ ok: false, error: 'Failed to save documents' });
        }
        
        // Check if columns exist, if not add them
        try {
            await pool.query('SELECT u_provider_status, u_business_document, u_valid_id_document FROM `user` LIMIT 1');
        } catch (checkErr) {
            if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
                // Add missing columns
                try {
                    if (checkErr.message.includes('u_provider_status')) {
                        await pool.query('ALTER TABLE `user` ADD COLUMN u_provider_status ENUM(\'pending\', \'approved\', \'rejected\') DEFAULT NULL');
                    }
                    if (checkErr.message.includes('u_business_document')) {
                        await pool.query('ALTER TABLE `user` ADD COLUMN u_business_document VARCHAR(500) DEFAULT NULL');
                    }
                    if (checkErr.message.includes('u_valid_id_document')) {
                        await pool.query('ALTER TABLE `user` ADD COLUMN u_valid_id_document VARCHAR(500) DEFAULT NULL');
                    }
                    if (checkErr.message.includes('u_paymongo_payment_link')) {
                        await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_payment_link VARCHAR(500) DEFAULT NULL');
                    }
                } catch (alterErr) {
                    console.error('Failed to add columns:', alterErr);
                }
            }
        }
        
        // Set provider status to pending and save document paths
        await pool.query(
            'UPDATE `user` SET u_provider_status = ?, u_business_document = ?, u_valid_id_document = ? WHERE iduser = ?',
            ['pending', businessDocPath, validIdDocPath, user.iduser]
        );
        
        console.log(`✓ User ${email} applied as provider (pending approval) with documents`);
        
        return res.json({ 
            ok: true, 
            message: 'Provider application submitted. Waiting for admin approval.',
            status: 'pending'
        });
    } catch (err) {
        // If column doesn't exist, add it and retry
        if (err.code === 'ER_BAD_FIELD_ERROR' && err.message.includes('u_provider_status')) {
            try {
                const pool = getPool();
                await pool.query('ALTER TABLE `user` ADD COLUMN u_provider_status ENUM(\'pending\', \'approved\', \'rejected\') DEFAULT NULL');
                // Retry the update
                await pool.query(
                    'UPDATE `user` SET u_provider_status = ? WHERE iduser = ?',
                    ['pending', userRows[0].iduser]
                );
                return res.json({ 
                    ok: true, 
                    message: 'Provider application submitted. Waiting for admin approval.',
                    status: 'pending'
                });
            } catch (alterErr) {
                console.error('Failed to add u_provider_status column:', alterErr);
                return res.status(500).json({ ok: false, error: 'Database error: Failed to create provider status column' });
            }
        }
        console.error('Apply provider failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get provider applications (for admin)
app.get('/api/admin/provider-applications', async (req, res) => {
    try {
        const pool = getPool();
        // Check if column exists, if not return empty array
        try {
            const [rows] = await pool.query(`
                SELECT iduser, u_fname, u_lname, u_email, u_provider_status, u_role, u_business_document, u_valid_id_document, u_created_at
                FROM \`user\`
                WHERE u_provider_status IN ('pending', 'approved', 'rejected') OR u_role = 'provider'
                ORDER BY u_created_at DESC
            `);
            return res.json({ ok: true, rows });
        } catch (queryErr) {
            // If column doesn't exist, try to add it
            if (queryErr.code === 'ER_BAD_FIELD_ERROR') {
                try {
                    if (queryErr.message.includes('u_provider_status')) {
                        await pool.query('ALTER TABLE `user` ADD COLUMN u_provider_status ENUM(\'pending\', \'approved\', \'rejected\') DEFAULT NULL');
                    }
                    if (queryErr.message.includes('u_business_document')) {
                        await pool.query('ALTER TABLE `user` ADD COLUMN u_business_document VARCHAR(500) DEFAULT NULL');
                    }
                    if (queryErr.message.includes('u_valid_id_document')) {
                        await pool.query('ALTER TABLE `user` ADD COLUMN u_valid_id_document VARCHAR(500) DEFAULT NULL');
                    }
                    // Query again
                    const [rows] = await pool.query(`
                        SELECT iduser, u_fname, u_lname, u_email, u_provider_status, u_role, u_business_document, u_valid_id_document, u_created_at
                        FROM \`user\`
                        WHERE u_provider_status IN ('pending', 'approved', 'rejected') OR u_role = 'provider'
                        ORDER BY u_created_at DESC
                    `);
                    return res.json({ ok: true, rows });
                } catch (alterErr) {
                    console.error('Failed to add columns:', alterErr);
                }
            }
            throw queryErr;
        }
    } catch (err) {
        console.error('Get provider applications failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Approve provider application
app.post('/api/admin/provider-applications/:id/approve', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid user ID' });
    }
    try {
        const pool = getPool();
        
        // Check if user exists
        const [userRows] = await pool.query(
            'SELECT iduser, u_email, u_role, u_provider_status FROM `user` WHERE iduser = ?',
            [id]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        
        const user = userRows[0];
        
        // Check if already a provider
        if (user.u_role === 'provider') {
            return res.status(400).json({ ok: false, error: 'User is already a provider' });
        }
        
        // Update user role to provider and set status to approved
        await pool.query(
            'UPDATE `user` SET u_role = ?, u_provider_status = ? WHERE iduser = ?',
            ['provider', 'approved', id]
        );
        
        console.log(`✓ Provider application approved for user ID ${id} (${user.u_email})`);
        return res.json({ ok: true, message: 'Provider application approved' });
    } catch (err) {
        console.error('Approve provider failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Reject provider application
app.post('/api/admin/provider-applications/:id/reject', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid user ID' });
    }
    try {
        const pool = getPool();
        
        // Check if user exists
        const [userRows] = await pool.query(
            'SELECT iduser, u_email, u_provider_status FROM `user` WHERE iduser = ?',
            [id]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        
        const user = userRows[0];
        
        // Update provider status to rejected (role stays as 'user')
        await pool.query(
            'UPDATE `user` SET u_provider_status = ? WHERE iduser = ?',
            ['rejected', id]
        );
        
        console.log(`✓ Provider application rejected for user ID ${id} (${user.u_email})`);
        return res.json({ ok: true, message: 'Provider application rejected' });
    } catch (err) {
        console.error('Reject provider failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Register endpoint: inserts into MySQL `event.user`
app.post('/api/register', async (req, res) => {
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
		// Align with schema: iduser (AI PK), u_fname, u_mname, u_lname, u_suffix, u_email, u_password
		const sql = `INSERT INTO \`user\` (u_fname, u_mname, u_lname, u_suffix, u_email, u_password)
			VALUES (?, ?, ?, ?, ?, ?)`;
		const params = [firstName, middleName || null, lastName, suffix || null, email, hashed];
		const [result] = await pool.query(sql, params);
		console.log('Register insert success', { insertId: result.insertId });
		return res.json({ ok: true, id: result.insertId });
	} catch (err) {
		console.error('Register insert failed:', err.code, err.message);
		if (err && err.code === 'ER_DUP_ENTRY') {
			return res.status(409).json({ 
				ok: false, 
				error: 'This email is already registered. Please use a different email or try logging in instead.' 
			});
		}
		return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
	}
});

// ============================================
// SERVICES API ENDPOINTS
// ============================================

// Get all services
app.get('/api/services', async (req, res) => {
    try {
        const pool = getPool();
        const category = req.query.category;
        const search = req.query.search;
        const featured = req.query.featured === 'true';
        const city = req.query.city;
        const providerId = req.query.providerId; // Firebase UID
        const providerEmail = req.query.providerEmail;
        
        let query = `
            SELECT s.*, u.u_fname, u.u_lname, 
                   CONCAT(u.u_fname, ' ', u.u_lname) as provider_name,
                   si.si_image_url as primary_image
            FROM service s
            LEFT JOIN user u ON s.s_provider_id = u.iduser
            LEFT JOIN service_image si ON s.idservice = si.si_service_id AND si.si_is_primary = 1
            WHERE 1=1
        `;
        const params = [];
        
        // Filter by provider if specified
        if (providerEmail) {
            query += ` AND u.u_email = ?`;
            params.push(providerEmail);
            // Include both active AND inactive services when provider views their own services
            // No s_is_active filter is added, so all services are returned
        } else if (providerId) {
            // If providerId is an email (contains @), use it
            if (providerId.includes('@')) {
                query += ` AND u.u_email = ?`;
                params.push(providerId);
                // Include both active AND inactive services when provider views their own services
            } else {
                // For Firebase UID, we'd need a mapping - for now, return empty or all
                // This is a limitation - we should store Firebase UID in user table
                return res.json({ ok: true, rows: [] });
            }
        } else {
            // For public listing, only show active services
            query += ` AND s.s_is_active = 1`;
        }
        
        if (category) {
            query += ` AND s.s_category = ?`;
            params.push(category);
        }
        
        if (search) {
            query += ` AND (s.s_name LIKE ? OR s.s_description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (city) {
            query += ` AND s.s_city LIKE ?`;
            params.push(`%${city}%`);
        }
        
        if (featured) {
            query += ` AND s.s_rating >= 4.5`;
            query += ` ORDER BY s.s_rating DESC, s.s_review_count DESC`;
        } else {
            query += ` ORDER BY s.s_created_at DESC`;
        }
        
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        if (limit && limit > 0) {
            query += ` LIMIT ?`;
            params.push(limit);
        }
        
        const [rows] = await pool.query(query, params);
        return res.json({ ok: true, rows });
    } catch (err) {
        console.error('List services failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get service by ID
app.get('/api/services/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT s.*, u.u_fname, u.u_lname,
                   CONCAT(u.u_fname, ' ', u.u_lname) as provider_name
            FROM service s
            LEFT JOIN user u ON s.s_provider_id = u.iduser
            WHERE s.idservice = ?
        `, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Service not found' });
        }
        return res.json({ ok: true, service: rows[0] });
    } catch (err) {
        console.error('Get service failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get service images
app.get('/api/services/:id/images', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT si_image_url, si_is_primary, si_order
            FROM service_image
            WHERE si_service_id = ?
            ORDER BY si_is_primary DESC, si_order ASC
        `, [id]);
        return res.json({ ok: true, images: rows });
    } catch (err) {
        console.error('Get service images failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get service availability
app.get('/api/services/:id/availability', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT sa_day_of_week, sa_start_time, sa_end_time, sa_is_available
            FROM service_availability
            WHERE sa_service_id = ? AND sa_is_available = 1
            ORDER BY sa_day_of_week, sa_start_time
        `, [id]);
        return res.json({ ok: true, availability: rows });
    } catch (err) {
        console.error('Get availability failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get available dates and times for a service
app.get('/api/services/:id/available-slots', async (req, res) => {
    const id = Number(req.params.id);
    const date = req.query.date; // YYYY-MM-DD format
    
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }
    
    try {
        const pool = getPool();
        
        // Get service availability
        const [availabilityRows] = await pool.query(`
            SELECT sa_day_of_week, sa_start_time, sa_end_time
            FROM service_availability
            WHERE sa_service_id = ? AND sa_is_available = 1
        `, [id]);
        
        if (date) {
            // Get specific date's available times
            const selectedDate = new Date(date);
            const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
            
            // Check for existing bookings on this date for this specific service
            const [bookings] = await pool.query(`
                SELECT b_start_time, b_end_time, b.b_event_name, b.b_status
                FROM booking b
                INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
                WHERE bs.bs_service_id = ? 
                AND b.b_event_date = ?
                AND b.b_status IN ('pending', 'confirmed')
            `, [id, date]);
            
            console.log(`[Available Slots] Service ID: ${id}, Date: ${date}, Found ${bookings.length} existing bookings:`, bookings);
            
            // Filter availability for this day of week
            let dayAvailability = availabilityRows.filter(a => a.sa_day_of_week === dayOfWeek);
            
            // If no availability data exists, use default hours (9 AM - 6 PM)
            if (dayAvailability.length === 0 && availabilityRows.length === 0) {
                dayAvailability = [
                    { sa_start_time: '09:00:00', sa_end_time: '18:00:00' }
                ];
            }
            
            // Generate time slots (every 30 minutes) - return all slots with availability flag
            const allSlots = [];
            for (const avail of dayAvailability) {
                const start = new Date(`2000-01-01T${avail.sa_start_time}`);
                const end = new Date(`2000-01-01T${avail.sa_end_time}`);
                
                let current = new Date(start);
                while (current < end) {
                    const timeStr = current.toTimeString().slice(0, 5);
                    const endTime = new Date(current.getTime() + 30 * 60000);
                    const endTimeStr = endTime.toTimeString().slice(0, 5);
                    
                    // Check if this slot conflicts with existing bookings (including 30-minute gap requirement)
                    const isBooked = bookings.some(booking => {
                        // Normalize time format to HH:MM:SS
                        const bookingStartStr = booking.b_start_time.toString();
                        const bookingEndStr = booking.b_end_time.toString();
                        const bookingStartTime = bookingStartStr.length === 5 ? `${bookingStartStr}:00` : bookingStartStr;
                        const bookingEndTime = bookingEndStr.length === 5 ? `${bookingEndStr}:00` : bookingEndStr;
                        
                        // Create date objects for comparison (using same base date)
                        const bookingStart = new Date(`2000-01-01T${bookingStartTime}`);
                        const bookingEnd = new Date(`2000-01-01T${bookingEndTime}`);
                        
                        // Standard interval overlap check: two intervals overlap if
                        // slotStart < bookingEnd AND slotEnd > bookingStart
                        const overlaps = (current < bookingEnd) && (endTime > bookingStart);
                        
                        // 30-minute gap requirement check
                        // If existing booking ends at 12:00, new booking must start at 12:30 or later
                        // This means: slotStart must be >= bookingEnd + 30 minutes
                        // Gap violation: slot starts less than 30 min after booking ends
                        const gapAfterBooking = new Date(bookingEnd.getTime() + 30 * 60000); // bookingEnd + 30 min
                        const gapViolationAfter = current < gapAfterBooking;
                        
                        // If existing booking starts at 12:30, new booking must end at 12:00 or earlier
                        // This means: slotEnd must be <= bookingStart - 30 minutes
                        // Gap violation: slot ends less than 30 min before booking starts
                        const gapBeforeBooking = new Date(bookingStart.getTime() - 30 * 60000); // bookingStart - 30 min
                        const gapViolationBefore = endTime > gapBeforeBooking;
                        
                        // Additional check: if slot starts exactly when booking ends, it's a violation
                        // (e.g., booking ends at 12:00, slot starts at 12:00 - needs 30-min gap)
                        const startsAtBookingEnd = current.getTime() === bookingEnd.getTime();
                        const endsAtBookingStart = endTime.getTime() === bookingStart.getTime();
                        
                        const hasConflict = overlaps || gapViolationAfter || gapViolationBefore || startsAtBookingEnd || endsAtBookingStart;
                        
                        if (hasConflict) {
                        if (overlaps) {
                            console.log(`[Slot Conflict] Slot ${timeStr}-${endTimeStr} overlaps with booking ${bookingStartTime}-${bookingEndTime}`);
                            } else if (gapViolationAfter) {
                                console.log(`[Gap Violation] Slot ${timeStr}-${endTimeStr} starts too soon after booking ${bookingStartTime}-${bookingEndTime} (needs 30-min gap)`);
                            } else if (gapViolationBefore) {
                                console.log(`[Gap Violation] Slot ${timeStr}-${endTimeStr} ends too close before booking ${bookingStartTime}-${bookingEndTime} (needs 30-min gap)`);
                            }
                        }
                        
                        return hasConflict;
                    });
                    
                    // Only add slot if it's available (not booked)
                    if (endTime <= end && !isBooked) {
                        allSlots.push({
                            start: timeStr,
                            end: endTimeStr,
                            available: true
                        });
                    }
                    
                    current = new Date(current.getTime() + 30 * 60000);
                }
            }
            
            // Return only available slots
            return res.json({ ok: true, slots: allSlots });
        } else {
            // Get available dates for the next 30 days
            const availableDates = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // If no availability data exists, make all dates available (default behavior)
            const hasAvailabilityData = availabilityRows.length > 0;
            
            for (let i = 0; i < 30; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(today.getDate() + i);
                const dayOfWeek = checkDate.getDay();
                const dateStr = checkDate.toISOString().split('T')[0];
                
                let isAvailable = false;
                
                if (hasAvailabilityData) {
                    // Check if service is available on this day of week
                    const hasAvailability = availabilityRows.some(a => a.sa_day_of_week === dayOfWeek);
                    
                    if (hasAvailability) {
                        // Check if there are any bookings on this date
                        const [bookings] = await pool.query(`
                            SELECT COUNT(*) as count
                            FROM booking b
                            INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
                            WHERE bs.bs_service_id = ? 
                            AND b.b_event_date = ?
                            AND b.b_status IN ('pending', 'confirmed')
                        `, [id, dateStr]);
                        
                        // Consider date available if not fully booked (you can adjust this logic)
                        if (bookings[0].count < 10) { // Example: max 10 bookings per day
                            isAvailable = true;
                        }
                    }
                } else {
                    // No availability restrictions - all dates are available
                    // Just check if not fully booked
                    const [bookings] = await pool.query(`
                        SELECT COUNT(*) as count
                        FROM booking b
                        INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
                        WHERE bs.bs_service_id = ? 
                        AND b.b_event_date = ?
                        AND b.b_status IN ('pending', 'confirmed')
                    `, [id, dateStr]);
                    
                    if (bookings[0].count < 10) {
                        isAvailable = true;
                    }
                }
                
                if (isAvailable) {
                    availableDates.push(dateStr);
                }
            }
            
            return res.json({ ok: true, dates: availableDates });
        }
    } catch (err) {
        console.error('Get available slots failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Create service
app.post('/api/services', async (req, res) => {
    const { providerId, providerEmail, name, description, category, basePrice, pricingType, duration, maxCapacity, city, state, address, latitude, longitude, image } = req.body || {};
    
    // Validate required fields
    if ((!providerId && !providerEmail) || !name || !category || basePrice === undefined || basePrice === null) {
        return res.status(400).json({ ok: false, error: 'Missing required fields: providerId or providerEmail, name, category, and basePrice are required' });
    }

    // Validate category
    const validCategories = ['venue', 'catering', 'photography', 'music', 'decoration', 'transportation', 'entertainment', 'planning', 'other'];
    if (!validCategories.includes(category.toLowerCase())) {
        return res.status(400).json({ ok: false, error: 'Invalid category' });
    }

    // Validate price
    const price = parseFloat(basePrice);
    if (isNaN(price) || price < 0) {
        return res.status(400).json({ ok: false, error: 'Invalid price' });
    }

    try {
        const pool = getPool();
        
        console.log('========================================');
        console.log('📥 RECEIVED SERVICE CREATION REQUEST:');
        console.log('========================================');
        console.log('Provider ID (from request):', providerId);
        console.log('Provider Email:', providerEmail);
        console.log('Service Name:', name);
        console.log('Description:', description);
        console.log('Category:', category);
        console.log('Base Price:', basePrice);
        console.log('Pricing Type:', pricingType);
        console.log('Duration:', duration);
        console.log('Max Capacity:', maxCapacity);
        console.log('City:', city);
        console.log('State:', state);
        console.log('Address:', address);
        console.log('Latitude:', latitude);
        console.log('Longitude:', longitude);
        console.log('========================================');
        
        // Look up the database user ID by email or providerId
        let dbUserId = null;
        
        // If providerId is a number, use it directly
        if (providerId && !isNaN(parseInt(providerId))) {
            console.log('Checking if providerId is a database ID...');
            const [userCheck] = await pool.query('SELECT iduser FROM `user` WHERE iduser = ?', [parseInt(providerId)]);
            if (userCheck.length > 0) {
                dbUserId = userCheck[0].iduser;
                console.log('✓ Found user by ID:', dbUserId);
            }
        }
        
        // If not found and we have email, look up by email
        if (!dbUserId && providerEmail) {
            console.log('Looking up user by email:', providerEmail);
            const [userByEmail] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
            if (userByEmail.length > 0) {
                dbUserId = userByEmail[0].iduser;
                console.log('✓ Found user by email. Database ID:', dbUserId);
            } else {
                console.log('✗ User not found by email:', providerEmail);
            }
        }
        
        // If still not found and providerId is a string (Firebase UID), try to find by email from user object
        if (!dbUserId) {
            console.log('✗ ERROR: Provider not found in database');
            return res.status(400).json({ ok: false, error: 'Provider not found in database. Please ensure the user is registered in the system.' });
        }
        
        // Build address string with coordinates if available
        let fullAddress = address || '';
        if (latitude && longitude) {
            const coords = `${latitude},${longitude}`;
            if (fullAddress) {
                fullAddress = `${fullAddress} (${coords})`;
            } else {
                fullAddress = coords;
            }
        }

        const insertData = [
            dbUserId, 
            name.trim(), 
            description ? description.trim() : null, 
            category.toLowerCase(), 
            price, 
            pricingType || 'fixed', 
            duration || 60, 
            maxCapacity || 1, 
            city || null, 
            state || null, 
            fullAddress || null, 
            1
        ];

        console.log('========================================');
        console.log('💾 INSERTING INTO DATABASE:');
        console.log('========================================');
        console.log('SQL: INSERT INTO service');
        console.log('Columns: s_provider_id, s_name, s_description, s_category, s_base_price, s_pricing_type, s_duration, s_max_capacity, s_city, s_state, s_address, s_is_active');
        console.log('Values:');
        console.log('  s_provider_id:', insertData[0]);
        console.log('  s_name:', insertData[1]);
        console.log('  s_description:', insertData[2]);
        console.log('  s_category:', insertData[3]);
        console.log('  s_base_price:', insertData[4]);
        console.log('  s_pricing_type:', insertData[5]);
        console.log('  s_duration:', insertData[6]);
        console.log('  s_max_capacity:', insertData[7]);
        console.log('  s_city:', insertData[8]);
        console.log('  s_state:', insertData[9]);
        console.log('  s_address:', insertData[10]);
        console.log('  s_is_active:', insertData[11]);
        console.log('========================================');

        const [result] = await pool.query(`
            INSERT INTO service 
            (s_provider_id, s_name, s_description, s_category, s_base_price, s_pricing_type, 
             s_duration, s_max_capacity, s_city, s_state, s_address, s_is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, insertData);
        
        console.log('========================================');
        console.log('✅ SERVICE CREATED SUCCESSFULLY!');
        console.log('========================================');
        console.log('New Service ID:', result.insertId);
        console.log('Provider Database ID:', dbUserId);
        console.log('========================================');
        
        // Save service image if provided
        if (image && typeof image === 'string' && image.startsWith('data:image')) {
            try {
                // Save image to file and get file path
                const imagePath = saveBase64Image(image, result.insertId);
                
                // Store file path in service_image table as primary image
                await pool.query(`
                    INSERT INTO service_image 
                    (si_service_id, si_image_url, si_is_primary, si_order)
                    VALUES (?, ?, 1, 0)
                `, [result.insertId, imagePath]);
                console.log('✅ Service image saved successfully:', imagePath);
            } catch (imageErr) {
                console.error('⚠️  Failed to save service image:', imageErr);
                // Don't fail the entire request if image save fails
            }
        }
        
        return res.json({ ok: true, id: result.insertId, message: 'Service created successfully' });
    } catch (err) {
        console.log('========================================');
        console.log('❌ CREATE SERVICE FAILED:');
        console.log('========================================');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        console.error('Full Error:', err);
        console.log('========================================');
        return res.status(500).json({ ok: false, error: err.message || 'Database error' });
    }
});

// Update service status (activate/deactivate)
app.post('/api/services/:id/status', async (req, res) => {
    const id = Number(req.params.id);
    const { isActive } = req.body || {};
    if (!Number.isFinite(id) || typeof isActive !== 'boolean') {
        return res.status(400).json({ ok: false, error: 'Invalid parameters' });
    }
    try {
        const pool = getPool();
        await pool.query('UPDATE service SET s_is_active = ? WHERE idservice = ?', [isActive ? 1 : 0, id]);
        return res.json({ ok: true });
    } catch (err) {
        console.error('Update service status failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Update service
app.put('/api/services/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }

    const { name, description, category, basePrice, pricingType, duration, maxCapacity, city, state, address, latitude, longitude, image } = req.body || {};
    
    // Validate required fields
    if (!name || !category || basePrice === undefined || basePrice === null) {
        return res.status(400).json({ ok: false, error: 'Missing required fields: name, category, and basePrice are required' });
    }

    // Validate category
    const validCategories = ['venue', 'catering', 'photography', 'music', 'decoration', 'transportation', 'entertainment', 'planning', 'other'];
    if (!validCategories.includes(category.toLowerCase())) {
        return res.status(400).json({ ok: false, error: 'Invalid category' });
    }

    // Validate price
    const price = parseFloat(basePrice);
    if (isNaN(price) || price < 0) {
        return res.status(400).json({ ok: false, error: 'Invalid price' });
    }

    try {
        const pool = getPool();
        
        // Check if service exists and belongs to the provider
        const [existing] = await pool.query('SELECT s_provider_id FROM service WHERE idservice = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ ok: false, error: 'Service not found' });
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('s_name = ?');
            updateValues.push(name);
        }
        if (description !== undefined) {
            updateFields.push('s_description = ?');
            updateValues.push(description);
        }
        if (category !== undefined) {
            updateFields.push('s_category = ?');
            updateValues.push(category.toLowerCase());
        }
        if (basePrice !== undefined) {
            updateFields.push('s_base_price = ?');
            updateValues.push(price);
        }
        if (pricingType !== undefined) {
            updateFields.push('s_pricing_type = ?');
            updateValues.push(pricingType);
        }
        if (duration !== undefined) {
            updateFields.push('s_duration = ?');
            updateValues.push(parseInt(duration) || null);
        }
        if (maxCapacity !== undefined) {
            updateFields.push('s_max_capacity = ?');
            updateValues.push(parseInt(maxCapacity) || null);
        }
        if (city !== undefined) {
            updateFields.push('s_city = ?');
            updateValues.push(city || null);
        }
        if (state !== undefined) {
            updateFields.push('s_state = ?');
            updateValues.push(state || null);
        }
        // Handle address with coordinates (same as create endpoint)
        // Only update address if address, latitude, or longitude is provided
        if (address !== undefined || (latitude !== undefined && longitude !== undefined)) {
            let fullAddress = address || '';
            if (latitude !== undefined && longitude !== undefined && latitude !== '' && longitude !== '') {
                const lat = parseFloat(latitude);
                const lng = parseFloat(longitude);
                if (!isNaN(lat) && !isNaN(lng)) {
                    const coords = `${lat},${lng}`;
                    if (fullAddress) {
                        fullAddress = `${fullAddress} (${coords})`;
                    } else {
                        fullAddress = coords;
                    }
                }
            }
            updateFields.push('s_address = ?');
            updateValues.push(fullAddress || null);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ ok: false, error: 'No fields to update' });
        }

        // Add updated_at
        updateFields.push('s_updated_at = NOW()');
        updateValues.push(id);

        const query = `UPDATE service SET ${updateFields.join(', ')} WHERE idservice = ?`;
        await pool.query(query, updateValues);

        // Handle image update if provided
        if (image && typeof image === 'string' && image.startsWith('data:image')) {
            try {
                console.log('📸 Processing image update for service:', id);
                
                // Get existing image to delete old file
                const [existingImages] = await pool.query(
                    'SELECT si_image_url FROM service_image WHERE si_service_id = ? AND si_is_primary = 1',
                    [id]
                );
                
                // Delete old image file if it exists
                if (existingImages.length > 0 && existingImages[0].si_image_url) {
                    const oldImagePath = existingImages[0].si_image_url;
                    // Only delete if it's a file path (starts with /uploads), not base64
                    if (oldImagePath.startsWith('/uploads/')) {
                        const oldFilePath = path.join(__dirname, oldImagePath.replace('/uploads/', 'uploads/'));
                        if (fs.existsSync(oldFilePath)) {
                            try {
                                fs.unlinkSync(oldFilePath);
                                console.log('🗑️  Deleted old image file:', oldFilePath);
                            } catch (deleteErr) {
                                console.warn('⚠️  Could not delete old image file:', deleteErr.message);
                            }
                        } else {
                            console.log('ℹ️  Old image file not found (may have been deleted):', oldFilePath);
                        }
                    }
                }
                
                // Save new image to file
                console.log('💾 Saving new image to file...');
                const imagePath = saveBase64Image(image, id);
                console.log('✅ Image saved to:', imagePath);
                
                // Update or insert image record
                const [imageExists] = await pool.query(
                    'SELECT idimage FROM service_image WHERE si_service_id = ? AND si_is_primary = 1',
                    [id]
                );
                
                if (imageExists.length > 0) {
                    // Update existing image
                    await pool.query(
                        'UPDATE service_image SET si_image_url = ? WHERE si_service_id = ? AND si_is_primary = 1',
                        [imagePath, id]
                    );
                    console.log('✅ Updated existing image record');
                } else {
                    // Insert new image
                    await pool.query(`
                        INSERT INTO service_image 
                        (si_service_id, si_image_url, si_is_primary, si_order)
                        VALUES (?, ?, 1, 0)
                    `, [id, imagePath]);
                    console.log('✅ Inserted new image record');
                }
                
                console.log('✅ Service image updated successfully:', imagePath);
            } catch (imageErr) {
                console.error('❌ Failed to update service image:', imageErr);
                console.error('Error details:', imageErr.message);
                console.error('Stack:', imageErr.stack);
                // Don't fail the entire request if image update fails
            }
        } else if (image) {
            console.log('ℹ️  Image provided but not in base64 format, skipping image update');
        }

        return res.json({ ok: true, message: 'Service updated successfully' });
    } catch (err) {
        console.error('Update service failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: err.message || 'Database error' });
    }
});

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

app.get('/api/user/messages/count', async (req, res) => {
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
        const [countRows] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM message m
            INNER JOIN conversation_participant cp ON m.m_conversation_id = cp.cp_conversation_id
            WHERE cp.cp_user_id = ? AND m.m_sender_id != ? AND m.m_is_read = 0
        `, [userId, userId]);
        return res.json({ ok: true, count: countRows[0].count || 0 });
    } catch (err) {
        console.error('Get messages count failed:', err.code, err.message);
        return res.json({ ok: true, count: 0 }); // Return 0 on error to not break UI
    }
});

// Get or create conversation for a booking
app.post('/api/bookings/:id/conversation', async (req, res) => {
    const bookingId = Number(req.params.id);
    const { userEmail } = req.body || {};
    
    if (!Number.isFinite(bookingId) || !userEmail) {
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
        
        // Get booking and verify it belongs to user
        const [bookingRows] = await pool.query(
            'SELECT b_client_id, b_status FROM booking WHERE idbooking = ?',
            [bookingId]
        );
        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        const booking = bookingRows[0];
        
        if (booking.b_client_id !== userId) {
            return res.status(403).json({ ok: false, error: 'You do not have permission to access this booking' });
        }
        
        // Check if booking is confirmed
        if (booking.b_status !== 'confirmed') {
            return res.status(400).json({ ok: false, error: 'Booking must be confirmed to start messaging' });
        }
        
        // Get provider ID from booking services
        const [serviceRows] = await pool.query(`
            SELECT DISTINCT s.s_provider_id
            FROM booking_service bs
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            WHERE bs.bs_booking_id = ?
            LIMIT 1
        `, [bookingId]);
        
        if (serviceRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'No services found for this booking' });
        }
        const providerId = serviceRows[0].s_provider_id;
        
        // Check if conversation already exists for this booking
        const [existingConv] = await pool.query(
            'SELECT idconversation FROM conversation WHERE c_booking_id = ?',
            [bookingId]
        );
        
        let conversationId;
        if (existingConv.length > 0) {
            conversationId = existingConv[0].idconversation;
        } else {
            // Create new conversation
            const [convResult] = await pool.query(`
                INSERT INTO conversation (c_booking_id, c_subject, c_priority, c_is_active)
                VALUES (?, ?, 'medium', 1)
            `, [bookingId, `Booking #${bookingId}`]);
            conversationId = convResult.insertId;
            
            // Add participants (user and provider)
            await pool.query(`
                INSERT INTO conversation_participant (cp_conversation_id, cp_user_id, cp_unread_count)
                VALUES (?, ?, 0), (?, ?, 0)
            `, [conversationId, userId, conversationId, providerId]);
        }
        
        // Get conversation details
        const [convDetails] = await pool.query(`
            SELECT c.*, 
                   GROUP_CONCAT(cp.cp_user_id) as participant_ids
            FROM conversation c
            LEFT JOIN conversation_participant cp ON c.idconversation = cp.cp_conversation_id
            WHERE c.idconversation = ?
            GROUP BY c.idconversation
        `, [conversationId]);
        
        return res.json({ ok: true, conversation: convDetails[0] });
    } catch (err) {
        console.error('Get or create booking conversation failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get provider ID from booking
app.get('/api/bookings/:id/provider', async (req, res) => {
    const bookingId = Number(req.params.id);
    
    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }
    
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT DISTINCT s.s_provider_id, u.u_email as provider_email,
                   CONCAT(u.u_fname, ' ', u.u_lname) as provider_name
            FROM booking_service bs
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            INNER JOIN user u ON s.s_provider_id = u.iduser
            WHERE bs.bs_booking_id = ?
            LIMIT 1
        `, [bookingId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found for this booking' });
        }
        
        return res.json({ ok: true, provider: rows[0] });
    } catch (err) {
        console.error('Get booking provider failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// ============================================
// MESSAGING API ENDPOINTS
// ============================================

// Get user conversations
app.get('/api/user/conversations', async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ ok: false, error: 'Email required' });
    }
    try {
        const pool = getPool();
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [email]);
        if (userRows.length === 0) {
            return res.json({ ok: true, conversations: [] });
        }
        const userId = userRows[0].iduser;
        
        const [conversations] = await pool.query(`
            SELECT c.*, 
                   (SELECT m.m_content FROM message m 
                    WHERE m.m_conversation_id = c.idconversation 
                    ORDER BY m.m_created_at DESC LIMIT 1) as last_message,
                   (SELECT m.m_created_at FROM message m 
                    WHERE m.m_conversation_id = c.idconversation 
                    ORDER BY m.m_created_at DESC LIMIT 1) as last_message_time,
                   (SELECT COUNT(*) FROM message m 
                    INNER JOIN conversation_participant cp ON m.m_conversation_id = cp.cp_conversation_id
                    WHERE cp.cp_user_id = ? AND m.m_sender_id != ? AND m.m_is_read = 0 
                    AND m.m_conversation_id = c.idconversation) as unread_count
            FROM conversation c
            INNER JOIN conversation_participant cp ON c.idconversation = cp.cp_conversation_id
            WHERE cp.cp_user_id = ?
            ORDER BY c.c_updated_at DESC
        `, [userId, userId, userId]);
        
        // Get other participant info for each conversation
        for (const conv of conversations) {
            const [participants] = await pool.query(`
                SELECT cp.cp_user_id, u.u_email, CONCAT(u.u_fname, ' ', u.u_lname) as name
                FROM conversation_participant cp
                INNER JOIN user u ON cp.cp_user_id = u.iduser
                WHERE cp.cp_conversation_id = ? AND cp.cp_user_id != ?
            `, [conv.idconversation, userId]);
            conv.other_participant = participants[0] || null;
        }
        
        return res.json({ ok: true, conversations });
    } catch (err) {
        console.error('Get conversations failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get conversation messages
app.get('/api/conversations/:id/messages', async (req, res) => {
    const conversationId = Number(req.params.id);
    if (!Number.isFinite(conversationId)) {
        return res.status(400).json({ ok: false, error: 'Invalid conversation ID' });
    }
    try {
        const pool = getPool();
        const [messages] = await pool.query(`
            SELECT m.*, 
                   CONCAT(u.u_fname, ' ', u.u_lname) as sender_name,
                   u.u_email as sender_email
            FROM message m
            INNER JOIN user u ON m.m_sender_id = u.iduser
            WHERE m.m_conversation_id = ?
            ORDER BY m.m_created_at ASC
        `, [conversationId]);
        
        return res.json({ ok: true, messages });
    } catch (err) {
        console.error('Get messages failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Send message
app.post('/api/conversations/:id/messages', async (req, res) => {
    const conversationId = Number(req.params.id);
    const { userEmail, content } = req.body || {};
    
    if (!Number.isFinite(conversationId) || !userEmail || !content) {
        return res.status(400).json({ ok: false, error: 'Invalid request' });
    }
    
    try {
        const pool = getPool();
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;
        
        // Verify user is participant in conversation
        const [participantRows] = await pool.query(
            'SELECT cp_user_id FROM conversation_participant WHERE cp_conversation_id = ? AND cp_user_id = ?',
            [conversationId, userId]
        );
        if (participantRows.length === 0) {
            return res.status(403).json({ ok: false, error: 'You are not a participant in this conversation' });
        }
        
        // Get other participant
        const [otherParticipantRows] = await pool.query(
            'SELECT cp_user_id FROM conversation_participant WHERE cp_conversation_id = ? AND cp_user_id != ?',
            [conversationId, userId]
        );
        if (otherParticipantRows.length === 0) {
            return res.status(400).json({ ok: false, error: 'No other participant found' });
        }
        
        // Insert message
        const [result] = await pool.query(`
            INSERT INTO message (m_conversation_id, m_sender_id, m_content, m_message_type, m_is_read)
            VALUES (?, ?, ?, 'text', 0)
        `, [conversationId, userId, content.trim()]);
        
        // Update conversation updated_at
        await pool.query(
            'UPDATE conversation SET c_updated_at = NOW() WHERE idconversation = ?',
            [conversationId]
        );
        
        // Increment unread count for other participant
        await pool.query(`
            UPDATE conversation_participant 
            SET cp_unread_count = cp_unread_count + 1 
            WHERE cp_conversation_id = ? AND cp_user_id = ?
        `, [conversationId, otherParticipantRows[0].cp_user_id]);
        
        // Get the created message
        const [messageRows] = await pool.query(`
            SELECT m.*, 
                   CONCAT(u.u_fname, ' ', u.u_lname) as sender_name,
                   u.u_email as sender_email
            FROM message m
            INNER JOIN user u ON m.m_sender_id = u.iduser
            WHERE m.idmessage = ?
        `, [result.insertId]);
        
        return res.json({ ok: true, message: messageRows[0] });
    } catch (err) {
        console.error('Send message failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Mark messages as read
app.post('/api/conversations/:id/read', async (req, res) => {
    const conversationId = Number(req.params.id);
    const { userEmail } = req.body || {};
    
    if (!Number.isFinite(conversationId) || !userEmail) {
        return res.status(400).json({ ok: false, error: 'Invalid request' });
    }
    
    try {
        const pool = getPool();
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;
        
        // Mark all messages in conversation as read for this user
        await pool.query(`
            UPDATE message m
            INNER JOIN conversation_participant cp ON m.m_conversation_id = cp.cp_conversation_id
            SET m.m_is_read = 1
            WHERE m.m_conversation_id = ? AND m.m_sender_id != ? AND m.m_is_read = 0
        `, [conversationId, userId]);
        
        // Reset unread count
        await pool.query(`
            UPDATE conversation_participant 
            SET cp_unread_count = 0 
            WHERE cp_conversation_id = ? AND cp_user_id = ?
        `, [conversationId, userId]);
        
        return res.json({ ok: true });
    } catch (err) {
        console.error('Mark messages as read failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

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
                console.log('✅ Using provider PayMongo credentials:', {
                    providerName: providerCredentials.providerName,
                    providerEmail: providerCredentials.providerEmail,
                    mode: providerCredentials.mode,
                    secretKeyPrefix: providerCredentials.secretKey.substring(0, 10) + '...',
                });
            } else {
                console.log('⚠️  Provider found but no PayMongo credentials configured:', {
                    providerEmail: providerWithCredentials.u_email,
                    providerName: `${providerWithCredentials.u_fname || ''} ${providerWithCredentials.u_lname || ''}`.trim(),
                });
                console.log('⚠️  Falling back to global PayMongo config');
            }
        } else {
            console.log('⚠️  No provider found for booking, using global PayMongo config');
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
                        <div class="success-icon">✓</div>
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
                    <div class="error-icon">✕</div>
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
                    if (window.opener) {
                        window.opener.postMessage('payment-failed', '*');
                        setTimeout(() => {
                            window.close();
                        }, 500);
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
        
        // Get bookings for services owned by this provider
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
                GROUP_CONCAT(s.s_name SEPARATOR ', ') as service_name
            FROM booking b
            INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            LEFT JOIN user u ON b.b_client_id = u.iduser
            WHERE s.s_provider_id = ?
            GROUP BY b.idbooking, b.b_event_name, b.b_event_date, b.b_start_time, b.b_end_time, 
                     b.b_location, b.b_total_cost, b.b_status, b.b_created_at, 
                     u.u_fname, u.u_lname, u.u_email
            ORDER BY b.b_event_date DESC, b.b_created_at DESC
        `, [userId]);
        
        return res.json({ ok: true, rows });
    } catch (err) {
        console.error('Get provider bookings failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
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
        
        // Check for overlapping bookings for the same service on the same date
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
                 (b.b_start_time >= ? AND b.b_end_time <= ?)
             )`,
            [serviceId, eventDate, endTime, startTime, startTime, endTime, startTime, endTime]
        );
        
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
        
        // Get service details for pricing
        const [serviceRows] = await pool.query('SELECT s_base_price, s_duration, s_category FROM service WHERE idservice = ?', [serviceId]);
        if (serviceRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Service not found' });
        }
        const basePrice = parseFloat(serviceRows[0].s_base_price) || 0;
        const serviceDuration = parseInt(serviceRows[0].s_duration) || 60; // Default to 60 minutes
        const serviceCategory = serviceRows[0].s_category || '';
        
        let calculatedCost = 0;
        
        // For catering services, calculate based on attendees (per pax)
        if (serviceCategory.toLowerCase() === 'catering') {
            const numAttendees = parseInt(attendees) || 1;
            calculatedCost = basePrice * numAttendees;
        } else {
            // For other services, calculate based on duration (per minute)
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
        
        return res.json({ ok: true, id: bookingId, message: 'Booking created successfully' });
    } catch (err) {
        console.error('Create booking failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Update booking status
app.post('/api/bookings/:id/status', async (req, res) => {
    const id = Number(req.params.id);
    const { status, userEmail } = req.body || {};
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
        
        await pool.query('UPDATE booking SET b_status = ? WHERE idbooking = ?', [status, id]);
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
// PROVIDER DASHBOARD STATS API ENDPOINT
// ============================================

// Get provider dashboard statistics
app.get('/api/provider/dashboard/stats', async (req, res) => {
    const providerEmail = req.query.providerEmail;
    const providerId = req.query.providerId; // Firebase UID (fallback)
    
    if (!providerEmail && !providerId) {
        return res.status(400).json({ ok: false, error: 'Provider email or ID is required' });
    }
    
    try {
        const pool = getPool();
        
        // Get provider's database user ID
        let userId;
        if (providerEmail) {
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
            if (userRows.length === 0) {
                return res.json({ 
                    ok: true, 
                    stats: {
                        totalServices: 0,
                        activeServices: 0,
                        totalBookings: 0,
                        pendingBookings: 0,
                        confirmedBookings: 0,
                        completedBookings: 0,
                        cancelledBookings: 0,
                        totalRevenue: 0,
                        monthlyRevenue: 0,
                        totalProposals: 0,
                        activeProposals: 0,
                        averageRating: 0
                    }
                });
            }
            userId = userRows[0].iduser;
        } else if (providerId && providerId.includes('@')) {
            // If providerId is actually an email
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerId]);
            if (userRows.length === 0) {
                return res.json({ 
                    ok: true, 
                    stats: {
                        totalServices: 0,
                        activeServices: 0,
                        totalBookings: 0,
                        pendingBookings: 0,
                        confirmedBookings: 0,
                        completedBookings: 0,
                        cancelledBookings: 0,
                        totalRevenue: 0,
                        monthlyRevenue: 0,
                        totalProposals: 0,
                        activeProposals: 0,
                        averageRating: 0
                    }
                });
            }
            userId = userRows[0].iduser;
        } else {
            // Firebase UID - would need a mapping table, for now return empty
            return res.json({ 
                ok: true, 
                stats: {
                    totalServices: 0,
                    activeServices: 0,
                    totalBookings: 0,
                    pendingBookings: 0,
                    confirmedBookings: 0,
                    completedBookings: 0,
                    cancelledBookings: 0,
                    totalRevenue: 0,
                    monthlyRevenue: 0,
                    totalProposals: 0,
                    activeProposals: 0,
                    averageRating: 0
                }
            });
        }
        
        // Get service stats
        const [serviceStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_services,
                SUM(CASE WHEN s_is_active = 1 THEN 1 ELSE 0 END) as active_services,
                COALESCE(AVG(s_rating), 0) as average_rating
            FROM service
            WHERE s_provider_id = ?
        `, [userId]);
        
        // Get booking stats for provider's services
        const [bookingStats] = await pool.query(`
            SELECT 
                COUNT(DISTINCT b.idbooking) as total_bookings,
                SUM(CASE WHEN b.b_status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
                SUM(CASE WHEN b.b_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
                SUM(CASE WHEN b.b_status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
                SUM(CASE WHEN b.b_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
                COALESCE(SUM(CASE WHEN b.b_status = 'completed' THEN b.b_total_cost ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN b.b_status = 'completed' 
                                  AND MONTH(b.b_created_at) = MONTH(CURRENT_DATE()) 
                                  AND YEAR(b.b_created_at) = YEAR(CURRENT_DATE())
                             THEN b.b_total_cost ELSE 0 END), 0) as monthly_revenue
            FROM booking b
            INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            WHERE s.s_provider_id = ?
        `, [userId]);
        
        // Get proposal stats
        const [proposalStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_proposals,
                SUM(CASE WHEN p_status IN ('submitted', 'under_review', 'accepted', 'revised') THEN 1 ELSE 0 END) as active_proposals
            FROM proposal
            WHERE p_provider_id = ?
        `, [userId]);
        
        return res.json({
            ok: true,
            stats: {
                totalServices: parseInt(serviceStats[0].total_services) || 0,
                activeServices: parseInt(serviceStats[0].active_services) || 0,
                totalBookings: parseInt(bookingStats[0].total_bookings) || 0,
                pendingBookings: parseInt(bookingStats[0].pending_bookings) || 0,
                confirmedBookings: parseInt(bookingStats[0].confirmed_bookings) || 0,
                completedBookings: parseInt(bookingStats[0].completed_bookings) || 0,
                cancelledBookings: parseInt(bookingStats[0].cancelled_bookings) || 0,
                totalRevenue: parseFloat(bookingStats[0].total_revenue) || 0,
                monthlyRevenue: parseFloat(bookingStats[0].monthly_revenue) || 0,
                totalProposals: parseInt(proposalStats[0].total_proposals) || 0,
                activeProposals: parseInt(proposalStats[0].active_proposals) || 0,
                averageRating: parseFloat(serviceStats[0].average_rating) || 0
            }
        });
    } catch (err) {
        console.error('Get provider dashboard stats failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// ============================================
// PROVIDER RECENT ACTIVITY API ENDPOINT
// ============================================

// Get provider's recent activity
app.get('/api/provider/activity', async (req, res) => {
    const providerEmail = req.query.providerEmail;
    const providerId = req.query.providerId;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!providerEmail && !providerId) {
        return res.status(400).json({ ok: false, error: 'Provider email or ID is required' });
    }
    
    try {
        const pool = getPool();
        
        // Get provider's database user ID
        let userId;
        if (providerEmail) {
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
            if (userRows.length === 0) {
                return res.json({ ok: true, activities: [] });
            }
            userId = userRows[0].iduser;
        } else if (providerId && providerId.includes('@')) {
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerId]);
            if (userRows.length === 0) {
                return res.json({ ok: true, activities: [] });
            }
            userId = userRows[0].iduser;
        } else {
            return res.json({ ok: true, activities: [] });
        }
        
        // Get provider's service IDs
        const [serviceRows] = await pool.query('SELECT idservice FROM service WHERE s_provider_id = ?', [userId]);
        const serviceIds = serviceRows.map(s => s.idservice);
        
        const activities = [];
        
        // Get recent bookings for provider's services
        if (serviceIds.length > 0) {
            const [bookings] = await pool.query(`
                SELECT 
                    'booking' as type,
                    'New booking received' as description,
                    b.b_created_at as created_at,
                    b.idbooking as entity_id,
                    CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                    s.s_name as service_name
                FROM booking b
                LEFT JOIN user u ON b.b_client_id = u.iduser
                LEFT JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
                LEFT JOIN service s ON bs.bs_service_id = s.idservice
                WHERE bs.bs_service_id IN (${serviceIds.map(() => '?').join(',')})
                ORDER BY b.b_created_at DESC
                LIMIT ?
            `, [...serviceIds, limit]);
            
            activities.push(...bookings.map(b => ({
                type: b.type,
                description: b.description,
                created_at: b.created_at,
                entity_id: b.entity_id,
                metadata: {
                    client_name: b.client_name,
                    service_name: b.service_name
                }
            })));
        }
        
        // Get recent service updates
        const [serviceUpdates] = await pool.query(`
            SELECT 
                'service' as type,
                'Service updated' as description,
                s.s_updated_at as created_at,
                s.idservice as entity_id,
                s.s_name as service_name
            FROM service s
            WHERE s.s_provider_id = ? AND s.s_updated_at != s.s_created_at
            ORDER BY s.s_updated_at DESC
            LIMIT ?
        `, [userId, limit]);
        
        activities.push(...serviceUpdates.map(s => ({
            type: s.type,
            description: s.description,
            created_at: s.created_at,
            entity_id: s.entity_id,
            metadata: {
                service_name: s.service_name
            }
        })));
        
        // Get recent payments for provider's services
        if (serviceIds.length > 0) {
            const [payments] = await pool.query(`
                SELECT 
                    'payment' as type,
                    'Payment received' as description,
                    p.p_paid_at as created_at,
                    p.idpayment as entity_id,
                    p.p_amount as amount,
                    b.idbooking as booking_id,
                    s.s_name as service_name
                FROM payment p
                LEFT JOIN booking b ON p.p_booking_id = b.idbooking
                LEFT JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
                LEFT JOIN service s ON bs.bs_service_id = s.idservice
                WHERE bs.bs_service_id IN (${serviceIds.map(() => '?').join(',')})
                    AND p.p_status = 'completed'
                    AND p.p_paid_at IS NOT NULL
                ORDER BY p.p_paid_at DESC
                LIMIT ?
            `, [...serviceIds, limit]);
            
            activities.push(...payments.map(p => ({
                type: p.type,
                description: p.description,
                created_at: p.created_at,
                entity_id: p.entity_id,
                metadata: {
                    amount: p.amount,
                    service_name: p.service_name
                }
            })));
        }
        
        // Sort all activities by created_at (most recent first) and limit
        activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const limitedActivities = activities.slice(0, limit);
        
        return res.json({ ok: true, activities: limitedActivities });
    } catch (err) {
        console.error('Get provider activity failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// ============================================
// DASHBOARD STATS API ENDPOINT
// ============================================

// Get dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const pool = getPool();
        
        // Get user stats
        const [userStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN u_disabled = 0 THEN 1 ELSE 0 END) as active_users
            FROM user
            WHERE u_email != 'admin@gmail.com'
        `);
        
        // Get service stats
        const [serviceStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_services,
                SUM(CASE WHEN s_is_active = 1 THEN 1 ELSE 0 END) as active_services
            FROM service
        `);
        
        // Get booking stats
        const [bookingStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_bookings,
                SUM(CASE WHEN b_status = 'pending' THEN 1 ELSE 0 END) as pending_bookings
            FROM booking
        `);
        
        // Get revenue stats
        const [revenueStats] = await pool.query(`
            SELECT 
                COALESCE(SUM(b_total_cost), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN MONTH(b_created_at) = MONTH(CURRENT_DATE()) 
                                  AND YEAR(b_created_at) = YEAR(CURRENT_DATE()) 
                             THEN b_total_cost ELSE 0 END), 0) as monthly_revenue
            FROM booking
            WHERE b_status = 'completed'
        `);
        
        return res.json({
            ok: true,
            stats: {
                totalUsers: userStats[0].total_users || 0,
                activeUsers: userStats[0].active_users || 0,
                totalServices: serviceStats[0].total_services || 0,
                activeServices: serviceStats[0].active_services || 0,
                totalBookings: bookingStats[0].total_bookings || 0,
                pendingBookings: bookingStats[0].pending_bookings || 0,
                totalRevenue: parseFloat(revenueStats[0].total_revenue) || 0,
                monthlyRevenue: parseFloat(revenueStats[0].monthly_revenue) || 0
            }
        });
    } catch (err) {
        console.error('Get dashboard stats failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// ============================================
// ADMIN ANALYTICS API ENDPOINT
// ============================================

// Get admin analytics data
app.get('/api/admin/analytics', async (req, res) => {
    try {
        const pool = getPool();
        
        // Get current period (this month) and previous period (last month) dates
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        
        // 1. Total Revenue (current month vs last month)
        const [currentRevenue] = await pool.query(`
            SELECT COALESCE(SUM(b_total_cost), 0) as revenue
            FROM booking
            WHERE b_status IN ('confirmed', 'completed')
            AND MONTH(b_created_at) = MONTH(CURRENT_DATE())
            AND YEAR(b_created_at) = YEAR(CURRENT_DATE())
        `);
        
        const [previousRevenue] = await pool.query(`
            SELECT COALESCE(SUM(b_total_cost), 0) as revenue
            FROM booking
            WHERE b_status IN ('confirmed', 'completed')
            AND MONTH(b_created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            AND YEAR(b_created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        `);
        
        const totalRevenue = parseFloat(currentRevenue[0].revenue) || 0;
        const prevTotalRevenue = parseFloat(previousRevenue[0].revenue) || 0;
        const revenueChange = prevTotalRevenue > 0 
            ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100).toFixed(1)
            : totalRevenue > 0 ? '100' : '0';
        const revenueTrend = totalRevenue >= prevTotalRevenue ? 'up' : 'down';
        
        // 2. Active Users (non-disabled users) - change based on new registrations
        const [currentActiveUsers] = await pool.query(`
            SELECT COUNT(*) as active_users
            FROM user
            WHERE u_disabled = 0
            AND u_email != 'admin@gmail.com'
        `);
        
        // Get new users this month and last month for change calculation
        const [newUsersThisMonth] = await pool.query(`
            SELECT COUNT(*) as new_users
            FROM user
            WHERE u_email != 'admin@gmail.com'
            AND MONTH(u_created_at) = MONTH(CURRENT_DATE())
            AND YEAR(u_created_at) = YEAR(CURRENT_DATE())
        `);
        
        const [newUsersLastMonth] = await pool.query(`
            SELECT COUNT(*) as new_users
            FROM user
            WHERE u_email != 'admin@gmail.com'
            AND MONTH(u_created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            AND YEAR(u_created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        `);
        
        const activeUsers = parseInt(currentActiveUsers[0].active_users) || 0;
        const newUsersCurrent = parseInt(newUsersThisMonth[0].new_users) || 0;
        const newUsersPrevious = parseInt(newUsersLastMonth[0].new_users) || 0;
        // Calculate change based on new user growth rate
        const usersChange = newUsersPrevious > 0
            ? ((newUsersCurrent - newUsersPrevious) / newUsersPrevious * 100).toFixed(1)
            : newUsersCurrent > 0 ? '100' : '0';
        const usersTrend = newUsersCurrent >= newUsersPrevious ? 'up' : 'down';
        
        // 3. Total Bookings (current month vs last month)
        const [currentBookings] = await pool.query(`
            SELECT COUNT(*) as total_bookings
            FROM booking
            WHERE MONTH(b_created_at) = MONTH(CURRENT_DATE())
            AND YEAR(b_created_at) = YEAR(CURRENT_DATE())
        `);
        
        const [previousBookings] = await pool.query(`
            SELECT COUNT(*) as total_bookings
            FROM booking
            WHERE MONTH(b_created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            AND YEAR(b_created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        `);
        
        const totalBookings = parseInt(currentBookings[0].total_bookings) || 0;
        const prevTotalBookings = parseInt(previousBookings[0].total_bookings) || 0;
        const bookingsChange = prevTotalBookings > 0
            ? ((totalBookings - prevTotalBookings) / prevTotalBookings * 100).toFixed(1)
            : totalBookings > 0 ? '100' : '0';
        const bookingsTrend = totalBookings >= prevTotalBookings ? 'up' : 'down';
        
        // 4. Average Booking Value (current month vs last month)
        const [currentAvgBooking] = await pool.query(`
            SELECT COALESCE(AVG(b_total_cost), 0) as avg_value
            FROM booking
            WHERE b_status IN ('confirmed', 'completed')
            AND MONTH(b_created_at) = MONTH(CURRENT_DATE())
            AND YEAR(b_created_at) = YEAR(CURRENT_DATE())
        `);
        
        const [previousAvgBooking] = await pool.query(`
            SELECT COALESCE(AVG(b_total_cost), 0) as avg_value
            FROM booking
            WHERE b_status IN ('confirmed', 'completed')
            AND MONTH(b_created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            AND YEAR(b_created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        `);
        
        const avgBookingValue = parseFloat(currentAvgBooking[0].avg_value) || 0;
        const prevAvgBookingValue = parseFloat(previousAvgBooking[0].avg_value) || 0;
        const avgBookingChange = prevAvgBookingValue > 0
            ? ((avgBookingValue - prevAvgBookingValue) / prevAvgBookingValue * 100).toFixed(1)
            : avgBookingValue > 0 ? '100' : '0';
        const avgBookingTrend = avgBookingValue >= prevAvgBookingValue ? 'up' : 'down';
        
        // 5. Monthly Revenue for last 12 months
        const [monthlyRevenue] = await pool.query(`
            SELECT 
                MONTH(b_created_at) as month,
                YEAR(b_created_at) as year,
                COALESCE(SUM(b_total_cost), 0) as revenue
            FROM booking
            WHERE b_status IN ('confirmed', 'completed')
            AND b_created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
            GROUP BY YEAR(b_created_at), MONTH(b_created_at)
            ORDER BY year, month
        `);
        
        // Create array for 12 months with revenue data
        const monthlyRevenueData = [];
        const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
        const revenueMap = {};
        monthlyRevenue.forEach(row => {
            const key = `${row.year}-${row.month}`;
            revenueMap[key] = parseFloat(row.revenue) || 0;
        });
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const key = `${year}-${month}`;
            monthlyRevenueData.push({
                month: monthLabels[date.getMonth()],
                revenue: revenueMap[key] || 0
            });
        }
        
        // 6. User Growth Metrics (reuse variables from section 2)
        // newUsersThisMonth and activeUsers are already calculated above
        
        // Conversion rate: bookings / active users
        const conversionRate = activeUsers > 0 
            ? ((totalBookings / activeUsers) * 100).toFixed(1)
            : '0';
        
        // 7. Top Performing Services
        const [topServices] = await pool.query(`
            SELECT 
                s.s_name as service_name,
                COUNT(bs.bs_booking_id) as booking_count,
                COALESCE(SUM(bs.bs_total_price), 0) as total_revenue
            FROM service s
            INNER JOIN booking_service bs ON s.idservice = bs.bs_service_id
            INNER JOIN booking b ON bs.bs_booking_id = b.idbooking
            WHERE b.b_status IN ('confirmed', 'completed')
            GROUP BY s.idservice, s.s_name
            ORDER BY booking_count DESC, total_revenue DESC
            LIMIT 10
        `);
        
        // 8. Booking Status Distribution
        const [statusDistribution] = await pool.query(`
            SELECT 
                b_status,
                COUNT(*) as count
            FROM booking
            GROUP BY b_status
        `);
        
        const totalStatusCount = statusDistribution.reduce((sum, row) => sum + parseInt(row.count), 0);
        const statusData = statusDistribution.map(row => {
            const count = parseInt(row.count) || 0;
            const percentage = totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0;
            let color = '#3b82f6';
            if (row.b_status === 'pending') color = '#f59e0b';
            else if (row.b_status === 'completed') color = '#10b981';
            else if (row.b_status === 'cancelled') color = '#ef4444';
            
            return {
                status: row.b_status.charAt(0).toUpperCase() + row.b_status.slice(1),
                count: count,
                percentage: percentage,
                color: color
            };
        });
        
        return res.json({
            ok: true,
            analytics: {
                totalRevenue: {
                    value: totalRevenue,
                    change: revenueChange,
                    trend: revenueTrend
                },
                activeUsers: {
                    value: activeUsers,
                    change: usersChange,
                    trend: usersTrend
                },
                totalBookings: {
                    value: totalBookings,
                    change: bookingsChange,
                    trend: bookingsTrend
                },
                avgBookingValue: {
                    value: avgBookingValue,
                    change: avgBookingChange,
                    trend: avgBookingTrend
                },
                monthlyRevenue: monthlyRevenueData,
                userGrowth: {
                    newUsersThisMonth: newUsersCurrent,
                    activeUsers: activeUsers,
                    conversionRate: conversionRate
                },
                topServices: topServices.map(row => ({
                    name: row.service_name,
                    bookings: parseInt(row.booking_count) || 0,
                    revenue: parseFloat(row.total_revenue) || 0
                })),
                bookingStatusDistribution: statusData
            }
        });
    } catch (err) {
        console.error('Get admin analytics failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// ============================================
// PROVIDER PAYMENT LINK API ENDPOINTS
// ============================================

// Get provider's PayMongo payment link
app.get('/api/provider/payment-link', async (req, res) => {
    const providerEmail = req.query.providerEmail;
    
    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }
    
    try {
        const pool = getPool();
        
        // Ensure column exists
        try {
            await pool.query('SELECT u_paymongo_payment_link FROM `user` LIMIT 1');
        } catch (checkErr) {
            if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_payment_link VARCHAR(500) DEFAULT NULL');
            }
        }
        
        const [userRows] = await pool.query(
            'SELECT u_paymongo_payment_link FROM `user` WHERE u_email = ? AND u_role = ?',
            [providerEmail, 'provider']
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }
        
        return res.json({
            ok: true,
            paymentLink: userRows[0].u_paymongo_payment_link || null
        });
    } catch (err) {
        console.error('Get provider payment link failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Update provider's PayMongo payment link
app.post('/api/provider/payment-link', async (req, res) => {
    const { providerEmail, paymentLink } = req.body || {};
    
    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }
    
    if (!paymentLink || typeof paymentLink !== 'string' || paymentLink.trim() === '') {
        return res.status(400).json({ ok: false, error: 'Payment link is required' });
    }
    
    // Validate PayMongo payment link format
    const paymongoLinkPattern = /^https?:\/\/(paymongo\.page|l\.paymongo\.com)\//;
    if (!paymongoLinkPattern.test(paymentLink.trim())) {
        return res.status(400).json({ 
            ok: false, 
            error: 'Invalid PayMongo payment link format. Must be a valid PayMongo payment page URL.' 
        });
    }
    
    try {
        const pool = getPool();
        
        // Ensure column exists
        try {
            await pool.query('SELECT u_paymongo_payment_link FROM `user` LIMIT 1');
        } catch (checkErr) {
            if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_payment_link VARCHAR(500) DEFAULT NULL');
            }
        }
        
        // Verify user is a provider
        const [userRows] = await pool.query(
            'SELECT iduser FROM `user` WHERE u_email = ? AND u_role = ?',
            [providerEmail, 'provider']
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }
        
        // Update payment link
        await pool.query(
            'UPDATE `user` SET u_paymongo_payment_link = ? WHERE u_email = ? AND u_role = ?',
            [paymentLink.trim(), providerEmail, 'provider']
        );
        
        return res.json({
            ok: true,
            message: 'Payment link updated successfully',
            paymentLink: paymentLink.trim()
        });
    } catch (err) {
        console.error('Update provider payment link failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Save provider's PayMongo credentials
app.post('/api/provider/paymongo-credentials', async (req, res) => {
    const { providerEmail, secretKey, publicKey, mode } = req.body || {};
    
    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }
    
    if (!secretKey || typeof secretKey !== 'string' || secretKey.trim() === '') {
        return res.status(400).json({ ok: false, error: 'Secret key is required' });
    }
    
    // Validate secret key format (should start with sk_test_ or sk_live_)
    const secretKeyPattern = /^sk_(test|live)_/;
    if (!secretKeyPattern.test(secretKey.trim())) {
        return res.status(400).json({ 
            ok: false, 
            error: 'Invalid secret key format. Must start with sk_test_ or sk_live_' 
        });
    }
    
    // Validate public key format if provided (should start with pk_test_ or pk_live_)
    if (publicKey && publicKey.trim() !== '') {
        const publicKeyPattern = /^pk_(test|live)_/;
        if (!publicKeyPattern.test(publicKey.trim())) {
            return res.status(400).json({ 
                ok: false, 
                error: 'Invalid public key format. Must start with pk_test_ or pk_live_' 
            });
        }
        
        // Ensure secret and public keys match in mode
        const secretMode = secretKey.trim().startsWith('sk_test_') ? 'test' : 'live';
        const publicMode = publicKey.trim().startsWith('pk_test_') ? 'test' : 'live';
        if (secretMode !== publicMode) {
            return res.status(400).json({ 
                ok: false, 
                error: 'Secret key and public key must be from the same mode (both TEST or both LIVE)' 
            });
        }
    }
    
    // Validate mode if provided
    const validModes = ['test', 'live'];
    const finalMode = mode || (secretKey.trim().startsWith('sk_test_') ? 'test' : 'live');
    if (!validModes.includes(finalMode)) {
        return res.status(400).json({ 
            ok: false, 
            error: 'Mode must be either "test" or "live"' 
        });
    }
    
    try {
        const pool = getPool();
        
        // Ensure columns exist
        try {
            await pool.query('SELECT u_paymongo_secret_key, u_paymongo_public_key, u_paymongo_mode FROM `user` LIMIT 1');
        } catch (checkErr) {
            if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
                // Add columns if they don't exist
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_secret_key VARCHAR(500) DEFAULT NULL');
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_public_key VARCHAR(500) DEFAULT NULL');
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_mode VARCHAR(10) DEFAULT NULL');
            }
        }
        
        // Verify user is a provider
        const [userRows] = await pool.query(
            'SELECT iduser FROM `user` WHERE u_email = ? AND u_role = ?',
            [providerEmail, 'provider']
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }
        
        // Update credentials
        await pool.query(
            'UPDATE `user` SET u_paymongo_secret_key = ?, u_paymongo_public_key = ?, u_paymongo_mode = ? WHERE u_email = ? AND u_role = ?',
            [
                secretKey.trim(), 
                publicKey && publicKey.trim() !== '' ? publicKey.trim() : null,
                finalMode,
                providerEmail, 
                'provider'
            ]
        );
        
        return res.json({
            ok: true,
            message: 'PayMongo credentials saved successfully',
            mode: finalMode
        });
    } catch (err) {
        console.error('Save PayMongo credentials failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get provider's PayMongo credentials
app.get('/api/provider/paymongo-credentials', async (req, res) => {
    const providerEmail = req.query.providerEmail;
    
    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }
    
    try {
        const pool = getPool();
        
        // Ensure columns exist
        try {
            await pool.query('SELECT u_paymongo_secret_key, u_paymongo_public_key, u_paymongo_mode FROM `user` LIMIT 1');
        } catch (checkErr) {
            if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
                // Add columns if they don't exist
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_secret_key VARCHAR(500) DEFAULT NULL');
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_public_key VARCHAR(500) DEFAULT NULL');
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_mode VARCHAR(10) DEFAULT NULL');
            }
        }
        
        const [userRows] = await pool.query(
            'SELECT u_paymongo_secret_key, u_paymongo_public_key, u_paymongo_mode FROM `user` WHERE u_email = ? AND u_role = ?',
            [providerEmail, 'provider']
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }
        
        return res.json({
            ok: true,
            secretKey: userRows[0].u_paymongo_secret_key || null,
            publicKey: userRows[0].u_paymongo_public_key || null,
            mode: userRows[0].u_paymongo_mode || null
        });
    } catch (err) {
        console.error('Get PayMongo credentials failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
	console.log(`✅ API server listening on http://localhost:${PORT}`);
	console.log(`✅ Server accessible from network on port ${PORT}`);
	console.log(`✅ For Android emulator: http://10.0.2.2:${PORT}`);
	console.log(`✅ For physical devices: http://YOUR_IP:${PORT}`);
});


