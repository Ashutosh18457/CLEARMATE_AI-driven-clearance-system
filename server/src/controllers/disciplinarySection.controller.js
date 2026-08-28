const disciplinarySectionService = require('../services/disciplinarySection.service');
const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

const disciplinarySectionController = {
  /**
   * Dedicated login endpoint for Disciplinary Section
   * POST /api/disciplinary-section/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login(email, password);

      res.cookie('clearmate_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, {
        data: { user, token },
        message: 'Disciplinary Section login successful',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get metadata: active branches (programs) and semesters
   * GET /api/disciplinary-section/branches
   */
  async getBranches(req, res, next) {
    try {
      const data = await disciplinarySectionService.getBranchesAndSemesters();
      sendSuccess(res, {
        data,
        message: 'Branches and semesters metadata fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * List students with disciplinary clearance status
   * GET /api/disciplinary-section/students
   */
  async getStudents(req, res, next) {
    try {
      const result = await disciplinarySectionService.getStudentsDisciplinaryStatus(req.query);
      sendSuccess(res, {
        data: result.students,
        pagination: result.pagination,
        message: 'Students disciplinary clearance status fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single student disciplinary details + audit trail
   * GET /api/disciplinary-section/students/:id
   */
  async getStudentDetail(req, res, next) {
    try {
      const { id } = req.params;
      const result = await disciplinarySectionService.getStudentDisciplinaryDetail(id);
      sendSuccess(res, {
        data: result,
        message: 'Student disciplinary clearance details fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update student disciplinary clearance status
   * PATCH /api/disciplinary-section/students/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const reviewerId = req.user.id;
      const result = await disciplinarySectionService.updateDisciplinaryStatus(id, req.body, reviewerId);
      sendSuccess(res, {
        data: result,
        message: 'Student disciplinary clearance status updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Bulk update student disciplinary clearance statuses
   * POST /api/disciplinary-section/students/bulk-update
   */
  async bulkUpdateStatus(req, res, next) {
    try {
      const { updates } = req.body;
      const reviewerId = req.user.id;
      const result = await disciplinarySectionService.bulkUpdateDisciplinaryStatus(updates, reviewerId);
      sendSuccess(res, {
        data: result,
        message: `Bulk disciplinary update completed. Success: ${result.successful.length}, Failed: ${result.failed.length}`,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete student disciplinary record
   * DELETE /api/disciplinary-section/students/:id
   */
  async deleteStudent(req, res, next) {
    try {
      const { id } = req.params;
      await disciplinarySectionService.deleteStudentDisciplinaryRecord(id);
      sendSuccess(res, {
        data: null,
        message: 'Student disciplinary record deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = disciplinarySectionController;
