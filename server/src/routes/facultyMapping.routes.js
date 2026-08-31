const express = require('express');
const router = express.Router();
const { facultyMappingController } = require('../controllers/facultyMapping.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Public/authenticated access to view mappings for dynamic client binding
router.get('/', facultyMappingController.getAllMappings);
router.get('/:branchCode', facultyMappingController.getByBranch);

// Admin-only management endpoints
router.post(
  '/',
  protect,
  restrictTo('admin', 'super_admin'),
  facultyMappingController.createMapping
);

router.put(
  '/:id',
  protect,
  restrictTo('admin', 'super_admin'),
  facultyMappingController.updateMapping
);

router.delete(
  '/:id',
  protect,
  restrictTo('admin', 'super_admin'),
  facultyMappingController.deleteMapping
);

router.post(
  '/seed-defaults',
  protect,
  restrictTo('admin', 'super_admin'),
  facultyMappingController.seedDefaults
);

module.exports = router;
