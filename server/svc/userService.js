// svc/userService.js
// Pure data-access and business-logic layer for user operations.
// Every function receives plain parameters and returns data or throws.
// No knowledge of req / res / Express.

const bcrypt = require('bcryptjs');
const { getPool } = require('../db');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a raw DB user row to the shape returned by the by-email endpoint.
 */
function mapUserRow(row) {
    return {
        exists: true,
        id: row.iduser,
        email: row.u_email,
        firstName: row.u_fname || null,
        middleName: row.u_mname || null,
        lastName: row.u_lname || null,
        suffix: row.u_suffix || null,
        phone: row.u_phone || null,
        address: row.u_address || null,
        city: row.u_city || null,
        state: row.u_state || null,
        zipCode: row.u_zip_code || null,
        hasPassword: row.u_password !== null && row.u_password !== '',
        blocked: Number(row.u_disabled) === 1,
        role: row.u_role || 'user',
        profilePicture: row.u_profile_image || null,
    };
}

/**
 * Ensure a column exists on the `user` table; add it if missing.
 * Returns true on success, false on failure.
 */
async function ensureColumnExists(pool, columnName, columnDefinition) {
    try {
        const [columns] = await pool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'user'
               AND COLUMN_NAME = ?`,
            [columnName]
        );

        if (columns.length === 0) {
            await pool.query(`ALTER TABLE \`user\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
            console.log(`Added column: ${columnName}`);
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
}

// ---------------------------------------------------------------------------
// List users (admin)
// ---------------------------------------------------------------------------

async function listUsers() {
    const pool = getPool();
    const [rows] = await pool.query(
        "SELECT iduser, u_fname, u_lname, u_email, IFNULL(u_disabled, 0) AS u_disabled, IFNULL(u_role, 'user') AS u_role FROM `user` ORDER BY iduser DESC LIMIT 50"
    );
    return rows;
}

// ---------------------------------------------------------------------------
// Get user by email
// ---------------------------------------------------------------------------

async function getUserByEmail(email) {
    const pool = getPool();

    const query =
        "SELECT iduser, u_email, u_fname, u_mname, u_lname, u_suffix, u_password, " +
        "IFNULL(u_disabled, 0) AS u_disabled, IFNULL(u_role, 'user') AS u_role, " +
        "u_phone, u_address, u_city, u_state, u_zip_code, u_profile_image " +
        "FROM `user` WHERE u_email = ? LIMIT 1";

    const [rows] = await pool.query(query, [email]);
    if (!Array.isArray(rows) || rows.length === 0) {
        return { exists: false };
    }
    return mapUserRow(rows[0]);
}

// ---------------------------------------------------------------------------
// Get provider status
// ---------------------------------------------------------------------------

async function getProviderStatus(email) {
    const pool = getPool();
    try {
        const [rows] = await pool.query(
            'SELECT u_provider_status, u_rejection_reason FROM `user` WHERE u_email = ? LIMIT 1',
            [email]
        );

        if (rows.length === 0) {
            return null; // signals "not found"
        }

        return {
            status: rows[0].u_provider_status || null,
            rejectionReason: rows[0].u_rejection_reason || null,
        };
    } catch (err) {
        // Handle missing columns gracefully
        if (err.code === 'ER_BAD_FIELD_ERROR') {
            return { status: null, rejectionReason: null };
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Add user (admin action)
// ---------------------------------------------------------------------------

async function addUser({ firstName, middleName, lastName, suffix, email, password }) {
    const pool = getPool();
    const hashed = password ? await bcrypt.hash(password, 10) : null;
    const sql =
        "INSERT INTO `user` (u_fname, u_mname, u_lname, u_suffix, u_email, u_password) VALUES (?, ?, ?, ?, ?, ?)";
    const params = [firstName, middleName || null, lastName, suffix || null, email, hashed];
    const [result] = await pool.query(sql, params);
    return { id: result.insertId };
}

// ---------------------------------------------------------------------------
// Apply as provider
// ---------------------------------------------------------------------------

/**
 * Validate and process a provider application.
 *
 * @param {string} email
 * @param {string} businessDocPath  - already-saved file path for the business document
 * @param {string} validIdDocPath   - already-saved file path for the valid ID document
 * @returns {{ message: string, status: string }}
 */
async function applyAsProvider(email, businessDocPath, validIdDocPath) {
    const pool = getPool();

    // Check if user exists
    console.log('Looking up user with email:', email);
    const [userRows] = await pool.query(
        'SELECT iduser, u_email, u_role, u_provider_status, u_fname, u_lname FROM `user` WHERE u_email = ?',
        [email]
    );

    if (userRows.length === 0) {
        const err = new Error('User not found');
        err.statusCode = 404;
        err.errorCode = 'NOT_FOUND';
        throw err;
    }

    const user = userRows[0];
    console.log('User found:', user.iduser, user.u_email, 'Role:', user.u_role, 'Status:', user.u_provider_status);

    // Check if user is already a provider
    if (user.u_role === 'provider') {
        const err = new Error('User is already a provider');
        err.statusCode = 400;
        err.errorCode = 'CONFLICT';
        throw err;
    }

    // Check if user is an admin
    if (user.u_role === 'admin') {
        const err = new Error('Admin users cannot apply as provider');
        err.statusCode = 400;
        err.errorCode = 'FORBIDDEN';
        throw err;
    }

    // Check if already has pending application
    if (user.u_provider_status === 'pending') {
        const err = new Error('You already have a pending provider application');
        err.statusCode = 400;
        err.errorCode = 'CONFLICT';
        throw err;
    }

    // Ensure columns exist before proceeding
    console.log('Checking/creating database columns...');
    try {
        await pool.query('SELECT u_provider_status, u_business_document, u_valid_id_document FROM `user` LIMIT 1');
    } catch (checkErr) {
        if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
            console.log('Missing columns detected, creating them...');
            try {
                if (checkErr.message.includes('u_provider_status')) {
                    await pool.query(
                        "ALTER TABLE `user` ADD COLUMN u_provider_status ENUM('pending', 'approved', 'rejected') DEFAULT NULL"
                    );
                    console.log('Added u_provider_status column');
                }
                if (checkErr.message.includes('u_business_document')) {
                    await pool.query(
                        'ALTER TABLE `user` ADD COLUMN u_business_document VARCHAR(500) DEFAULT NULL'
                    );
                    console.log('Added u_business_document column');
                }
                if (checkErr.message.includes('u_valid_id_document')) {
                    await pool.query(
                        'ALTER TABLE `user` ADD COLUMN u_valid_id_document VARCHAR(500) DEFAULT NULL'
                    );
                    console.log('Added u_valid_id_document column');
                }
            } catch (alterErr) {
                console.error('Failed to add columns:', alterErr);
                const err = new Error('Database setup error. Please contact support.');
                err.statusCode = 500;
                err.errorCode = 'SERVER_ERROR';
                throw err;
            }
        } else {
            throw checkErr;
        }
    }

    // Ensure u_provider_applied_at column exists
    try {
        await pool.query('SELECT u_provider_applied_at FROM `user` LIMIT 1');
    } catch (checkErr) {
        if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
            console.log('Missing u_provider_applied_at column, creating it...');
            try {
                await pool.query(
                    'ALTER TABLE `user` ADD COLUMN u_provider_applied_at TIMESTAMP NULL DEFAULT NULL'
                );
                console.log('Added u_provider_applied_at column');
            } catch (alterErr) {
                console.error('Failed to add u_provider_applied_at column:', alterErr);
            }
        }
    }

    // Update user record with application date
    console.log('Updating user record with new application date...');
    await pool.query(
        'UPDATE `user` SET u_provider_status = ?, u_business_document = ?, u_valid_id_document = ?, u_provider_applied_at = NOW(), u_rejection_reason = NULL WHERE iduser = ?',
        ['pending', businessDocPath, validIdDocPath, user.iduser]
    );

    // Verify the update worked
    const [verifyRows] = await pool.query(
        'SELECT u_provider_applied_at FROM `user` WHERE iduser = ?',
        [user.iduser]
    );

    if (verifyRows.length > 0) {
        console.log(`Application date updated to: ${verifyRows[0].u_provider_applied_at || 'NULL (check column exists!)'}`);
        if (!verifyRows[0].u_provider_applied_at) {
            console.error('WARNING: u_provider_applied_at is NULL after update! Column may not exist.');
        }
    }

    console.log(`User ${email} applied as provider (pending approval) with documents`);

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
                    [admin.iduser, notificationTitle, notificationMessage, 'new_provider_application', 0]
                );
                console.log(`Notification created for admin user ID ${admin.iduser}`);

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
                        console.log(`Push notification sent to admin ${admin.u_email}`);
                    }
                } catch (pushErr) {
                    console.error(`Failed to send push notification to admin ${admin.u_email} (non-critical):`, pushErr);
                }
            } catch (notifErr) {
                console.error(`Failed to create notification for admin ${admin.iduser} (non-critical):`, notifErr);
            }
        }
    } catch (notifErr) {
        console.error('Failed to create notifications for admins (non-critical):', notifErr);
    }

    return {
        message: 'Provider application submitted. Waiting for admin approval.',
        status: 'pending',
    };
}

// ---------------------------------------------------------------------------
// Block / Unblock user
// ---------------------------------------------------------------------------

async function blockUser(id, blocked) {
    const pool = getPool();
    try {
        await pool.query('UPDATE `user` SET u_disabled = ? WHERE iduser = ?', [blocked ? 1 : 0, id]);
        return {};
    } catch (err) {
        // If column is missing, add it and retry once
        if (err && err.code === 'ER_BAD_FIELD_ERROR') {
            try {
                await pool.query('ALTER TABLE `user` ADD COLUMN u_disabled TINYINT(1) NOT NULL DEFAULT 0');
                await pool.query('UPDATE `user` SET u_disabled = ? WHERE iduser = ?', [blocked ? 1 : 0, id]);
                return { createdColumn: true };
            } catch (e2) {
                console.error('Block user alter failed:', e2.code, e2.message);
            }
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Update user
// ---------------------------------------------------------------------------

/**
 * Update a user record.
 *
 * @param {number} id
 * @param {object} fields - body fields (firstName, lastName, email, etc.)
 * @param {string|null} profilePicturePath - resolved profile picture path (already saved to disk)
 * @param {boolean} profilePictureSaveSuccessful - whether a base64 save succeeded
 * @param {boolean} profilePictureWasBase64 - whether the incoming picture was base64
 * @returns {{ profilePicture?: string }}
 */
async function updateUser(id, fields, profilePicturePath, profilePictureSaveSuccessful, profilePictureWasBase64) {
    const pool = getPool();
    const {
        firstName, middleName, lastName, suffix, email, password,
        phone, dateOfBirth, address, city, state, zipCode,
    } = fields;

    // Check if user exists
    const [existing] = await pool.query(
        'SELECT iduser, u_email, u_profile_picture FROM `user` WHERE iduser = ?',
        [id]
    );
    if (!Array.isArray(existing) || existing.length === 0) {
        const err = new Error('User not found');
        err.statusCode = 404;
        err.errorCode = 'NOT_FOUND';
        throw err;
    }

    // Check if email is being changed and if it's already taken
    if (email !== existing[0].u_email) {
        const [emailCheck] = await pool.query(
            'SELECT iduser FROM `user` WHERE u_email = ? AND iduser != ?',
            [email, id]
        );
        if (Array.isArray(emailCheck) && emailCheck.length > 0) {
            const err = new Error('Email already exists');
            err.statusCode = 409;
            err.errorCode = 'DUPLICATE';
            throw err;
        }
    }

    // Build update query with required fields
    let updateFields = ['u_fname = ?', 'u_mname = ?', 'u_lname = ?', 'u_suffix = ?', 'u_email = ?'];
    let params = [firstName, middleName || null, lastName, suffix || null, email];

    // Add optional fields - ensure columns exist first
    if (phone !== undefined) {
        await ensureColumnExists(pool, 'u_phone', 'VARCHAR(20) DEFAULT NULL');
        updateFields.push('u_phone = ?');
        params.push(phone || null);
    }
    if (dateOfBirth !== undefined) {
        await ensureColumnExists(pool, 'u_date_of_birth', 'VARCHAR(50) DEFAULT NULL');
        updateFields.push('u_date_of_birth = ?');
        params.push(dateOfBirth || null);
    }
    if (address !== undefined) {
        await ensureColumnExists(pool, 'u_address', 'VARCHAR(255) DEFAULT NULL');
        updateFields.push('u_address = ?');
        params.push(address || null);
    }
    if (city !== undefined) {
        await ensureColumnExists(pool, 'u_city', 'VARCHAR(100) DEFAULT NULL');
        updateFields.push('u_city = ?');
        params.push(city || null);
    }
    if (state !== undefined) {
        await ensureColumnExists(pool, 'u_state', 'VARCHAR(100) DEFAULT NULL');
        updateFields.push('u_state = ?');
        params.push(state || null);
    }
    if (zipCode !== undefined) {
        await ensureColumnExists(pool, 'u_zip_code', 'VARCHAR(20) DEFAULT NULL');
        updateFields.push('u_zip_code = ?');
        params.push(zipCode || null);
    }

    // Only update profile picture in database if:
    // 1. We tried to save a base64 image AND it was successful, OR
    // 2. The profile picture is already a path/URL (not base64)
    if (profilePicturePath !== undefined) {
        if (profilePictureWasBase64) {
            // We tried to save a base64 image - only update if save was successful
            if (profilePictureSaveSuccessful) {
                await ensureColumnExists(pool, 'u_profile_picture', 'VARCHAR(500) DEFAULT NULL');
                updateFields.push('u_profile_picture = ?');
                params.push(profilePicturePath);
                console.log('Will update database with profile picture path:', profilePicturePath);
            } else {
                console.warn('NOT updating database - profile picture save failed, keeping old picture');
            }
        } else {
            // Profile picture is already a path/URL, safe to update
            await ensureColumnExists(pool, 'u_profile_picture', 'VARCHAR(500) DEFAULT NULL');
            updateFields.push('u_profile_picture = ?');
            params.push(profilePicturePath);
            console.log('Will update database with profile picture path:', profilePicturePath);
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

    // Return profile picture path if it was updated
    const responseData = {};
    if (profilePicturePath) {
        responseData.profilePicture = profilePicturePath;
        console.log('Returning profile picture path:', profilePicturePath);
    }
    return responseData;
}

// ---------------------------------------------------------------------------
// Register user
// ---------------------------------------------------------------------------

async function registerUser({ firstName, middleName, lastName, suffix, email, password }) {
    const pool = getPool();

    // CHECK FIRST: Verify email doesn't already exist before attempting insert
    const [existingUsers] = await pool.query(
        "SELECT iduser, u_email FROM `user` WHERE u_email = ? LIMIT 1",
        [email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        console.log('Register failed: Email already exists', email);
        const err = new Error('This email is already registered. Please use a different email or try logging in instead.');
        err.statusCode = 409;
        err.errorCode = 'DUPLICATE';
        throw err;
    }

    // Email doesn't exist, proceed with registration
    const hashed = password ? await bcrypt.hash(password, 10) : null;

    // Validate hash length (bcrypt hashes are 60 chars, but ensure it fits in VARCHAR(255))
    if (hashed && hashed.length > 255) {
        console.error('Password hash too long:', hashed.length, 'characters');
        const err = new Error('Password hash generation error. Please try again.');
        err.statusCode = 500;
        err.errorCode = 'SERVER_ERROR';
        throw err;
    }

    console.log('Password hash length:', hashed ? hashed.length : 0);

    // Try to fix column size automatically if it fails
    let insertAttempts = 0;
    const maxAttempts = 2;
    let lastError = null;

    while (insertAttempts < maxAttempts) {
        try {
            const sql = `INSERT INTO \`user\` (u_fname, u_mname, u_lname, u_suffix, u_email, u_password)
                VALUES (?, ?, ?, ?, ?, ?)`;
            const params = [firstName, middleName || null, lastName, suffix || null, email, hashed];
            const [result] = await pool.query(sql, params);
            console.log('Register insert success', { insertId: result.insertId });
            return { id: result.insertId };
        } catch (insertErr) {
            lastError = insertErr;
            // If error is "Data too long for column", try to fix the column size
            if (
                insertErr &&
                insertErr.code === 'ER_DATA_TOO_LONG' &&
                insertErr.message &&
                insertErr.message.includes('u_password') &&
                insertAttempts === 0
            ) {
                console.warn('Password column too small, attempting to fix...');
                try {
                    await pool.query('ALTER TABLE `user` MODIFY COLUMN `u_password` VARCHAR(255) DEFAULT NULL');
                    console.log('Password column size updated to VARCHAR(255)');
                    insertAttempts++;
                    continue; // Retry the insert
                } catch (alterErr) {
                    console.error('Failed to update password column:', alterErr);
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
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    listUsers,
    getUserByEmail,
    getProviderStatus,
    addUser,
    applyAsProvider,
    blockUser,
    updateUser,
    registerUser,
};
