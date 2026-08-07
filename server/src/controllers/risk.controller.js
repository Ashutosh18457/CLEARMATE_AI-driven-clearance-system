const riskService = require('../services/risk.service');
const { sendSuccess } = require('../utils/response');

const riskController = {
  /** @route GET /api/risk/at-risk-students?semesterId=&riskLevel=&page=&limit= */
  async getAtRiskStudents(req, res, next) {
    try {
      const { semesterId, ...filters } = req.query;
      const data = await riskService.getAtRiskStudents(semesterId, filters);
      sendSuccess(res, { data, message: 'At-risk students retrieved' });
    } catch (error) { next(error); }
  },
};

module.exports = riskController;
