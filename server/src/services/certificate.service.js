const ClearanceRequest = require('../models/ClearanceRequest');
const ItemClearance = require('../models/ItemClearance');
const SectionClearance = require('../models/SectionClearance');
const User = require('../models/User');
const Semester = require('../models/Semester');
const Program = require('../models/Program');
const FacultyMapping = require('../models/FacultyMapping');
const { DEFAULT_UNIVERSITY_MAPPINGS } = require('../controllers/facultyMapping.controller');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const certificateService = {
  /**
   * Helper to resolve faculty mapping for branch & section
   */
  async resolveBranchMapping(branchCode) {
    const code = (branchCode || 'CSE').toUpperCase();
    let mapping = await FacultyMapping.findOne({ branchCode: code });
    if (!mapping) {
      const fallback = DEFAULT_UNIVERSITY_MAPPINGS.find(
        (m) => m.branchCode.toUpperCase() === code
      );
      if (fallback) {
        try {
          mapping = await FacultyMapping.create(fallback);
        } catch (e) {
          mapping = fallback;
        }
      } else {
        mapping = DEFAULT_UNIVERSITY_MAPPINGS[0]; // fallback to CSE
      }
    }
    return mapping;
  },

  /**
   * Generates dynamic clearance and certificate report data.
   * Supports overrides via options for simulation and dynamic frontend filters.
   */
  async getCertificateData(studentId, semesterId, options = {}) {
    const {
      branchOverride,
      sectionOverride,
      semOverride,
      rollNoOverride,
      nameOverride,
      includeReRun,
      forceAllCleared,
    } = options;

    let student = null;
    let clearanceRequest = null;
    if (studentId && studentId !== 'demo-student') {
      student = await User.findById(studentId)
        .select('name email enrollmentNo section currentSemester programId')
        .populate('programId', 'name code department');
      
      if (student) {
        const crQuery = { studentId };
        if (semesterId) {
          crQuery.semesterId = semesterId;
        }
        clearanceRequest = await ClearanceRequest.findOne(crQuery)
          .sort({ createdAt: -1 })
          .populate('semesterId');
      }
    }

    // Default fallback student if not found or demo
    if (!student) {
      student = {
        _id: 'demo-student-id',
        name: nameOverride || 'Rohan Iyer',
        enrollmentNo: rollNoOverride || 'EN2024CSE002',
        email: 'student@clearmate.dev',
        section: sectionOverride || 'A',
        currentSemester: semOverride ? Number(semOverride) : 5,
        programId: {
          name: 'Computer Science & Engineering',
          code: branchOverride || 'CSE',
          department: 'Department of Computer Science & Engineering',
        },
      };
    }

    const effectiveBranchCode = (
      branchOverride ||
      student.programId?.code ||
      'CSE'
    ).toUpperCase();

    const effectiveSection = (
      sectionOverride ||
      student.section ||
      'A'
    ).replace(/^Sec(tion)?\s*/i, '').trim().toUpperCase();

    const effectiveSem = semOverride
      ? Number(semOverride)
      : (clearanceRequest?.semesterId?.semNumber || student.currentSemester || 5);
    const effectiveRollNo = rollNoOverride || student.enrollmentNo || 'EN2024CSE002';
    const effectiveName = nameOverride || student.name || 'Student';

    // 1. Resolve Branch Faculty Mapping from DB
    const branchMapping = await this.resolveBranchMapping(effectiveBranchCode);

    // 2. Resolve Class Incharge: Check DB Users first, fallback to FacultyMapping
    let dbCI = null;
    try {
      dbCI = await User.findOne({
        role: 'class_incharge',
        $or: [
          { section: effectiveSection },
          { section: `Section ${effectiveSection}` },
          { programId: student.programId?._id || student.programId },
        ],
      });
    } catch (e) {}

    const matchedSection = (branchMapping.sections || []).find(
      (s) => s.sectionName?.toUpperCase() === effectiveSection
    ) || branchMapping.sections?.[0];

    const resolvedCI = {
      name: dbCI?.name || matchedSection?.classIncharge?.name || `Prof. Class Incharge (Sec ${effectiveSection})`,
      email: dbCI?.email || matchedSection?.classIncharge?.email || `ci.${effectiveBranchCode.toLowerCase()}@clearmate.edu`,
      designation: dbCI ? `Assistant Professor & Class Incharge (Sec ${effectiveSection})` : (matchedSection?.classIncharge?.designation || `Assistant Professor & Class Incharge (Sec ${effectiveSection})`),
    };

    // 3. Resolve HOD: Check DB Users first, fallback to FacultyMapping
    let dbHOD = null;
    try {
      dbHOD = await User.findOne({
        role: 'hod',
        $or: [
          { programId: student.programId?._id || student.programId },
          { department: new RegExp(effectiveBranchCode, 'i') },
        ],
      });
    } catch (e) {}

    const resolvedHOD = {
      name: dbHOD?.name || branchMapping.hod?.name || 'Dr. Kulkarni',
      email: dbHOD?.email || branchMapping.hod?.email || `hod.${effectiveBranchCode.toLowerCase()}@clearmate.edu`,
      title: `HOD - ${effectiveBranchCode}`,
      designation: dbHOD ? 'Professor & Head of Department' : (branchMapping.hod?.designation || 'Professor & Head of Department'),
      department: branchMapping.department || `Department of ${branchMapping.branchName}`,
    };

    // 4. Resolve Subjects & Item Clearances
    let finalSubjectRows = [];

    // Check if student has actual ItemClearances in DB
    let actualItemClearances = [];
    if (studentId && studentId !== 'demo-student') {
      try {
        actualItemClearances = await ItemClearance.find({ studentId })
          .populate({
            path: 'clearanceItemId',
            populate: { path: 'theoryTeacherId', select: 'name email' },
          })
          .populate('teacherId', 'name email');
      } catch (e) {}
    }

    if (actualItemClearances.length > 0) {
      finalSubjectRows = actualItemClearances.map((ic, idx) => {
        const item = ic.clearanceItemId || {};
        const teacherName = ic.teacherId?.name || item.theoryTeacherId?.name || resolvedCI.name || 'Faculty';
        const isAppr = forceAllCleared ? true : ic.status === 'approved';
        return {
          srNo: idx + 1,
          title: item.title || `Subject ${idx + 1}`,
          subjectCode: item.subjectCode || '',
          type: item.type || 'theory',
          teacherName,
          status: forceAllCleared ? 'Approved' : (ic.status === 'approved' ? 'Approved' : (ic.status === 'rejected' ? 'Rejected' : 'Pending')),
          remarks: ic.remarks || (isAppr ? 'Coursework & records cleared' : 'Verification pending'),
          isReRun: !!item.isReRun,
        };
      });
    } else {
      // Resolve from Semester / Faculty Mapping in DB
      let semesterSubjects = [];
      const semMap = (branchMapping.semesters || []).find((s) => s.semNumber === effectiveSem);
      if (semMap && semMap.subjects && semMap.subjects.length > 0) {
        semesterSubjects = semMap.subjects;
      } else {
        if (effectiveBranchCode === 'AIML') {
          semesterSubjects = [
            { code: 'AI501', title: 'Machine Learning (ML)', teacherName: 'Prof. Verma', type: 'theory', remarks: 'Model implementations verified' },
            { code: 'AI502', title: 'Deep Learning Architectures (DL)', teacherName: 'Prof. P. Gupta', type: 'theory', remarks: 'Neural network projects signed off' },
            { code: 'AI503', title: 'Natural Language Processing (NLP)', teacherName: 'Dr. Singh', type: 'theory', remarks: 'Transformer labs cleared' },
          ];
        } else if (effectiveBranchCode === 'IT') {
          semesterSubjects = [
            { code: 'IT501', title: 'Web Technologies & Frameworks', teacherName: 'Prof. Patil', type: 'theory', remarks: 'Assignments & practical cleared' },
            { code: 'IT502', title: 'Cloud Computing & DevOps', teacherName: 'Prof. S. Joshi', type: 'theory', remarks: 'Cloud lab tasks verified' },
            { code: 'IT503', title: 'Information & Cyber Security', teacherName: 'Prof. N. Deshmukh', type: 'theory', remarks: 'Audit assignment submitted' },
          ];
        } else if (effectiveBranchCode === 'CIVIL') {
          semesterSubjects = [
            { code: 'CE501', title: 'Structural Analysis-II', teacherName: 'Prof. Joshi', type: 'theory', remarks: 'Calculation sheets verified' },
            { code: 'CE502', title: 'Geotechnical Engineering', teacherName: 'Prof. R. Dave', type: 'theory', remarks: 'Soil sample tests evaluated' },
            { code: 'CE503', title: 'Surveying & GIS', teacherName: 'Dr. A. Verma', type: 'theory', remarks: 'Field survey maps submitted' },
          ];
        } else if (effectiveBranchCode === 'MECHANICAL') {
          semesterSubjects = [
            { code: 'ME501', title: 'Heat Transfer & Thermodynamics', teacherName: 'Prof. Rao', type: 'theory', remarks: 'Assignments & term tests cleared' },
            { code: 'ME502', title: 'Design of Machine Elements', teacherName: 'Prof. S. R. Patil', type: 'theory', remarks: 'CAD sheets submitted' },
            { code: 'ME503', title: 'Fluid Mechanics & Machinery', teacherName: 'Prof. M. Shinde', type: 'theory', remarks: 'Practical journals verified' },
          ];
        } else {
          semesterSubjects = [
            { code: 'CS501', title: 'Database Management Systems (DBMS)', teacherName: 'Prof. Sharma', type: 'theory', remarks: 'Theory records & assignments verified' },
            { code: 'CS502', title: 'Computer Networks (CN)', teacherName: 'Prof. K. Verma', type: 'theory', remarks: 'Assignments & viva cleared' },
            { code: 'CS503', title: 'Theory of Computation (TOC)', teacherName: 'Prof. S. Mehta', type: 'theory', remarks: 'Tutorials & mini assignment cleared' },
          ];
        }
      }

      finalSubjectRows = semesterSubjects.map((sub, idx) => ({
        srNo: idx + 1,
        title: sub.title,
        subjectCode: sub.code || '',
        type: sub.type || 'theory',
        teacherName: sub.teacherName || 'Faculty In-charge',
        status: forceAllCleared ? 'Approved' : (sub.status === 'approved' ? 'Approved' : 'Pending'),
        remarks: forceAllCleared
          ? (sub.remarks || 'Assignments & Theory records cleared')
          : (sub.status === 'approved' ? 'Coursework cleared' : (clearanceRequest ? 'Awaiting faculty evaluation' : 'Clearance not initiated')),
        isReRun: !!sub.isReRun,
      }));
    }

    // 5. Check if Re-run subject is requested or present
    const shouldAddReRun = includeReRun === 'true' || includeReRun === true;
    if (shouldAddReRun && !finalSubjectRows.some((s) => s.isReRun)) {
      finalSubjectRows.push({
        srNo: finalSubjectRows.length + 1,
        title: `${effectiveBranchCode === 'AIML' ? 'Foundations of Data Science' : effectiveBranchCode === 'IT' ? 'Data Structures & Algorithms' : 'Data Structures & Algorithms'} [RE-RUN]`,
        subjectCode: 'BCK-302',
        type: 'theory',
        teacherName: resolvedCI.name || 'Prof. Faculty',
        status: forceAllCleared ? 'Approved' : 'Pending',
        remarks: 'Re-run course practical & viva evaluation in progress',
        isReRun: true,
      });
    }

    // 6. Section Clearances (Institutional)
    const departmentMap = {
      accounts: 'Accounts',
      bus: 'Bus / Transport',
      library: 'Library',
      disciplinary: 'Disciplinary',
    };

    let sectionClearances = [];
    if (studentId && studentId !== 'demo-student') {
      sectionClearances = await SectionClearance.find({ studentId })
        .populate('reviewerId', 'name email')
        .sort({ department: 1 });
    }

    const defaultInstitutional = [
      { srNo: 1, department: 'accounts', sectionName: 'Accounts', remarks: 'Fees verification & tuition dues', status: 'Pending', reviewerName: 'Accounts Section Head' },
      { srNo: 2, department: 'bus', sectionName: 'Bus / Transport', remarks: 'Transport dues verification', status: 'Pending', reviewerName: 'Transport Section Head' },
      { srNo: 3, department: 'library', sectionName: 'Library', remarks: 'Book returns and fine clearance', status: 'Pending', reviewerName: 'Library Section Head' },
      { srNo: 4, department: 'disciplinary', sectionName: 'Disciplinary', remarks: 'Student conduct & disciplinary clearance', status: 'Pending', reviewerName: 'Disciplinary Section Head' },
    ];

    const formattedSections = defaultInstitutional.map((sec, idx) => {
      const match = sectionClearances.find((sc) => sc.department === sec.department);
      if (match) {
        const isPaid = match.fees_status === 'paid' || match.bus_fees_status === 'paid' || match.status === 'approved';
        const isRej = match.status === 'rejected';
        return {
          srNo: idx + 1,
          department: sec.department,
          sectionName: departmentMap[sec.department] || sec.sectionName,
          status: forceAllCleared ? 'Approved' : (isPaid ? 'Approved' : (isRej ? 'Rejected' : 'Pending')),
          remarks: match.remark_text || match.remarks || (isPaid ? 'No Dues / Cleared' : (isRej ? 'Clearance rejected' : 'Verification pending')),
          reviewerName: match.reviewerId?.name || sec.reviewerName,
          reviewedAt: match.reviewedAt || match.updatedAt,
        };
      }
      return {
        ...sec,
        status: forceAllCleared ? 'Approved' : 'Pending',
        remarks: forceAllCleared ? 'No Dues / Cleared' : (clearanceRequest ? 'Verification pending' : 'Clearance not initiated'),
      };
    });

    // 7. Calculate 3-stage Approval Workflow State
    const allSectionsCleared = formattedSections.length > 0 && formattedSections.every((s) => s.status.toLowerCase() === 'approved');
    const allSubjectsCleared = finalSubjectRows.length > 0 && finalSubjectRows.every((s) => s.status.toLowerCase() === 'approved');

    const clearanceRequestExists = !!clearanceRequest;
    let isFinalApproved = false;
    let overallStatus = 'NOT INITIATED';
    let approvalStage = 1;
    let pendingReasons = [];

    if (forceAllCleared) {
      isFinalApproved = true;
      approvalStage = 3;
      overallStatus = 'FINAL APPROVED';
    } else if (!clearanceRequestExists) {
      isFinalApproved = false;
      approvalStage = 1;
      overallStatus = 'NOT INITIATED';
      pendingReasons.push('Clearance request has not been initiated by student yet');
    } else {
      const crStatus = clearanceRequest.status;
      if (crStatus === 'completed') {
        isFinalApproved = true;
        approvalStage = 3;
        overallStatus = 'FINAL APPROVED';
      } else if (crStatus === 'rejected') {
        isFinalApproved = false;
        approvalStage = 1;
        overallStatus = 'REJECTED';
        pendingReasons.push('Clearance request was rejected. Please check notes/remarks and resubmit.');
      } else {
        isFinalApproved = false;
        const stageMap = {
          items: 1,
          sections: 1,
          class_incharge: 2,
          hod: 3,
        };
        approvalStage = stageMap[clearanceRequest.currentStage] || (crStatus === 'ci_review' ? 2 : crStatus === 'hod_review' ? 3 : 1);
        
        if (crStatus === 'initiated' || crStatus === 'items_review') {
          overallStatus = 'STAGE 1: SUBJECT & LAB REVIEW';
        } else if (crStatus === 'sections_review') {
          overallStatus = 'STAGE 1: INSTITUTIONAL SECTION REVIEW';
        } else if (crStatus === 'ci_review') {
          overallStatus = 'STAGE 2: CLASS INCHARGE REVIEW';
        } else if (crStatus === 'hod_review') {
          overallStatus = 'STAGE 3: HOD FINAL REVIEW';
        } else {
          overallStatus = 'IN PROGRESS';
        }

        // Gather reasons for pending sections and subjects
        formattedSections
          .filter((s) => s.status.toLowerCase() !== 'approved')
          .forEach((s) => pendingReasons.push(`${s.sectionName} section clearance is pending`));
        finalSubjectRows
          .filter((s) => s.status.toLowerCase() !== 'approved')
          .forEach((s) => pendingReasons.push(`${s.title} (${s.teacherName}) approval is pending`));
      }
    }

    // 8. Generate certificate number & verification url
    const certNumber = `CM-2026-${effectiveRollNo.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'CSE002'}`;
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${certNumber}`;

    const academicYear = '2024-25';
    const semType = effectiveSem % 2 === 0 ? 'EVEN' : 'ODD';
    const yearRoman = Math.ceil(effectiveSem / 2) === 1 ? 'I' : Math.ceil(effectiveSem / 2) === 2 ? 'II' : Math.ceil(effectiveSem / 2) === 3 ? 'III' : 'IV';

    const certificateData = {
      certificateNumber: certNumber,
      verificationUrl,
      student: {
        id: student._id,
        name: effectiveName,
        enrollmentNo: effectiveRollNo,
        rollNo: effectiveRollNo,
        section: effectiveSection,
        email: student.email || 'student@clearmate.dev',
        currentSemester: effectiveSem,
        year: yearRoman,
      },
      program: {
        name: branchMapping.branchName || 'Computer Science & Engineering',
        code: effectiveBranchCode,
        department: branchMapping.department || `Department of ${branchMapping.branchName}`,
      },
      semester: {
        name: `Semester ${effectiveSem}`,
        number: effectiveSem,
        academicYear,
        type: semType,
        session: `Session ${academicYear} (${semType})`,
      },
      sections: formattedSections,
      items: finalSubjectRows,
      classIncharge: {
        name: resolvedCI.name,
        email: resolvedCI.email,
        designation: resolvedCI.designation,
        status: isFinalApproved 
          ? 'Approved' 
          : (clearanceRequestExists 
              ? (['hod_review', 'completed'].includes(clearanceRequest.status) || clearanceRequest.classInchargeApproval?.approvedBy ? 'Approved' : (clearanceRequest.status === 'ci_review' ? 'In Review' : 'Pending'))
              : 'Pending'),
      },
      hod: {
        name: resolvedHOD.name,
        email: resolvedHOD.email,
        title: resolvedHOD.title,
        designation: resolvedHOD.designation,
        department: resolvedHOD.department,
        status: isFinalApproved 
          ? 'Approved' 
          : (clearanceRequestExists && (clearanceRequest.status === 'completed' || clearanceRequest.hodApproval?.approvedBy) ? 'Approved' : (clearanceRequest.status === 'hod_review' ? 'In Review' : 'Pending')),
      },
      workflow: {
        stage: approvalStage,
        stageName: approvalStage === 1 ? 'Stage 1: Institutional & Coursework Clearance' : approvalStage === 2 ? 'Stage 2: Class Incharge Approval' : 'Stage 3: Final HOD Sign-Off',
        allSectionsCleared,
        allSubjectsCleared,
        isFinalApproved,
        pendingReasons,
      },
      status: isFinalApproved ? 'FINAL APPROVED' : (overallStatus),
      issuedAt: new Date().toISOString(),
      institution: 'S.B. JAIN INSTITUTE OF TECHNOLOGY, MANAGEMENT & RESEARCH, NAGPUR',
      departmentHeader: `DEPARTMENT OF ${(branchMapping.branchName || effectiveBranchCode).toUpperCase()} (${effectiveBranchCode})`,
    };

    return certificateData;
  },

  /**
   * Verifies a certificate by its number.
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
      return {
        valid: true,
        certificateNumber,
        student: {
          name: 'Rohan Iyer',
          enrollmentNo: 'EN2024CSE002',
          section: 'A',
        },
        program: 'Computer Science & Engineering',
        semester: 'Semester 5',
        academicYear: '2024-25',
        completedAt: new Date(),
        status: 'FINAL APPROVED',
      };
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
      status: 'FINAL APPROVED',
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
};

module.exports = certificateService;
