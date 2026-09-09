const express = require('express');
const router = express.Router();
const { facultyMappingController } = require('../controllers/facultyMapping.controller');
const validate = require('../middleware/validate');
const { idParamSchema, branchCodeParamSchema } = require('../validators/common.validator');
const {
  createFacultyMappingSchema,
  updateFacultyMappingSchema,
} = require('../validators/facultyMapping.validator');
const { protect, restrictTo } = require('../middleware/auth');

// Public/authenticated access to view mappings for dynamic client binding
router.get('/', facultyMappingController.getAllMappings);
router.get(
  '/:branchCode',
  validate(branchCodeParamSchema, 'params'),
  facultyMappingController.getByBranch
);

// Super Admin-only management endpoints
router.post(
  '/',
  protect,
  restrictTo('super_admin'),
  validate(createFacultyMappingSchema),
  facultyMappingController.createMapping
);

router.put(
  '/:id',
  protect,
  restrictTo('super_admin'),
  validate({ params: idParamSchema, body: updateFacultyMappingSchema }),
  facultyMappingController.updateMapping
);

router.delete(
  '/:id',
  protect,
  restrictTo('super_admin'),
  validate(idParamSchema, 'params'),
  facultyMappingController.deleteMapping
);

router.post(
  '/seed-defaults',
  protect,
  restrictTo('super_admin'),
  facultyMappingController.seedDefaults
);

router.post(
  '/sync/:branchCode',
  protect,
  restrictTo('super_admin'),
  validate(branchCodeParamSchema, 'params'),
  facultyMappingController.syncWithClearanceItems
);

module.exports = router;
