const express = require('express');
const Joi = require('joi');
const riskController = require('../controllers/risk.controller');
const validate = require('../middleware/validate');
const { objectId } = require('../validators/common.validator');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

const riskQuerySchema = Joi.object({
  semesterId: objectId.required().messages({
    'any.required': 'semesterId query parameter is required',
    'any.invalid': 'Invalid semesterId format',
  }),
  riskLevel: Joi.string().valid('high', 'medium', 'low', 'all').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

// Only admin and HOD can access risk prediction
router.get(
  '/at-risk-students',
  protect,
  restrictTo('admin', 'hod'),
  validate(riskQuerySchema, 'query'),
  riskController.getAtRiskStudents
);

module.exports = router;
