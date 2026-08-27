const express = require('express');
const librarySectionController = require('../controllers/librarySection.controller');
const { protect, restrictTo } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

const router = express.Router();

// Public route for Library Section login
router.post(
  '/login',
  auditLogger('library_section_login_attempt', 'Auth'),
  librarySectionController.login
);

// Protected routes (library_section, section_head & admin)
router.use(protect);
router.use(restrictTo('library_section', 'section_head', 'admin'));

router.get('/branches', librarySectionController.getBranches);
router.get('/students', librarySectionController.getStudents);
router.get('/students/:id', librarySectionController.getStudentDetail);

router.patch(
  '/students/:id/status',
  auditLogger('update_library_status', 'LibrarySection'),
  librarySectionController.updateStatus
);

// Support fallback routes for consistency
router.patch(
  '/students/:id/library-status',
  auditLogger('update_library_status', 'LibrarySection'),
  librarySectionController.updateStatus
);

router.patch(
  '/students/:id/fees',
  auditLogger('update_library_status', 'LibrarySection'),
  librarySectionController.updateStatus
);

router.post(
  '/students/bulk-update',
  auditLogger('bulk_update_library_status', 'LibrarySection'),
  librarySectionController.bulkUpdateStatus
);

module.exports = router;
