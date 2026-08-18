const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const authValidator = require('../validators/auth.validator');
const { protect } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

const router = express.Router();

// Public routes
router.post('/login', validate(authValidator.loginSchema), auditLogger('login_attempt', 'Auth'), authController.login);
router.post('/register', validate(authValidator.registerSchema), auditLogger('register_attempt', 'Auth'), authController.register);
router.post('/forgot-password', validate(authValidator.forgotPasswordSchema), auditLogger('forgot_password_request', 'Auth'), authController.forgotPassword);
router.post('/reset-password', validate(authValidator.resetPasswordSchema), auditLogger('reset_password_submit', 'Auth'), authController.resetPassword);
router.post('/reset-password/:token', validate(authValidator.resetPasswordSchema), auditLogger('reset_password_submit', 'Auth'), authController.resetPassword);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', protect, authController.getMe);

module.exports = router;
