const bulkSetupService = require('../services/bulkSetup.service');
const { sendSuccess, sendCreated } = require('../utils/response');

const bulkSetupController = {
  /**
   * @route POST /api/admin/bulk-setup
   * @desc Performs complete bulk semester setup (Semester, Batches, ClearanceItems, Students)
   * @access Admin, Super Admin
   */
  async bulkSetupSemester(req, res, next) {
    try {
      const normalizedPayload = bulkSetupService.parsePayload(req.body);
      const result = await bulkSetupService.bulkSetupSemester({
        ...normalizedPayload,
        adminUser: req.user,
      });

      sendCreated(res, {
        data: result,
        message: `Bulk semester setup completed! Semester "${result.semester?.name}" created with ${result.studentsCreated?.length || 0} students and ${result.clearanceItemsCreated?.length || 0} clearance items.`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route POST /api/admin/clone-semester
   * @desc Clones previous semester's clearance items & batch structure to a new academic year
   * @access Admin, Super Admin
   */
  async cloneSemester(req, res, next) {
    try {
      const { sourceSemesterId, newAcademicYear, students } = req.body;
      const result = await bulkSetupService.cloneSemester({
        sourceSemesterId,
        newAcademicYear,
        students: students || [],
        adminUser: req.user,
      });

      sendCreated(res, {
        data: result,
        message: `Semester cloned successfully! New semester "${result.semester?.name}" (${newAcademicYear}) initialized.`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route GET /api/admin/bulk-setup/template
   * @desc Retrieves the JSON structure & sample data for the Excel/CSV template
   * @access Admin, Super Admin, HOD
   */
  async getTemplateStructure(req, res, next) {
    try {
      const { programCode } = req.query;
      const template = bulkSetupService.getTemplateStructure(programCode);
      sendSuccess(res, {
        data: template,
        message: 'Bulk setup template retrieved',
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = bulkSetupController;
