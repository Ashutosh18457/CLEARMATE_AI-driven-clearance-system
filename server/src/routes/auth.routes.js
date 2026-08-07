const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const authValidator = require('../validators/auth.validator');
const { protect } = require('../middleware/auth');

const auditLogger = require('../middleware/auditLogger');

const router = express.Router();

// Public routes
router.post('/login', validate(authValidator.loginSchema), auditLogger('login_attempt', 'Auth'), authController.login);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', protect, authController.getMe);

module.exports = router;
