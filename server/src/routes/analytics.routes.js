const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All analytics routes require authentication + admin or hod role
router.use(protect, restrictTo('admin', 'hod'));

router.get('/clearance-overview', analyticsController.getClearanceOverview);
router.get('/stage-distribution', analyticsController.getStageDistribution);
router.get('/department-stats', analyticsController.getDepartmentStats);
router.get('/submission-stats', analyticsController.getSubmissionStats);
router.get('/student-progress', analyticsController.getStudentProgress);

module.exports = router;
