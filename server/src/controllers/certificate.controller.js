const certificateService = require('../services/certificate.service');
const { sendSuccess } = require('../utils/response');

const certificateController = {
  /** @route GET /api/certificate/my?semesterId= */
  async getMyCertificate(req, res, next) {
    try {
      const data = await certificateService.getCertificateData(req.user.id, req.query.semesterId);
      sendSuccess(res, { data, message: 'Certificate data generated' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/certificate/verify/:certificateNumber */
  async verifyCertificate(req, res, next) {
    try {
      const data = await certificateService.verifyCertificate(req.params.certificateNumber);
      sendSuccess(res, { data, message: 'Certificate verified successfully' });
    } catch (error) { next(error); }
  },

  /** @route PATCH /api/certificate/:id/exam-cell */
  async markSentToExamCell(req, res, next) {
    try {
      const cr = await certificateService.markSentToExamCell(req.params.id);
      sendSuccess(res, { data: { clearanceRequest: cr }, message: 'Marked as sent to exam cell' });
    } catch (error) { next(error); }
  },
};

module.exports = certificateController;
