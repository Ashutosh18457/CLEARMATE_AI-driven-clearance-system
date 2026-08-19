const express = require('express');
const accountSectionController = require('../controllers/accountSection.controller');
const { protect, restrictTo } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

const router = express.Router();

// Public route for account section login
router.post(
  '/login',
  auditLogger('account_section_login_attempt', 'Auth'),
  accountSectionController.login
);

// Protected routes (account_section & admin)
router.use(protect);
router.use(restrictTo('account_section', 'admin'));

router.get('/branches', accountSectionController.getBranches);
router.get('/students', accountSectionController.getStudents);
router.get('/students/:id', accountSectionController.getStudentDetail);
router.patch(
  '/students/:id/fees',
  auditLogger('update_fee_status', 'AccountSection'),
  accountSectionController.updateFees
);

module.exports = router;
