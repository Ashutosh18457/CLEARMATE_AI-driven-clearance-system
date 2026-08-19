const busSectionService = require('../services/busSection.service');
const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

const busSectionController = {
  /**
   * Dedicated login endpoint for Bus Section
   * POST /api/bus-section/login
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
        message: 'Bus Section login successful',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get metadata: active branches (programs) and semesters
   * GET /api/bus-section/branches
   */
  async getBranches(req, res, next) {
    try {
      const data = await busSectionService.getBranchesAndSemesters();
      sendSuccess(res, {
        data,
        message: 'Branches and semesters metadata fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * List students with bus fee status
   * GET /api/bus-section/students
   */
  async getStudents(req, res, next) {
    try {
      const result = await busSectionService.getStudentsBusFeeStatus(req.query);
      sendSuccess(res, {
        data: result.students,
        pagination: result.pagination,
        message: 'Students bus fee clearance status fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single student bus fee details + audit trail
   * GET /api/bus-section/students/:id
   */
  async getStudentDetail(req, res, next) {
    try {
      const { id } = req.params;
      const result = await busSectionService.getStudentBusFeeDetail(id);
      sendSuccess(res, {
        data: result,
        message: 'Student bus fee clearance details fetched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update student bus fee clearance status
   * PATCH /api/bus-section/students/:id/bus-fees
   */
  async updateFees(req, res, next) {
    try {
      const { id } = req.params;
      const updatedByUserId = req.user.id;
      const result = await busSectionService.updateStudentBusFees(id, req.body, updatedByUserId);
      sendSuccess(res, {
        data: result,
        message: 'Student bus fee status updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = busSectionController;
