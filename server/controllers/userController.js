// controllers/userController.js
// Request / response handling layer for user routes.
// Delegates all database and business logic to svc/userService.js.

const path = require('path');
const fs = require('fs');
const { sendSuccess, sendError } = require('../lib/response');
const userService = require('../svc/userService');

// Uploads directory - same resolution as index.js
const uploadsDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR, 'images')
    : path.join(__dirname, '..', 'uploads', 'images');

// ---------------------------------------------------------------------------
// Image helpers (need access to filesystem / req.body base64 data)
// ---------------------------------------------------------------------------

function saveProviderDocument(base64String, userId, documentType) {
    try {
        const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 image format');
        }

        const imageFormat = matches[1];
        const imageData = matches[2];

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const filename = `provider_${userId}_${documentType}_${timestamp}_${randomStr}.${imageFormat}`;
        const filepath = path.join(uploadsDir, filename);

        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(filepath, buffer);

        return `/uploads/images/${filename}`;
    } catch (error) {
        console.error('Error saving provider document:', error);
        throw error;
    }
}

function saveProfilePicture(base64String, userId) {
    try {
        console.log('Starting profile picture save for user:', userId);
        console.log('Uploads directory:', uploadsDir);

        // Ensure directory exists and is writable
        if (!fs.existsSync(uploadsDir)) {
            console.log('Creating uploads directory:', uploadsDir);
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Verify directory is writable
        try {
            fs.accessSync(uploadsDir, fs.constants.W_OK);
        } catch (accessError) {
            throw new Error(`Uploads directory is not writable: ${accessError.message}`);
        }

        const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 image format');
        }

        const imageFormat = matches[1];
        const imageData = matches[2];

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const filename = `profile_${userId}_${timestamp}_${randomStr}.${imageFormat}`;
        const filepath = path.join(uploadsDir, filename);

        const buffer = Buffer.from(imageData, 'base64');

        // Write file with explicit error handling
        try {
            const parentDir = path.dirname(filepath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            fs.writeFileSync(filepath, buffer, {
                flag: 'w',
                mode: 0o666,
                encoding: null,
            });

            // Force sync to ensure data is written to disk
            try {
                const fd = fs.openSync(filepath, 'r+');
                fs.fsyncSync(fd);
                fs.closeSync(fd);
            } catch (syncError) {
                console.warn('Could not sync file (non-critical):', syncError.message);
            }

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
                const start = Date.now();
                while (Date.now() - start < 50) { /* wait 50ms */ }
                retries--;
            }

            if (!fileExists || !fileStats) {
                throw new Error('File was not created or verified on disk');
            }

            console.log('File write verified - size matches buffer:', fileStats.size, 'bytes');
        } catch (writeError) {
            console.error('Write error:', writeError.code, writeError.message);
            throw writeError;
        }

        // Final verification
        if (!fs.existsSync(filepath)) {
            throw new Error('File was not created on disk');
        }

        try {
            const finalStats = fs.statSync(filepath);
            if (finalStats.size === 0) {
                throw new Error('File was created but is empty');
            }
            if (finalStats.size !== buffer.length) {
                throw new Error(`File size mismatch: expected ${buffer.length} bytes, got ${finalStats.size} bytes`);
            }
            const testRead = fs.readFileSync(filepath);
            if (testRead.length !== buffer.length) {
                throw new Error('File read size does not match expected size');
            }
        } catch (verifyError) {
            console.error('Final verification failed:', verifyError.message);
            throw verifyError;
        }

        const urlPath = `/uploads/images/${filename}`;
        console.log('Profile picture saved successfully:', filepath);
        return urlPath;
    } catch (error) {
        console.error('Error saving profile picture:', error);
        throw error;
    }
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

// GET /users  (admin)
async function listUsers(_req, res) {
    try {
        const rows = await userService.listUsers();
        return sendSuccess(res, { rows });
    } catch (err) {
        console.error('List users failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// GET /users/by-email
async function getUserByEmail(req, res) {
    const email = (req.query.email || '').toString();
    if (!email) return sendError(res, 'VALIDATION_ERROR', 'Email required', 400);

    try {
        const result = await userService.getUserByEmail(email);
        return sendSuccess(res, result);
    } catch (err) {
        console.error('Lookup by email failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// GET /user/provider-status
async function getProviderStatus(req, res) {
    const email = req.query.email;
    if (!email) {
        return sendError(res, 'VALIDATION_ERROR', 'Email required', 400);
    }

    try {
        const result = await userService.getProviderStatus(email);
        if (result === null) {
            return sendError(res, 'NOT_FOUND', 'User not found', 404);
        }
        return sendSuccess(res, result);
    } catch (err) {
        console.error('Get provider status failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// POST /users  (admin)
async function addUser(req, res) {
    const { firstName, middleName = '', lastName, suffix = '', email, password } = req.body || {};
    if (!firstName || !lastName || !email) {
        return sendError(res, 'VALIDATION_ERROR', 'Missing required fields', 400);
    }

    try {
        const result = await userService.addUser({ firstName, middleName, lastName, suffix, email, password });
        return sendSuccess(res, result);
    } catch (err) {
        console.error('Add user failed:', err.code, err.message);
        if (err && err.code === 'ER_DUP_ENTRY') {
            return sendError(res, 'DUPLICATE', 'Email already exists', 409);
        }
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// POST /users/apply-provider
async function applyAsProvider(req, res) {
    console.log('POST /api/users/apply-provider - Request received');

    // Ensure response is always sent - use timeout as backup
    let responseSent = false;
    const responseTimeout = setTimeout(() => {
        if (!responseSent) {
            console.error('Response timeout - forcing response');
            responseSent = true;
            sendError(res, 'SERVER_ERROR', 'Request timeout', 500);
        }
    }, 30000);

    const sendResponse = (status, data) => {
        if (!responseSent) {
            clearTimeout(responseTimeout);
            responseSent = true;
            try {
                if (data.ok) {
                    const { ok, ...payload } = data;
                    sendSuccess(res, payload, status);
                } else {
                    const { ok, error, ...rest } = data;
                    const errorCode = rest.errorCode || 'SERVER_ERROR';
                    sendError(res, errorCode, error, status);
                }
                console.log('Response sent:', status, data.ok ? 'OK' : 'ERROR', data.error || data.message || '');
            } catch (sendErr) {
                console.error('Error sending response:', sendErr);
            }
        }
    };

    try {
        // Check if body was parsed
        if (!req.body || typeof req.body !== 'object') {
            return sendResponse(400, { ok: false, error: 'Invalid request body. Please ensure Content-Type is application/json.', errorCode: 'VALIDATION_ERROR' });
        }

        const { email, businessDocument, validIdDocument } = req.body;

        // Validate required fields
        if (!email) {
            return sendResponse(400, { ok: false, error: 'Email is required', errorCode: 'VALIDATION_ERROR' });
        }
        if (!businessDocument) {
            return sendResponse(400, { ok: false, error: 'Business document is required', errorCode: 'VALIDATION_ERROR' });
        }
        if (!validIdDocument) {
            return sendResponse(400, { ok: false, error: 'Valid ID document is required', errorCode: 'VALIDATION_ERROR' });
        }

        // Validate base64 format
        if (!businessDocument.startsWith('data:image/')) {
            return sendResponse(400, { ok: false, error: 'Business document must be a valid image file', errorCode: 'VALIDATION_ERROR' });
        }
        if (!validIdDocument.startsWith('data:image/')) {
            return sendResponse(400, { ok: false, error: 'Valid ID document must be a valid image file', errorCode: 'VALIDATION_ERROR' });
        }

        // We need the user ID to save the documents, so do a quick lookup
        // (the service will also look up the user, but we need the ID for file naming)
        const { getPool } = require('../db');
        const pool = getPool();
        const [userRows] = await pool.query(
            'SELECT iduser FROM `user` WHERE u_email = ?',
            [email]
        );

        if (userRows.length === 0) {
            return sendResponse(404, { ok: false, error: 'User not found', errorCode: 'NOT_FOUND' });
        }

        const userId = userRows[0].iduser;

        // Save documents to files (image handling stays in controller)
        console.log('Saving documents...');
        let businessDocPath = null;
        let validIdDocPath = null;

        try {
            businessDocPath = saveProviderDocument(businessDocument, userId, 'business');
            console.log('Business document saved:', businessDocPath);

            validIdDocPath = saveProviderDocument(validIdDocument, userId, 'id');
            console.log('Valid ID document saved:', validIdDocPath);
        } catch (docErr) {
            console.error('Error saving documents:', docErr);
            return sendResponse(500, { ok: false, error: 'Failed to save documents: ' + docErr.message, errorCode: 'SERVER_ERROR' });
        }

        // Delegate business logic to service
        const result = await userService.applyAsProvider(email, businessDocPath, validIdDocPath);

        return sendResponse(200, {
            ok: true,
            message: result.message,
            status: result.status,
        });
    } catch (err) {
        console.error('Error in apply-provider:', err);

        if (!responseSent) {
            const statusCode = err.statusCode || 500;
            const errorCode = err.errorCode || 'SERVER_ERROR';
            const errorMessage = err.message || 'An unexpected error occurred';
            return sendResponse(statusCode, {
                ok: false,
                error: statusCode === 500 ? 'Server error: ' + errorMessage : errorMessage,
                errorCode,
            });
        }
    }
}

// POST /users/:id/block  (admin)
async function blockUser(req, res) {
    const id = Number(req.params.id);
    const { blocked } = req.body || {};
    if (!Number.isFinite(id) || typeof blocked !== 'boolean') {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid parameters', 400);
    }

    try {
        const result = await userService.blockUser(id, blocked);
        return sendSuccess(res, result);
    } catch (err) {
        console.error('Block user failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// PUT /users/:id
async function updateUser(req, res) {
    const id = Number(req.params.id);
    const {
        firstName, middleName, lastName, suffix, email, password,
        phone, dateOfBirth, address, city, state, zipCode, profilePicture,
    } = req.body || {};

    if (!Number.isFinite(id)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid user ID', 400);
    }
    if (!firstName || !lastName || !email) {
        return sendError(res, 'VALIDATION_ERROR', 'First name, last name, and email are required', 400);
    }

    try {
        // ------------------------------------------------------------------
        // Handle profile picture upload (image I/O stays in controller)
        // ------------------------------------------------------------------
        // We need to know the existing picture path for cleanup, so fetch it
        const { getPool } = require('../db');
        const pool = getPool();
        const [existing] = await pool.query(
            'SELECT u_profile_picture FROM `user` WHERE iduser = ?',
            [id]
        );
        const existingPicture = (existing && existing[0]) ? existing[0].u_profile_picture : null;

        let profilePicturePath = existingPicture || null;
        let profilePictureSaveSuccessful = false;
        let profilePictureWasBase64 = false;

        console.log('Profile picture received:', profilePicture ? (profilePicture.substring(0, 50) + '...') : 'null');

        if (profilePicture && typeof profilePicture === 'string') {
            if (profilePicture.startsWith('data:image')) {
                profilePictureWasBase64 = true;
                console.log('Detected base64 image, saving to file...');
                const oldProfilePicturePath = profilePicturePath;

                try {
                    profilePicturePath = saveProfilePicture(profilePicture, id);
                    console.log('Profile picture saved successfully:', profilePicturePath);

                    // Double-check file exists
                    let filename = profilePicturePath;
                    if (filename.startsWith('/uploads/images/')) {
                        filename = filename.replace('/uploads/images/', '');
                    } else if (filename.startsWith('/uploads/')) {
                        filename = filename.replace('/uploads/', '');
                    }
                    const savedFilePath = path.join(uploadsDir, filename);

                    if (fs.existsSync(savedFilePath)) {
                        const stats = fs.statSync(savedFilePath);
                        if (stats.size > 0) {
                            profilePictureSaveSuccessful = true;

                            // Delete old profile picture if it exists
                            if (oldProfilePicturePath && oldProfilePicturePath.startsWith('/uploads/')) {
                                const oldFilePath = path.join(__dirname, '..', oldProfilePicturePath.replace('/uploads/', 'uploads/'));
                                if (fs.existsSync(oldFilePath)) {
                                    try {
                                        fs.unlinkSync(oldFilePath);
                                        console.log('Deleted old profile picture:', oldFilePath);
                                    } catch (deleteErr) {
                                        console.warn('Could not delete old profile picture:', deleteErr.message);
                                    }
                                }
                            }
                        } else {
                            console.error('File exists but is empty (0 bytes)!');
                            profilePicturePath = existingPicture || null;
                            throw new Error('File was created but is empty');
                        }
                    } else {
                        console.error('File not found after save!');
                        profilePicturePath = existingPicture || null;
                        throw new Error('File was not created on disk after save operation');
                    }
                } catch (saveError) {
                    console.error('Failed to save profile picture:', saveError.message);
                    profilePicturePath = existingPicture || null;
                    profilePictureSaveSuccessful = false;
                }
            } else if (profilePicture.startsWith('/uploads/')) {
                profilePicturePath = profilePicture;
            } else if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
                profilePicturePath = profilePicture;
            } else {
                console.warn('Unknown profile picture format:', profilePicture.substring(0, 50));
            }
        }

        // Delegate to service for the database update
        const result = await userService.updateUser(
            id,
            { firstName, middleName, lastName, suffix, email, password, phone, dateOfBirth, address, city, state, zipCode },
            profilePicturePath,
            profilePictureSaveSuccessful,
            profilePictureWasBase64
        );

        return sendSuccess(res, result);
    } catch (err) {
        console.error('Update user failed:', err.code, err.message);
        if (err && (err.code === 'ER_DUP_ENTRY' || err.errorCode === 'DUPLICATE')) {
            return sendError(res, 'DUPLICATE', 'Email already exists', 409);
        }
        if (err.errorCode === 'NOT_FOUND') {
            return sendError(res, 'NOT_FOUND', 'User not found', 404);
        }
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

// POST /register
async function register(req, res) {
    const {
        firstName,
        middleName = '',
        lastName,
        suffix = '',
        email,
        password,
    } = req.body || {};

    console.log('POST /api/register', { firstName, middleName, lastName, suffix, email });

    if (!firstName || !lastName || !email) {
        return sendError(res, 'VALIDATION_ERROR', 'Missing required fields', 400);
    }

    try {
        const result = await userService.registerUser({ firstName, middleName, lastName, suffix, email, password });
        return sendSuccess(res, result);
    } catch (err) {
        console.error('========================================');
        console.error('REGISTER INSERT FAILED');
        console.error('========================================');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        console.error('Error Stack:', err.stack);
        console.error('========================================');

        if (err && (err.code === 'ER_DUP_ENTRY' || err.errorCode === 'DUPLICATE')) {
            return sendError(
                res,
                'DUPLICATE',
                'This email is already registered. Please use a different email or try logging in instead.',
                409
            );
        }

        const errorMessage = err.message || 'Unknown database error';
        const dbErrorCode = err.code || 'UNKNOWN_ERROR';
        console.error('Returning 500 error:', dbErrorCode, errorMessage);

        return sendError(
            res,
            'SERVER_ERROR',
            'Database error: ' + errorMessage,
            500,
            process.env.NODE_ENV === 'development' ? err.stack : undefined
        );
    }
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
    register,
};
