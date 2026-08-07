const express = require('express');
const riskController = require('../controllers/risk.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Only admin and HOD can access risk prediction
router.get(
  '/at-risk-students',
  protect,
  restrictTo('admin', 'hod'),
  riskController.getAtRiskStudents
);

module.exports = router;
