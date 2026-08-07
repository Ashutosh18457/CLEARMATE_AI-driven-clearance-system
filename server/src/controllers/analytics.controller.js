const analyticsService = require('../services/analytics.service');
const { sendSuccess } = require('../utils/response');

const analyticsController = {
  /** @route GET /api/analytics/clearance-overview?semesterId= */
  async getClearanceOverview(req, res, next) {
    try {
      const overview = await analyticsService.getClearanceOverview(req.query.semesterId);
      sendSuccess(res, { data: { overview }, message: 'Clearance overview retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/analytics/stage-distribution?semesterId= */
  async getStageDistribution(req, res, next) {
    try {
      const distribution = await analyticsService.getStageDistribution(req.query.semesterId);
      sendSuccess(res, { data: { distribution }, message: 'Stage distribution retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/analytics/department-stats?semesterId= */
  async getDepartmentStats(req, res, next) {
    try {
      const departments = await analyticsService.getDepartmentStats(req.query.semesterId);
      sendSuccess(res, { data: { departments }, message: 'Department stats retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/analytics/submission-stats?semesterId= */
  async getSubmissionStats(req, res, next) {
    try {
      const stats = await analyticsService.getSubmissionStats(req.query.semesterId);
      sendSuccess(res, { data: { stats }, message: 'Submission stats retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/analytics/student-progress?semesterId= */
  async getStudentProgress(req, res, next) {
    try {
      const { semesterId, ...filters } = req.query;
      const data = await analyticsService.getStudentProgress(semesterId, filters);
      sendSuccess(res, { data, message: 'Student progress retrieved' });
    } catch (error) { next(error); }
  },
};

module.exports = analyticsController;
