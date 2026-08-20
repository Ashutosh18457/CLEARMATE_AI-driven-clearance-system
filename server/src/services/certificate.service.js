const ClearanceRequest = require('../models/ClearanceRequest');
const ItemClearance = require('../models/ItemClearance');
const SectionClearance = require('../models/SectionClearance');
const User = require('../models/User');
const Semester = require('../models/Semester');
const Program = require('../models/Program');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const emailService = require('./email.service');

const certificateService = {
  /**
   * Generates certificate data for a completed clearance.
   * Returns structured data that the frontend can render into a PDF / Clearance Report.
   */
  async getCertificateData(studentId, semesterId) {
    const query = { studentId, status: 'completed' };
    if (semesterId) {
      query.semesterId = semesterId;
    }

    let clearanceRequest = await ClearanceRequest.findOne(query)
      .sort({ completedAt: -1, updatedAt: -1 });

    if (!clearanceRequest) {
      // Fallback: match by studentId and completed status/stage regardless of specific semester param
      clearanceRequest = await ClearanceRequest.findOne({
        studentId,
        $or: [{ status: 'completed' }, { currentStage: 'completed' }],
      }).sort({ completedAt: -1, updatedAt: -1 });
    }

    if (!clearanceRequest) {
      throw AppError.notFound('No completed clearance found for this semester');
    }

    const resolvedSemesterId = clearanceRequest.semesterId;
    const [student, semester, itemClearances, sectionClearances, ciUser, hodUser] = await Promise.all([
      User.findById(studentId)
        .select('name email enrollmentNo section currentSemester programId')
        .populate('programId', 'name code department'),
      resolvedSemesterId ? Semester.findById(resolvedSemesterId).populate('programId', 'name code department') : null,
      ItemClearance.find({ clearanceRequestId: clearanceRequest._id })
        .populate('teacherId', 'name email')
        .populate('clearanceItemId', 'title subjectCode type')
        .sort({ itemType: 1, itemTitle: 1 }),
      SectionClearance.find({ clearanceRequestId: clearanceRequest._id })
        .populate('reviewerId', 'name email')
        .populate('updated_by', 'name email')
        .sort({ department: 1 }),
      User.findOne({ role: 'class_incharge' }).select('name email'),
      User.findOne({ role: 'hod' }).select('name email'),
    ]);

    if (!student) {
      throw AppError.notFound('Student data not found');
    }

    // Generate a unique certificate number
    const certNumber = this._generateCertificateNumber(clearanceRequest._id);

    // Build verification URL (can be used for QR code on frontend)
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${certNumber}`;

    const prog = semester?.programId || student.programId || {};

    const departmentMap = {
      accounts: 'Account Section',
      student_section: 'Student Section',
      bus: 'Bus In-charge',
      library: 'Library',
    };

    const formattedSections = sectionClearances.map((sc, idx) => ({
      srNo: idx + 1,
      department: sc.department,
      sectionName: departmentMap[sc.department] || sc.department?.toUpperCase() || 'Section',
      status: sc.status === 'approved' ? 'Approved' : (sc.fees_status === 'paid' ? 'Paid / Approved' : sc.status),
      remarks: sc.remark_text || sc.remarks || (sc.fees_status === 'paid' ? 'No Dues (Fees Paid)' : 'No Dues / Cleared'),
      reviewerName: sc.reviewerId?.name || sc.updated_by?.name || 'Section In-charge',
      reviewedAt: sc.reviewedAt || sc.updated_at,
    }));

    const formattedItems = itemClearances.map((item, idx) => ({
      srNo: idx + 1,
      title: item.itemTitle || item.clearanceItemId?.title || 'Subject',
      subjectCode: item.clearanceItemId?.subjectCode || '',
      type: item.itemType || 'theory',
      teacherName: item.teacherId?.name || 'Assigned Faculty',
      status: item.status === 'approved' ? 'Approved' : item.status,
      remarks: item.remarks || 'Verified & Cleared',
      reviewedAt: item.reviewedAt,
    }));

    const certificateData = {
      certificateNumber: certNumber,
      verificationUrl,
      student: {
        name: student.name,
        enrollmentNo: student.enrollmentNo,
        rollNo: student.enrollmentNo,
        section: student.section || 'A',
        email: student.email,
        currentSemester: student.currentSemester,
        year: student.currentSemester ? (Math.ceil(student.currentSemester / 2) === 1 ? 'I' : Math.ceil(student.currentSemester / 2) === 2 ? 'II' : Math.ceil(student.currentSemester / 2) === 3 ? 'III' : 'IV') : 'III',
      },
      program: {
        name: prog?.name || 'Emerging Technologies',
        code: prog?.code || 'AI&DS',
        department: prog?.department || 'Department of Emerging Technologies',
      },
      semester: {
        name: semester?.name || `Semester ${student.currentSemester || '—'}`,
        number: semester?.semNumber || student.currentSemester,
        academicYear: semester?.academicYear || '2024-25',
        type: semester?.type || 'ODD',
        session: `Session ${semester?.academicYear || '2024-25'} (${semester?.type || 'ODD'})`,
      },
      clearance: {
        initiatedAt: clearanceRequest.initiatedAt,
        completedAt: clearanceRequest.completedAt || clearanceRequest.updatedAt,
        requestId: clearanceRequest._id,
      },
      sections: formattedSections,
      items: formattedItems,
      classIncharge: {
        name: ciUser?.name || 'Class In-Charge',
        email: ciUser?.email,
        status: 'Digitally Approved',
      },
      hod: {
        name: hodUser?.name || 'Dr. Kulkarni (HOD)',
        email: hodUser?.email,
        status: 'Digitally Approved',
      },
      issuedAt: new Date().toISOString(),
      institution: 'S.B. JAIN INSTITUTE OF TECHNOLOGY, MANAGEMENT & RESEARCH, NAGPUR',
      departmentHeader: `DEPARTMENT OF EMERGING TECHNOLOGIES (${prog?.code || 'AI&ML AND AI&DS'})`,
    };

    // Update clearance request with certificate number
    clearanceRequest.certificateUrl = certNumber;
    await clearanceRequest.save();

    logger.info('Certificate data generated', {
      studentId,
      semesterId: resolvedSemesterId,
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
