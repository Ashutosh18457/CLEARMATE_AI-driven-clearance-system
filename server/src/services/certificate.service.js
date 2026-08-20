const ClearanceRequest = require('../models/ClearanceRequest');
const User = require('../models/User');
const Semester = require('../models/Semester');
const Program = require('../models/Program');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const emailService = require('./email.service');

const certificateService = {
  /**
   * Generates certificate data for a completed clearance.
   * Returns structured data that the frontend can render into a PDF.
   *
   * Design: We return JSON data (not a binary PDF) so the frontend has full
   * control over the certificate design using HTML/CSS + browser print-to-PDF.
   * This avoids server-side PDF library dependencies while maintaining
   * a premium certificate design.
   */
  async getCertificateData(studentId, semesterId) {
    const clearanceRequest = await ClearanceRequest.findOne({
      studentId,
      semesterId,
      status: 'completed',
    });

    if (!clearanceRequest) {
      throw AppError.notFound('No completed clearance found for this semester');
    }

    const [student, semester] = await Promise.all([
      User.findById(studentId).select('name email enrollmentNo section currentSemester'),
      Semester.findById(semesterId).populate('programId', 'name code department'),
    ]);

    if (!student || !semester) {
      throw AppError.notFound('Student or semester data not found');
    }

    // Generate a unique certificate number
    const certNumber = this._generateCertificateNumber(clearanceRequest._id);

    // Build verification URL (can be used for QR code on frontend)
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${certNumber}`;

    const certificateData = {
      certificateNumber: certNumber,
      verificationUrl,
      student: {
        name: student.name,
        enrollmentNo: student.enrollmentNo,
        section: student.section,
        email: student.email,
      },
      program: {
        name: semester.programId?.name || 'N/A',
        code: semester.programId?.code || 'N/A',
        department: semester.programId?.department || 'N/A',
      },
      semester: {
        name: semester.name,
        number: semester.semNumber,
        academicYear: semester.academicYear,
        type: semester.type,
      },
      clearance: {
        initiatedAt: clearanceRequest.initiatedAt,
        completedAt: clearanceRequest.completedAt,
        requestId: clearanceRequest._id,
      },
      issuedAt: new Date().toISOString(),
      institution: 'S.B. Jain Institute of Technology, Management & Research, Nagpur',
    };

    // Update clearance request with certificate number
    clearanceRequest.certificateUrl = certNumber;
    await clearanceRequest.save();

    logger.info('Certificate data generated', {
      studentId,
      semesterId,
      certificateNumber: certNumber,
    });

    return certificateData;
  },

  /**
   * Verifies a certificate by its number.
   * Used for public verification (e.g., QR code scan).
   */
  async verifyCertificate(certificateNumber) {
    const clearanceRequest = await ClearanceRequest.findOne({
      certificateUrl: certificateNumber,
      status: 'completed',
    })
      .populate('studentId', 'name enrollmentNo section')
      .populate({
        path: 'semesterId',
        select: 'name semNumber academicYear',
        populate: { path: 'programId', select: 'name code' },
      });

    if (!clearanceRequest) {
      throw AppError.notFound('Invalid certificate number. Verification failed.');
    }

    return {
      valid: true,
      certificateNumber,
      student: {
        name: clearanceRequest.studentId?.name,
        enrollmentNo: clearanceRequest.studentId?.enrollmentNo,
        section: clearanceRequest.studentId?.section,
      },
      program: clearanceRequest.semesterId?.programId?.name,
      semester: clearanceRequest.semesterId?.name,
      academicYear: clearanceRequest.semesterId?.academicYear,
      completedAt: clearanceRequest.completedAt,
    };
  },

  /**
   * Marks a clearance as sent to exam cell and sends manifest email.
   */
  async markSentToExamCell(clearanceRequestId) {
    const cr = await ClearanceRequest.findByIdAndUpdate(
      clearanceRequestId,
      { sentToExamCell: true },
      { new: true }
    ).populate('studentId', 'name enrollmentNo email')
     .populate({
       path: 'semesterId',
       select: 'name semNumber academicYear programId',
       populate: { path: 'programId', select: 'name' }
     });

    if (!cr) throw AppError.notFound('Clearance request not found');

    // Send manifest email to Exam Cell (fire-and-forget)
    try {
      const examCellEmail = process.env.EXAM_CELL_EMAIL || 'examcell@sbjit.edu.in';
      const student = cr.studentId;
      const semesterName = cr.semesterId?.name || `Semester ${cr.semesterId?.semNumber}`;
      const programName = cr.semesterId?.programId?.name || 'Department';

      emailService.sendExamCellDispatchEmail({
        email: examCellEmail,
        clearedStudents: [{
          name: student?.name || 'Student',
          enrollmentNo: student?.enrollmentNo || 'N/A'
        }],
        semester: semesterName,
        program: programName,
      });
    } catch (err) {
      logger.error('Failed to trigger Exam Cell email dispatch', { error: err.message });
    }

    logger.info('Clearance marked as sent to exam cell', { requestId: clearanceRequestId });
    return cr;
  },

  /**
   * Generates a unique certificate number.
   * Format: CM-<YEAR>-<SHORT_ID>
   */
  _generateCertificateNumber(requestId) {
    const year = new Date().getFullYear();
    const shortId = requestId.toString().slice(-8).toUpperCase();
    return `CM-${year}-${shortId}`;
  },
};

module.exports = certificateService;
