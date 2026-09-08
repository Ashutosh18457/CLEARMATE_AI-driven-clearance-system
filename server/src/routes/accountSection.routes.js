const express = require('express');
const accountSectionController = require('../controllers/accountSection.controller');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common.validator');
const {
  sectionLoginSchema,
  updateAccountFeesSchema,
  bulkUpdateAccountFeesSchema,
  sectionStudentsQuerySchema,
} = require('../validators/section.validator');
const { protect, restrictTo } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

const router = express.Router();

// Public route for account section login
router.post(
  '/login',
  validate(sectionLoginSchema),
  auditLogger('account_section_login_attempt', 'Auth'),
  accountSectionController.login
);

// Protected routes (account_section & admin)
router.use(protect);
router.use(restrictTo('account_section', 'admin'));

router.get('/branches', accountSectionController.getBranches);
router.get('/students', validate(sectionStudentsQuerySchema, 'query'), accountSectionController.getStudents);
router.get('/students/:id', validate(idParamSchema, 'params'), accountSectionController.getStudentDetail);
router.patch(
  '/students/:id/fees',
  validate({ params: idParamSchema, body: updateAccountFeesSchema }),
  auditLogger('update_fee_status', 'AccountSection'),
  accountSectionController.updateFees
);

router.post(
  '/students/bulk-update',
  validate(bulkUpdateAccountFeesSchema),
  auditLogger('bulk_update_fees', 'AccountSection'),
  accountSectionController.bulkUpdateFees
);

module.exports = router;
