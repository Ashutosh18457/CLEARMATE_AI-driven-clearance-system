const librarySectionService = require('../services/librarySection.service');
const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

const librarySectionController = {
  /**
   * Dedicated login endpoint for Library Section
   * POST /api/library-section/login
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
        message: 'Library Section login successful',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get metadata: active branches (programs) and semesters
   * GET /api/library-section/branches
   */
  async getBranches(req, res, next) {
    try {
      const data = await librarySectionService.getBranchesAndSemesters();
      sendSuccess(res, {
        data,
        message: 'Branches and semesters metadata fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * List students with library clearance status
   * GET /api/library-section/students
   */
  async getStudents(req, res, next) {
    try {
      const result = await librarySectionService.getStudentsLibraryStatus(req.query);
      sendSuccess(res, {
        data: result.students,
        pagination: result.pagination,
        message: 'Students library clearance status fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single student library details + audit trail
   * GET /api/library-section/students/:id
   */
  async getStudentDetail(req, res, next) {
    try {
      const { id } = req.params;
      const result = await librarySectionService.getStudentLibraryDetail(id);
      sendSuccess(res, {
        data: result,
        message: 'Student library clearance details fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update student library clearance status
   * PATCH /api/library-section/students/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const updatedByUserId = req.user.id;
      const result = await librarySectionService.updateStudentLibraryStatus(id, req.body, updatedByUserId);
      sendSuccess(res, {
        data: result,
        message: 'Student library clearance status updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Bulk update student library clearance status
   * POST /api/library-section/students/bulk-update
   */
  async bulkUpdateStatus(req, res, next) {
    try {
      const { studentIds, studentIdentifiers, status = 'paid', remark_text } = req.body;
      const idsToUpdate = studentIds || studentIdentifiers || [];
      const updatedByUserId = req.user.id;

      const result = await librarySectionService.bulkUpdateStudentLibraryStatus(
        idsToUpdate,
        status,
        remark_text || 'Bulk library clearance granted',
        updatedByUserId
      );

      sendSuccess(res, {
        data: result,
        message: `Successfully updated library clearance for ${result.count} students`,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = librarySectionController;
