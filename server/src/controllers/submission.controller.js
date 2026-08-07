const submissionService = require('../services/submission.service');
const { sendSuccess, sendCreated } = require('../utils/response');

const submissionController = {
  // ──────────────────────────────────────────────
  // TEACHER ENDPOINTS
  // ──────────────────────────────────────────────

  /** @route POST /api/submissions/items */
  async createSubmissionItem(req, res, next) {
    try {
      const item = await submissionService.createSubmissionItem(req.user.id, req.body);
      sendCreated(res, { data: { item }, message: 'Submission item created successfully' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/submissions/items?semesterId= */
  async getSubmissionItems(req, res, next) {
    try {
      const items = await submissionService.getSubmissionItemsByTeacher(req.user.id, req.query.semesterId);
      sendSuccess(res, { data: items, message: 'Submission items retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/submissions/items/:id/students */
  async getStudentSubmissions(req, res, next) {
    try {
      const data = await submissionService.getStudentSubmissions(req.user.id, req.params.id);
      sendSuccess(res, { data, message: 'Student submissions retrieved' });
    } catch (error) { next(error); }
  },

  /** @route PATCH /api/submissions/:id/verify */
  async verifySubmission(req, res, next) {
    try {
      const { status, remarks } = req.body;
      const submission = await submissionService.verifySubmission(req.user.id, req.params.id, status, remarks);
      sendSuccess(res, { data: { submission }, message: `Submission ${status} successfully` });
    } catch (error) { next(error); }
  },

  // ──────────────────────────────────────────────
  // STUDENT ENDPOINTS
  // ──────────────────────────────────────────────

  /** @route GET /api/submissions/my?semesterId= */
  async getMySubmissions(req, res, next) {
    try {
      const submissions = await submissionService.getMySubmissions(req.user.id, req.query.semesterId);
      sendSuccess(res, { data: submissions, message: 'Your submissions retrieved' });
    } catch (error) { next(error); }
  },

  /** @route POST /api/submissions/submit */
  async submitWork(req, res, next) {
    try {
      const submission = await submissionService.submitWork(req.user.id, req.body.submissionItemId);
      sendSuccess(res, { data: { submission }, message: 'Work submitted successfully' });
    } catch (error) { next(error); }
  },
};

module.exports = submissionController;
