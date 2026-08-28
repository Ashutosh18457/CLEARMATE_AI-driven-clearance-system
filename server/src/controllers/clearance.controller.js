const clearanceService = require('../services/clearance.service');
const { sendSuccess, sendCreated } = require('../utils/response');

const clearanceController = {
  // ──────────────────────────────────────────────
  // STUDENT ENDPOINTS
  // ──────────────────────────────────────────────

  /** @route POST /api/clearances/initiate */
  async initiateClearance(req, res, next) {
    try {
      const result = await clearanceService.initiateClearance(req.user.id, req.body?.semesterId);
      sendCreated(res, {
        data: result,
        message: `Clearance initiated. ${result.itemClearancesCreated} items and ${result.sectionClearancesCreated} sections created for review.`,
      });
    } catch (error) { next(error); }
  },

  /** @route GET /api/clearances/prerequisites?semesterId= */
  async getPrerequisites(req, res, next) {
    try {
      const data = await clearanceService.checkPrerequisites(req.user.id, req.query.semesterId);
      sendSuccess(res, { data, message: 'Prerequisites status retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/clearances/my?semesterId= */
  async getMyClearanceStatus(req, res, next) {
    try {
      const data = await clearanceService.getMyClearanceStatus(req.user.id, req.query.semesterId);
      if (!data) {
        return sendSuccess(res, {
          data: null,
          message: 'No clearance request found for this semester. You can initiate one.',
        });
      }
      sendSuccess(res, { data, message: 'Clearance status retrieved' });
    } catch (error) { next(error); }
  },

  // ──────────────────────────────────────────────
  // TEACHER ENDPOINTS
  // ──────────────────────────────────────────────

  /** @route GET /api/clearances/items/pending */
  async getMyPendingItems(req, res, next) {
    try {
      const items = await clearanceService.getMyPendingItems(req.user.id);
      sendSuccess(res, { data: items, message: 'Pending items retrieved' });
    } catch (error) { next(error); }
  },

  /** @route PATCH /api/clearances/items/:id/review */
  async reviewItem(req, res, next) {
    try {
      const { status, remarks } = req.body;
      const item = await clearanceService.reviewItem(req.user.id, req.params.id, status, remarks);
      sendSuccess(res, { data: { item }, message: `Item ${status} successfully` });
    } catch (error) { next(error); }
  },

  // ──────────────────────────────────────────────
  // SECTION HEAD ENDPOINTS
  // ──────────────────────────────────────────────

  /** @route GET /api/clearances/sections/pending */
  async getMyPendingSections(req, res, next) {
    try {
      const user = await require('../models/User').findById(req.user.id);
      let sectionType = user?.sectionType;
      if (!sectionType && (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'section_head')) {
        sectionType = req.query.sectionType || 'library';
      }
      if (!sectionType) {
        return sendSuccess(res, { data: [], message: 'No section type assigned' });
      }
      const sections = await clearanceService.getMyPendingSections(sectionType);
      sendSuccess(res, { data: sections, message: 'Pending sections retrieved' });
    } catch (error) { next(error); }
  },

  /** @route PATCH /api/clearances/sections/:id/review */
  async reviewSection(req, res, next) {
    try {
      const { status, remarks } = req.body;
      const section = await clearanceService.reviewSection(req.user.id, req.params.id, status, remarks);
      sendSuccess(res, { data: { section }, message: `Section ${status} successfully` });
    } catch (error) { next(error); }
  },

  // ──────────────────────────────────────────────
  // CLASS INCHARGE ENDPOINTS
  // ──────────────────────────────────────────────

  /** @route GET /api/clearances/ci/pending */
  async getPendingCIReviews(req, res, next) {
    try {
      const requests = await clearanceService.getPendingCIReviews(req.user.id);
      sendSuccess(res, { data: requests, message: 'Pending CI reviews retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/clearances/ci/cohort-overview */
  async getCICohortOverview(req, res, next) {
    try {
      const cohortOverview = await clearanceService.getCICohortOverview(req.user.id);
      sendSuccess(res, { data: cohortOverview, message: 'Cohort overview retrieved successfully' });
    } catch (error) { next(error); }
  },

  /** @route PATCH /api/clearances/ci/:id/review */
  async reviewCI(req, res, next) {
    try {
      const { status, remarks } = req.body;
      const request = await clearanceService.reviewCI(req.user.id, req.params.id, status, remarks);
      sendSuccess(res, { data: { request }, message: `Clearance ${status === 'approved' ? 'advanced to HOD review' : 'rejected'}` });
    } catch (error) { next(error); }
  },

  // ──────────────────────────────────────────────
  // HOD ENDPOINTS
  // ──────────────────────────────────────────────

  /** @route GET /api/clearances/hod/pending */
  async getPendingHODReviews(req, res, next) {
    try {
      const requests = await clearanceService.getPendingHODReviews(req.user.id);
      sendSuccess(res, { data: requests, message: 'Pending HOD reviews retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/clearances/hod/teachers-overview */
  async getHODDepartmentTeachers(req, res, next) {
    try {
      const teachers = await clearanceService.getHODDepartmentTeachers(req.user.id);
      sendSuccess(res, { data: teachers, message: 'Department teachers retrieved' });
    } catch (error) { next(error); }
  },

  /** @route PATCH /api/clearances/hod/:id/review */
  async reviewHOD(req, res, next) {
    try {
      const { status, remarks } = req.body;
      const request = await clearanceService.reviewHOD(req.user.id, req.params.id, status, remarks);
      sendSuccess(res, { data: { request }, message: `Clearance ${status === 'approved' ? 'completed' : 'rejected'}` });
    } catch (error) { next(error); }
  },
};

module.exports = clearanceController;
