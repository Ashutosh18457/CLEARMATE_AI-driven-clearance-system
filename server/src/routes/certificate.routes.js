const express = require('express');
const certificateController = require('../controllers/certificate.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Public verification endpoint (no auth required — for QR code scans)
router.get('/verify/:certificateNumber', certificateController.verifyCertificate);

// Student: Get my certificate data
router.get('/my', protect, restrictTo('student'), certificateController.getMyCertificate);

// Admin: Mark clearance as sent to exam cell
router.patch('/:id/exam-cell', protect, restrictTo('admin'), certificateController.markSentToExamCell);

module.exports = router;
