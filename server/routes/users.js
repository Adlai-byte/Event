// routes/users.js
// Thin routing layer — all logic lives in controllers/userController.js
// and svc/userService.js.

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { registerLimiter } = require('../middleware/rateLimiter');
const { registerValidation, updateUserValidation } = require('../middleware/validationSchemas');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/userController');

// ============================================
// USER API ENDPOINTS
// ============================================

// Debug: list users (limited columns) — admin only
router.get('/users', authMiddleware, requireRole('admin'), ctrl.listUsers);

// Check user by email (blocked status and role)
router.get('/users/by-email', authMiddleware, ctrl.getUserByEmail);

// Get user provider status and rejection reason
router.get('/user/provider-status', authMiddleware, ctrl.getProviderStatus);

// Add a user (admin action)
router.post('/users', ctrl.addUser);

// Apply as provider — MUST come BEFORE /users/:id/block to avoid route conflicts
router.post('/users/apply-provider', authMiddleware, ctrl.applyAsProvider);

// Block / Unblock user — admin only
router.post('/users/:id/block', authMiddleware, requireRole('admin'), ctrl.blockUser);

// Update user information
router.put('/users/:id', authMiddleware, updateUserValidation, validate, ctrl.updateUser);

// Register endpoint: inserts into MySQL `event.user`
router.post('/register', registerLimiter, registerValidation, validate, ctrl.register);

module.exports = router;
