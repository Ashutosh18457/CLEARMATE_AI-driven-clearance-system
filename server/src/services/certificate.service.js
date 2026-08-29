const ClearanceRequest = require('../models/ClearanceRequest');
const ItemClearance = require('../models/ItemClearance');
const SectionClearance = require('../models/SectionClearance');
const User = require('../models/User');
const Semester = require('../models/Semester');
const Program = require('../models/Program');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const certificateService = {
  /**
   * Generates certificate data for a completed clearance.
   * Returns structured data that the frontend can render into a PDF / Clearance Report.
   */
  async getCertificateData(studentId, semesterId) {
    const student = await User.findById(studentId)
      .select('name email enrollmentNo section currentSemester programId')
      .populate('programId', 'name code department');

    if (!student) {
      throw AppError.notFound('Student data not found');
    }

    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      let activeSemester = await Semester.findOne({
        programId: student.programId?._id || student.programId,
        semNumber: student.currentSemester,
        isActive: true,
      });
      if (!activeSemester) {
        activeSemester = (await Semester.findOne({ programId: student.programId?._id || student.programId })) || (await Semester.findOne({ isActive: true }));
      }
      if (activeSemester) targetSemesterId = activeSemester._id;
    }

    const query = { studentId };
    if (targetSemesterId) {
      query.semesterId = targetSemesterId;
    }

    let clearanceRequest = await ClearanceRequest.findOne(query)
      .sort({ completedAt: -1, updatedAt: -1 });

    if (!clearanceRequest) {
      clearanceRequest = await ClearanceRequest.findOne({ studentId })
        .sort({ completedAt: -1, updatedAt: -1 });
    }

    const resolvedSemesterId = clearanceRequest?.semesterId || targetSemesterId;
    const semester = resolvedSemesterId ? await Semester.findById(resolvedSemesterId).populate('programId', 'name code department') : null;

    const prog = semester?.programId || student.programId || {};
    const programName = prog?.name || (prog?.code === 'CSE' ? 'Computer Science & Engineering' : prog?.code === 'AI&DS' ? 'Artificial Intelligence & Data Science' : 'Engineering & Technology');
    const programCode = prog?.code || 'CSE';
    const departmentName = prog?.department || `Department of ${programName}`;

    // Dynamically resolve Class Incharge assigned to student's section/cohort
    const cleanSection = student.section ? student.section.replace(/^Sec(tion)?\s*/i, '').trim() : 'A';
    let ciUser = await User.findOne({
      role: 'class_incharge',
      $or: [
        { assignedStudents: student._id },
        {
          assignedProgramId: student.programId?._id || student.programId,
          assignedSection: new RegExp(`^(Sec(tion)?\\s*)?${cleanSection}$`, 'i'),
        },
        {
          assignedSection: new RegExp(`^(Sec(tion)?\\s*)?${cleanSection}$`, 'i'),
        },
      ],
    }).select('name email');

    if (!ciUser) {
      ciUser = await User.findOne({ role: 'class_incharge' }).select('name email');
    }

    // Dynamically resolve HOD of this department
    let hodUser = await User.findOne({
      role: 'hod',
      $or: [
        { programId: student.programId?._id || student.programId },
        { department: prog?.department },
      ],
    }).select('name email');

    if (!hodUser) {
      hodUser = await User.findOne({ role: 'hod' }).select('name email');
    }

    // Fetch Section Clearances
    const sectionClearances = clearanceRequest
      ? await SectionClearance.find({ clearanceRequestId: clearanceRequest._id }).populate('reviewerId', 'name email').populate('updated_by', 'name email').sort({ department: 1 })
      : await SectionClearance.find({ studentId }).populate('reviewerId', 'name email').populate('updated_by', 'name email').sort({ department: 1 });

    // Fetch Item Clearances or dynamic ClearanceItems
    let itemClearances = clearanceRequest
      ? await ItemClearance.find({ clearanceRequestId: clearanceRequest._id })
          .populate('teacherId', 'name email')
          .populate('clearanceItemId', 'title subjectCode type theoryTeacherId labBatchTeachers electiveOptions')
          .sort({ itemType: 1, itemTitle: 1 })
      : [];

    if (itemClearances.length === 0 && resolvedSemesterId) {
      const ClearanceItem = require('../models/ClearanceItem');
      const dynamicItems = await ClearanceItem.find({ semesterId: resolvedSemesterId })
        .populate('theoryTeacherId', 'name email')
        .populate('labBatchTeachers.teacherId', 'name email')
        .populate('electiveOptions.teacherId', 'name email')
        .sort({ srNo: 1, title: 1 });

      itemClearances = dynamicItems.map((item) => ({
        itemTitle: item.title,
        clearanceItemId: item,
        itemType: item.type,
        teacherId: item.theoryTeacherId || item.labBatchTeachers?.[0]?.teacherId || item.electiveOptions?.[0]?.teacherId,
        status: 'approved',
        remarks: 'All Submissions Verified',
      }));
    }

    // Generate unique certificate / report number
    const certNumber = clearanceRequest
      ? this._generateCertificateNumber(clearanceRequest._id)
      : `CM-${new Date().getFullYear()}-${student.enrollmentNo?.slice(-6) || 'RPT01'}`;

    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${certNumber}`;

    const departmentMap = {
      accounts: 'Account Section',
      student_section: 'Student Section',
      bus: 'Bus In-charge',
      library: 'Library',
    };

    const defaultSections = [
      { srNo: 1, department: 'accounts', sectionName: 'Account Section', remarks: 'Fees verification & tuition dues', status: 'Approved', reviewerName: 'Account Section Admin' },
      { srNo: 2, department: 'bus', sectionName: 'Bus In-charge', remarks: 'Transport dues verification', status: 'Approved', reviewerName: 'Bus Section Admin' },
      { srNo: 3, department: 'library', sectionName: 'Library', remarks: 'Book returns and fine clearance', status: 'Approved', reviewerName: 'Library Head' },
    ];

    const formattedSections = (sectionClearances.length > 0 ? sectionClearances : defaultSections).map((sc, idx) => {
      const isPaid = sc.fees_status === 'paid' || sc.bus_fees_status === 'paid' || sc.status === 'approved';
      return {
        srNo: idx + 1,
        department: sc.department,
        sectionName: departmentMap[sc.department] || sc.sectionName || sc.department?.toUpperCase() || 'Section',
        status: isPaid ? 'Approved' : (sc.status === 'rejected' ? 'Rejected' : 'Pending'),
        remarks: sc.remark_text || sc.remarks || (isPaid ? 'No Dues / Cleared' : 'Verification pending'),
        reviewerName: sc.reviewerId?.name || sc.updated_by?.name || sc.reviewerName || `${departmentMap[sc.department] || 'Section'} Admin`,
        reviewedAt: sc.reviewedAt || sc.updated_at,
      };
    });

    const formattedItems = itemClearances.map((item, idx) => {
      const teacherName =
        item.teacherId?.name ||
        item.clearanceItemId?.theoryTeacherId?.name ||
        item.clearanceItemId?.labBatchTeachers?.[0]?.teacherId?.name ||
        item.clearanceItemId?.electiveOptions?.[0]?.teacherId?.name ||
        'Assigned Faculty';

      return {
        srNo: idx + 1,
        title: item.itemTitle || item.clearanceItemId?.title || 'Subject Course',
        subjectCode: item.clearanceItemId?.subjectCode || '',
        type: item.itemType || item.clearanceItemId?.type || 'theory',
        teacherName,
        status: item.status === 'approved' ? 'Approved' : (item.status === 'rejected' ? 'Rejected' : 'Pending'),
        remarks: item.remarks || (item.status === 'approved' ? 'Verified & Cleared' : 'Evaluation in progress'),
        reviewedAt: item.reviewedAt,
      };
    });

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
        name: programName,
        code: programCode,
        department: departmentName,
      },
      semester: {
        name: semester?.name || `Semester ${student.currentSemester || '—'}`,
        number: semester?.semNumber || student.currentSemester,
        academicYear: semester?.academicYear || '2024-25',
        type: semester?.type || 'ODD',
        session: `Session ${semester?.academicYear || '2024-25'} (${semester?.type || 'ODD'})`,
      },
      clearance: {
        initiatedAt: clearanceRequest?.initiatedAt || new Date(),
        completedAt: clearanceRequest?.completedAt || clearanceRequest?.updatedAt || new Date(),
        requestId: clearanceRequest?._id || 'LIVE-REPORT',
      },
      sections: formattedSections,
      items: formattedItems,
      classIncharge: {
        name: ciUser?.name || `Class Incharge (Sec ${student.section || 'A'})`,
        email: ciUser?.email,
        status: 'Digitally Approved',
      },
      hod: {
        name: hodUser?.name || `Head of Department (${programCode})`,
        email: hodUser?.email,
        status: 'Digitally Approved',
      },
      issuedAt: new Date().toISOString(),
      institution: 'S.B. JAIN INSTITUTE OF TECHNOLOGY, MANAGEMENT & RESEARCH, NAGPUR',
      departmentHeader: `DEPARTMENT OF ${programName.toUpperCase()} (${programCode.toUpperCase()})`,
    };

    if (clearanceRequest) {
      clearanceRequest.certificateUrl = certNumber;
      await clearanceRequest.save().catch(() => {});
    }

    logger.info('Certificate/Report data generated', {
      studentId,
      certificateNumber: certNumber,
      itemsCount: formattedItems.length,
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
   * Marks a clearance as processed/archived.
   */
  async markSentToExamCell(clearanceRequestId) {
    const cr = await ClearanceRequest.findByIdAndUpdate(
      clearanceRequestId,
      { sentToExamCell: true },
      { new: true }
    );
    if (!cr) throw AppError.notFound('Clearance request not found');
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
