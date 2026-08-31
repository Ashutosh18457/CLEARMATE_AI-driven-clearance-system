const certificateService = require('../services/certificate.service');
const { sendSuccess } = require('../utils/response');

const certificateController = {
  /** @route GET /api/certificate/my */
  async getMyCertificate(req, res, next) {
    try {
      const options = {
        branchOverride: req.query.branch || req.query.branchCode,
        sectionOverride: req.query.section,
        semOverride: req.query.semester || req.query.sem,
        rollNoOverride: req.query.rollNo || req.query.enrollmentNo,
        nameOverride: req.query.name,
        includeReRun: req.query.includeReRun,
        forceAllCleared: req.query.forceAllCleared === 'true',
      };
      const data = await certificateService.getCertificateData(req.user.id, req.query.semesterId, options);
      sendSuccess(res, { data, message: 'Clearance report data generated' });
    } catch (error) {
      next(error);
    }
  },

  /** @route GET /api/certificate/student/:studentId */
  async getStudentCertificate(req, res, next) {
    try {
      const options = {
        branchOverride: req.query.branch || req.query.branchCode,
        sectionOverride: req.query.section,
        semOverride: req.query.semester || req.query.sem,
        rollNoOverride: req.query.rollNo || req.query.enrollmentNo,
        nameOverride: req.query.name,
        includeReRun: req.query.includeReRun,
        forceAllCleared: req.query.forceAllCleared === 'true',
      };
      const data = await certificateService.getCertificateData(req.params.studentId, req.query.semesterId, options);
      sendSuccess(res, { data, message: 'Student certificate report data generated' });
    } catch (error) {
      next(error);
    }
  },

  /** @route GET /api/certificate/preview */
  async getPreviewCertificate(req, res, next) {
    try {
      const options = {
        branchOverride: req.query.branch || req.query.branchCode || 'CSE',
        sectionOverride: req.query.section || 'A',
        semOverride: req.query.semester || req.query.sem || 5,
        rollNoOverride: req.query.rollNo || req.query.enrollmentNo || 'EN2024CSE002',
        nameOverride: req.query.name || 'Rohan Iyer',
        includeReRun: req.query.includeReRun,
        forceAllCleared: req.query.forceAllCleared === 'true',
      };
      const data = await certificateService.getCertificateData(null, null, options);
      sendSuccess(res, { data, message: 'Dynamic preview generated' });
    } catch (error) {
      next(error);
    }
  },

  /** @route GET /api/certificate/verify/:certificateNumber */
  async verifyCertificate(req, res, next) {
    try {
      const data = await certificateService.verifyCertificate(req.params.certificateNumber);
      sendSuccess(res, { data, message: 'Certificate verified successfully' });
    } catch (error) {
      next(error);
    }
  },

  /** @route PATCH /api/certificate/:id/exam-cell */
  async markSentToExamCell(req, res, next) {
    try {
      const cr = await certificateService.markSentToExamCell(req.params.id);
      sendSuccess(res, { data: { clearanceRequest: cr }, message: 'Marked as sent to exam cell' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = certificateController;
