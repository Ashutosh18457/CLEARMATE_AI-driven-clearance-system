const express = require('express');
const disciplinarySectionController = require('../controllers/disciplinarySection.controller');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common.validator');
const {
  sectionLoginSchema,
  updateDisciplinaryStatusSchema,
  bulkUpdateDisciplinarySchema,
  sectionStudentsQuerySchema,
} = require('../validators/section.validator');
const { protect, restrictTo } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

const router = express.Router();

// Public route for Disciplinary Section login
router.post(
  '/login',
  validate(sectionLoginSchema),
  auditLogger('disciplinary_section_login_attempt', 'Auth'),
  disciplinarySectionController.login
);

// Protected routes (disciplinary_section, section_head & admin)
router.use(protect);
router.use(restrictTo('disciplinary_section', 'section_head', 'admin', 'super_admin'));

router.get('/branches', disciplinarySectionController.getBranches);
router.get('/students', validate(sectionStudentsQuerySchema, 'query'), disciplinarySectionController.getStudents);
router.get('/students/:id', validate(idParamSchema, 'params'), disciplinarySectionController.getStudentDetail);

router.patch(
  '/students/:id/status',
  validate({ params: idParamSchema, body: updateDisciplinaryStatusSchema }),
  auditLogger('update_disciplinary_status', 'DisciplinarySection'),
  disciplinarySectionController.updateStatus
);

router.patch(
  '/students/:id/fees',
  validate({ params: idParamSchema, body: updateDisciplinaryStatusSchema }),
  auditLogger('update_disciplinary_status', 'DisciplinarySection'),
  disciplinarySectionController.updateStatus
);

router.post(
  '/students/bulk-update',
  validate(bulkUpdateDisciplinarySchema),
  auditLogger('bulk_update_disciplinary_status', 'DisciplinarySection'),
  disciplinarySectionController.bulkUpdateStatus
);

router.delete(
  '/students/:id',
  validate(idParamSchema, 'params'),
  auditLogger('delete_student_disciplinary_section', 'DisciplinarySection'),
  disciplinarySectionController.deleteStudent
);

module.exports = router;
