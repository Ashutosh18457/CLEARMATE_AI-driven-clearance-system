const express = require('express');
const router = express.Router();
const { sendSuccess } = require('../utils/response');
const mongoose = require('mongoose');

// Health check — used by monitoring, load balancers, and deployment verification
router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  sendSuccess(res, {
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus[dbState] || 'unknown',
      version: '1.0.0',
    },
    message: 'ClearMate API is running',
  });
});

// Route mounts:
router.use('/auth', require('./auth.routes'));
router.use('/admin', require('./admin.routes'));
// router.use('/student', require('./student.routes'));
// router.use('/teacher', require('./teacher.routes'));
// router.use('/section', require('./section.routes'));
router.use('/account-section', require('./accountSection.routes'));
router.use('/bus-section', require('./busSection.routes'));
router.use('/library-section', require('./librarySection.routes'));
router.use('/disciplinary-section', require('./disciplinarySection.routes'));
router.use('/clearances', require('./clearance.routes'));
router.use('/submissions', require('./submission.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/tasks', require('./task.routes'));
router.use('/chatbot', require('./chatbot.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/certificate', require('./certificate.routes'));
router.use('/risk', require('./risk.routes'));

module.exports = router;
