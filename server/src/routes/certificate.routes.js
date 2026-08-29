const express = require('express');
const certificateController = require('../controllers/certificate.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Public verification endpoint (no auth required — for QR code scans)
router.get('/verify/:certificateNumber', certificateController.verifyCertificate);

// Student: Get my certificate data
router.get('/my', protect, restrictTo('student', 'admin', 'super_admin'), certificateController.getMyCertificate);

// Staff / Admin / HOD / Teacher: Get any student's clearance report data
router.get(
  '/student/:studentId',
  protect,
  restrictTo('admin', 'super_admin', 'hod', 'class_incharge', 'teacher', 'section_head', 'account_section', 'bus_section'),
  certificateController.getStudentCertificate
);

// Admin: Mark clearance as sent to exam cell
router.patch('/:id/exam-cell', protect, restrictTo('admin'), certificateController.markSentToExamCell);

module.exports = router;
