const express = require('express');
const Joi = require('joi');
const analyticsController = require('../controllers/analytics.controller');
const validate = require('../middleware/validate');
const { objectId } = require('../validators/common.validator');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

const semesterIdQuerySchema = Joi.object({
  semesterId: objectId.optional().allow('', null),
});

const studentProgressQuerySchema = Joi.object({
  semesterId: objectId.optional().allow('', null),
  department: Joi.string().trim().max(100).optional().allow(''),
  status: Joi.string().trim().max(50).optional().allow(''),
  search: Joi.string().trim().max(100).optional().allow(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

// All analytics routes require authentication + admin, super_admin, or hod role
router.use(protect, restrictTo('admin', 'super_admin', 'hod'));

router.get('/clearance-overview', validate(semesterIdQuerySchema, 'query'), analyticsController.getClearanceOverview);
router.get('/stage-distribution', validate(semesterIdQuerySchema, 'query'), analyticsController.getStageDistribution);
router.get('/department-stats', validate(semesterIdQuerySchema, 'query'), analyticsController.getDepartmentStats);
router.get('/submission-stats', validate(semesterIdQuerySchema, 'query'), analyticsController.getSubmissionStats);
router.get('/student-progress', validate(studentProgressQuerySchema, 'query'), analyticsController.getStudentProgress);

module.exports = router;
