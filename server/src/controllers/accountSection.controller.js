const accountSectionService = require('../services/accountSection.service');
const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

const accountSectionController = {
  /**
   * Dedicated login endpoint for Account Section
   * POST /api/account-section/login
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
        message: 'Account Section login successful',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get metadata: active branches (programs) and semesters
   * GET /api/account-section/branches
   */
  async getBranches(req, res, next) {
    try {
      const data = await accountSectionService.getBranchesAndSemesters();
      sendSuccess(res, {
        data,
        message: 'Branches and semesters metadata fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * List students with fee status
   * GET /api/account-section/students
   */
  async getStudents(req, res, next) {
    try {
      const result = await accountSectionService.getStudentsFeeStatus(req.query);
      sendSuccess(res, {
        data: result.students,
        pagination: result.pagination,
        message: 'Students fee clearance status fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single student fee details + audit trail
   * GET /api/account-section/students/:id
   */
  async getStudentDetail(req, res, next) {
    try {
      const { id } = req.params;
      const result = await accountSectionService.getStudentFeeDetail(id);
      sendSuccess(res, {
        data: result,
        message: 'Student fee clearance details fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update student fee clearance status
   * PATCH /api/account-section/students/:id/fees
   */
  async updateFees(req, res, next) {
    try {
      const { id } = req.params;
      const updatedByUserId = req.user.id;
      const result = await accountSectionService.updateStudentFees(id, req.body, updatedByUserId);
      sendSuccess(res, {
        data: result,
        message: 'Student fee status updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = accountSectionController;
