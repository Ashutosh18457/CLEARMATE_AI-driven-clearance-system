const express = require('express');
const busSectionController = require('../controllers/busSection.controller');
const { protect, restrictTo } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

const router = express.Router();

// Public route for Bus Section login
router.post(
  '/login',
  auditLogger('bus_section_login_attempt', 'Auth'),
  busSectionController.login
);

// Protected routes (bus_section & admin)
router.use(protect);
router.use(restrictTo('bus_section', 'admin'));

router.get('/branches', busSectionController.getBranches);
router.get('/students', busSectionController.getStudents);
router.get('/students/:id', busSectionController.getStudentDetail);

router.patch(
  '/students/:id/bus-fees',
  auditLogger('update_bus_fee_status', 'BusSection'),
  busSectionController.updateFees
);

// Support fallback route /students/:id/fees for consistent REST endpoints
router.patch(
  '/students/:id/fees',
  auditLogger('update_bus_fee_status', 'BusSection'),
  busSectionController.updateFees
);

router.post(
  '/students/bulk-update',
  auditLogger('bulk_update_bus_fees', 'BusSection'),
  busSectionController.bulkUpdateFees
);

router.delete(
  '/students/:id',
  auditLogger('delete_student_bus_section', 'BusSection'),
  busSectionController.deleteStudent
);

module.exports = router;
